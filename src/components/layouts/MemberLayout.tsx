import { Outlet } from 'react-router-dom';
import { MemberSidebar } from './MemberSidebar';

export function MemberLayout() {
  return (
    <div className="min-h-screen bg-background">
      <MemberSidebar />
      <main className="ml-64 p-6 transition-all duration-300">
        <Outlet />
      </main>
    </div>
  );
}
