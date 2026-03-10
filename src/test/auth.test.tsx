import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

// vi.mock must use inline factory (no external references due to hoisting)
vi.mock('@/integrations/supabase/client', () => {
  const mockAuth = {
    getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
    getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
    signInWithPassword: vi.fn().mockResolvedValue({ data: {}, error: null }),
    signUp: vi.fn().mockResolvedValue({ data: { user: { id: 'test-user-id' } }, error: null }),
    signOut: vi.fn().mockResolvedValue({ error: null }),
    onAuthStateChange: vi.fn().mockReturnValue({
      data: { subscription: { unsubscribe: vi.fn() } },
    }),
    verifyOtp: vi.fn().mockResolvedValue({ data: {}, error: null }),
  };

  const chainable: any = {};
  ['select', 'insert', 'update', 'delete', 'upsert', 'eq', 'neq', 'in', 'not', 'order', 'limit', 'range', 'filter'].forEach(m => {
    chainable[m] = vi.fn().mockReturnValue(chainable);
  });
  chainable.single = vi.fn().mockResolvedValue({ data: null, error: null });
  chainable.maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });

  return {
    supabase: {
      from: vi.fn().mockReturnValue(chainable),
      rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
      auth: mockAuth,
      functions: { invoke: vi.fn().mockResolvedValue({ data: {}, error: null }) },
    },
  };
});

// Import AFTER mock setup
import { supabase } from '@/integrations/supabase/client';
import { AuthProvider, useAuth } from '@/hooks/useAuth';
import { ProtectedRoute } from '@/components/ProtectedRoute';

const mockSupabase = supabase as any;

// --- Test helper component ---
function AuthTestConsumer() {
  const auth = useAuth();
  return (
    <div>
      <span data-testid="loading">{String(auth.isLoading)}</span>
      <span data-testid="user">{auth.user?.id || 'none'}</span>
      <span data-testid="role">{auth.role || 'none'}</span>
      <span data-testid="isMentor">{String(auth.isMentor)}</span>
      <span data-testid="isMentorado">{String(auth.isMentorado)}</span>
      <button onClick={() => auth.signIn('test@test.com', '123456')}>Login</button>
      <button onClick={() => auth.signUp('new@test.com', '123456', 'Test User')}>SignUp</button>
      <button onClick={() => auth.signOut()}>Logout</button>
    </div>
  );
}

function renderWithAuth(ui: React.ReactElement) {
  return render(
    <MemoryRouter>
      <AuthProvider>{ui}</AuthProvider>
    </MemoryRouter>
  );
}

describe('Auth System', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSupabase.auth.getSession.mockResolvedValue({
      data: { session: null },
      error: null,
    });
    mockSupabase.auth.onAuthStateChange.mockReturnValue({
      data: { subscription: { unsubscribe: vi.fn() } },
    });
  });

  describe('useAuth hook', () => {
    it('returns fallback when used outside AuthProvider', () => {
      const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const spy2 = vi.spyOn(console, 'error').mockImplementation(() => {});
      render(<AuthTestConsumer />);
      // useAuth now returns a fallback instead of throwing
      expect(screen.getByTestId('loading').textContent).toBe('true');
      spy.mockRestore();
      spy2.mockRestore();
    });

    it('starts with no user after loading', async () => {
      renderWithAuth(<AuthTestConsumer />);

      await waitFor(() => {
        expect(screen.getByTestId('user').textContent).toBe('none');
        expect(screen.getByTestId('role').textContent).toBe('none');
      });
    });

    it('calls signInWithPassword on signIn', async () => {
      renderWithAuth(<AuthTestConsumer />);
      await waitFor(() => expect(screen.getByTestId('loading').textContent).toBe('false'));

      await userEvent.click(screen.getByText('Login'));

      expect(mockSupabase.auth.signInWithPassword).toHaveBeenCalledWith({
        email: 'test@test.com',
        password: '123456',
      });
    });

    it('calls signUp with metadata', async () => {
      renderWithAuth(<AuthTestConsumer />);
      await waitFor(() => expect(screen.getByTestId('loading').textContent).toBe('false'));

      await userEvent.click(screen.getByText('SignUp'));

      expect(mockSupabase.auth.signUp).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'new@test.com',
          password: '123456',
          options: expect.objectContaining({
            data: { full_name: 'Test User' },
          }),
        })
      );
    });

    it('calls signOut and clears state', async () => {
      renderWithAuth(<AuthTestConsumer />);
      await waitFor(() => expect(screen.getByTestId('loading').textContent).toBe('false'));

      await userEvent.click(screen.getByText('Logout'));

      expect(mockSupabase.auth.signOut).toHaveBeenCalled();
    });

    it('correctly identifies mentor role via onAuthStateChange', async () => {
      const mockUser = { id: 'mentor-id', email: 'mentor@test.com' };
      const mockSession = { user: mockUser, access_token: 'token' };

      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: mockSession },
        error: null,
      });
      mockSupabase.auth.onAuthStateChange.mockImplementation((cb: any) => {
        setTimeout(() => cb('SIGNED_IN', mockSession), 10);
        return { data: { subscription: { unsubscribe: vi.fn() } } };
      });

      const chainable: any = {};
      ['select', 'eq', 'neq', 'in', 'not', 'order', 'limit', 'range', 'filter'].forEach(m => {
        chainable[m] = vi.fn().mockReturnValue(chainable);
      });
      chainable.single = vi.fn().mockResolvedValue({
        data: { user_id: 'mentor-id', full_name: 'Mentor', email: 'mentor@test.com' },
        error: null,
      });
      mockSupabase.from.mockReturnValue(chainable);
      mockSupabase.rpc.mockResolvedValue({ data: 'mentor', error: null });

      renderWithAuth(<AuthTestConsumer />);

      await waitFor(() => {
        expect(screen.getByTestId('role').textContent).toBe('mentor');
        expect(screen.getByTestId('isMentor').textContent).toBe('true');
        expect(screen.getByTestId('isMentorado').textContent).toBe('false');
      });
    });

    it('admin_master has both mentor and mentorado access', async () => {
      const mockUser = { id: 'admin-id', email: 'admin@test.com' };
      const mockSession = { user: mockUser, access_token: 'token' };

      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: mockSession },
        error: null,
      });
      mockSupabase.auth.onAuthStateChange.mockImplementation((cb: any) => {
        setTimeout(() => cb('SIGNED_IN', mockSession), 10);
        return { data: { subscription: { unsubscribe: vi.fn() } } };
      });

      const chainable: any = {};
      ['select', 'eq', 'neq', 'in', 'not', 'order', 'limit', 'range', 'filter'].forEach(m => {
        chainable[m] = vi.fn().mockReturnValue(chainable);
      });
      chainable.single = vi.fn().mockResolvedValue({
        data: { user_id: 'admin-id', full_name: 'Admin', email: 'admin@test.com' },
        error: null,
      });
      mockSupabase.from.mockReturnValue(chainable);
      mockSupabase.rpc.mockResolvedValue({ data: 'admin_master', error: null });

      renderWithAuth(<AuthTestConsumer />);

      await waitFor(() => {
        expect(screen.getByTestId('role').textContent).toBe('admin_master');
        expect(screen.getByTestId('isMentor').textContent).toBe('true');
        expect(screen.getByTestId('isMentorado').textContent).toBe('true');
      });
    });
  });

  describe('ProtectedRoute', () => {
    it('shows loading state initially', () => {
      mockSupabase.auth.getSession.mockReturnValue(new Promise(() => {}));
      
      renderWithAuth(
        <ProtectedRoute>
          <div>Protected Content</div>
        </ProtectedRoute>
      );

      expect(screen.getByText('Carregando...')).toBeInTheDocument();
    });

    it('redirects when no user (protected content not shown)', async () => {
      renderWithAuth(
        <ProtectedRoute>
          <div>Protected Content</div>
        </ProtectedRoute>
      );

      await waitFor(() => {
        expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
      });
    });
  });
});
