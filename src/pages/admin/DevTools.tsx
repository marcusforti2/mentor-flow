import { DevToolsPanel } from '@/components/dev/DevToolsPanel';
import { useAuth } from '@/hooks/useAuth';
import { Navigate } from 'react-router-dom';

export default function DevTools() {
  const { isAdminMaster, isLoading } = useAuth();

  // Only admin_master can access
  if (!isLoading && !isAdminMaster) {
    return <Navigate to="/admin" replace />;
  }

  return <DevToolsPanel />;
}
