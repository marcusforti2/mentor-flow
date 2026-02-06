import { vi } from 'vitest';

// Chainable query builder mock
export function createQueryBuilder(data: any = [], error: any = null) {
  const builder: any = {};
  const methods = [
    'select', 'insert', 'update', 'delete', 'upsert',
    'eq', 'neq', 'in', 'not', 'is', 'gt', 'lt', 'gte', 'lte',
    'like', 'ilike', 'contains', 'containedBy',
    'order', 'limit', 'range', 'filter',
    'textSearch', 'match', 'or', 'and',
  ];

  for (const method of methods) {
    builder[method] = vi.fn().mockReturnValue(builder);
  }

  builder.single = vi.fn().mockResolvedValue({ data: Array.isArray(data) ? data[0] : data, error });
  builder.maybeSingle = vi.fn().mockResolvedValue({ data: Array.isArray(data) ? data[0] : data, error });
  
  // Make the builder thenable (for awaiting directly)
  builder.then = (resolve: any) => resolve({ data, error });

  return builder;
}

// Create a mock Supabase client
export function createMockSupabase(overrides: Record<string, any> = {}) {
  const mockFrom = vi.fn().mockReturnValue(createQueryBuilder());
  const mockRpc = vi.fn().mockResolvedValue({ data: null, error: null });
  const mockFunctionsInvoke = vi.fn().mockResolvedValue({ data: {}, error: null });

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

  return {
    from: mockFrom,
    rpc: mockRpc,
    auth: mockAuth,
    functions: { invoke: mockFunctionsInvoke },
    ...overrides,
  };
}

// Helper to mock the supabase import
export function mockSupabaseModule(mockClient?: ReturnType<typeof createMockSupabase>) {
  const client = mockClient || createMockSupabase();
  vi.mock('@/integrations/supabase/client', () => ({
    supabase: client,
  }));
  return client;
}
