import { useState } from 'react';
import Sidebar from '../layout/Sidebar';
import TopNavbar from '../layout/TopNavbar';
import { Menu, X } from 'lucide-react';

export default function DashboardLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  return (
    <div
      style={{
        display: 'flex',
        height: '100vh',
        background: '#f8f9fa',
        overflow: 'hidden',
      }}
    >
      {/* Sidebar */}
      <div
        style={{
          width: sidebarOpen ? '280px' : '0',
          background: '#0a2a43',
          transition: 'width 0.3s ease',
          overflow: 'hidden',
          borderRight: '1px solid rgba(10, 42, 67, 0.1)',
          display: 'flex',
          flexDirection: 'column',
          gap: '20px',
          padding: '24px 0',
          overflowY: 'auto',
        }}
      >
        <Sidebar />
      </div>

      {/* Main Content */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Top Navbar */}
        <TopNavbar
          sidebarOpen={sidebarOpen}
          onToggleSidebar={toggleSidebar}
        />

        {/* Content Area */}
        <main
          style={{
            flex: 1,
            overflow: 'auto',
            padding: '24px 36px',
            background: '#f8f9fa',
          }}
        >
          {children}
        </main>
      </div>
    </div>
  );
}
