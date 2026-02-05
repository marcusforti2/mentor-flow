 import { DevToolsPanel } from '@/components/dev/DevToolsPanel';
 import { useTenant } from '@/contexts/TenantContext';
 import { Navigate } from 'react-router-dom';

export default function DevTools() {
   const { realMembership, isLoading } = useTenant();

   // Only admin can access
   if (!isLoading && realMembership?.role !== 'admin') {
    return <Navigate to="/admin" replace />;
  }

  return <DevToolsPanel />;
}
