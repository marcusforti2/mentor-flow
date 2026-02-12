 import { DevToolsPanel } from '@/components/dev/DevToolsPanel';
 import { useTenant } from '@/contexts/TenantContext';
 import { Navigate } from 'react-router-dom';

export default function DevTools() {
   const { realMembership, isLoading } = useTenant();

   // Only admin or master_admin can access
   if (!isLoading && realMembership?.role !== 'admin' && realMembership?.role !== 'master_admin') {
    return <Navigate to="/mentor" replace />;
  }

  return <DevToolsPanel />;
}
