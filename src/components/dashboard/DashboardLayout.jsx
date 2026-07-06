import { useState } from 'react';
import Sidebar from '../layout/Sidebar';
import TopNavbar from '../layout/TopNavbar';

export default function DashboardLayout({ children }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false); // Desktop collapsed state
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false); // Mobile overlay open state

  const toggleSidebar = () => {
    // On desktop, toggle collapsed mode
    // On mobile, we rely on the TopNavbar button to open the overlay
    if (window.innerWidth >= 1024) {
      setSidebarCollapsed(!sidebarCollapsed);
    } else {
      setMobileSidebarOpen(!mobileSidebarOpen);
    }
  };

  const closeMobileSidebar = () => {
    if (mobileSidebarOpen) setMobileSidebarOpen(false);
  };

  return (
    <div className="flex h-screen overflow-hidden bg-white dark:bg-slate-950">
      {/* Sidebar - handles both desktop collapsed and mobile overlay */}
      <Sidebar
        open={mobileSidebarOpen}
        onClose={closeMobileSidebar}
        collapsed={sidebarCollapsed}
      />

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <TopNavbar
          sidebarOpen={!sidebarCollapsed} // For desktop, this indicates expanded state; TopNavbar may use it for styling
          onToggleSidebar={toggleSidebar}
        />
        <main className="flex-1 overflow-y-auto p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}