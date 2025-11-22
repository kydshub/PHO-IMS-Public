
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import { useAuth } from '../hooks/useAuth';
import { Button } from './ui/Button';
import ChatBubble from './chat/ChatBubble';
import { useSettings } from '../hooks/useSettings';

interface LayoutProps {
  children: React.ReactNode;
}

const ImpersonationWarningIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.46 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>;

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => localStorage.getItem('sidebarCollapsed') === 'true');
  const { user, originalUser, stopImpersonating } = useAuth();
  const { settings } = useSettings();
  const navigate = useNavigate();

  useEffect(() => {
    localStorage.setItem('sidebarCollapsed', String(isSidebarCollapsed));
  }, [isSidebarCollapsed]);

  const handleStopImpersonating = () => {
    stopImpersonating(navigate);
  };

  return (
    <div className="relative flex min-h-screen bg-secondary-100 text-secondary-800 overflow-hidden">
      <Sidebar 
        isSidebarOpen={isSidebarOpen} 
        setIsSidebarOpen={setIsSidebarOpen}
        isCollapsed={isSidebarCollapsed}
        setIsCollapsed={setIsSidebarCollapsed} 
      />
      <div className="flex-1 flex flex-col overflow-hidden">
        {originalUser && user && (
          <div className="bg-yellow-400 text-yellow-900 px-4 py-2 text-sm font-semibold flex justify-center items-center relative gap-4 shadow-lg z-10">
            <ImpersonationWarningIcon />
            <span>
              Viewing as <strong className="underline">{user.name}</strong>.
            </span>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleStopImpersonating}
              className="bg-yellow-50 hover:bg-yellow-100 text-yellow-900 focus:ring-yellow-500"
            >
              Return to Admin Account
            </Button>
          </div>
        )}
        <Header setIsSidebarOpen={setIsSidebarOpen} />
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-secondary-100">
          <div className="container mx-auto px-4 sm:px-6 py-8">
            {children}
          </div>
        </main>
      </div>
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-20 md:hidden" 
          onClick={() => setIsSidebarOpen(false)}
          aria-hidden="true"
        ></div>
      )}
      {settings.enableChat && <ChatBubble />}
    </div>
  );
};

export default Layout;
