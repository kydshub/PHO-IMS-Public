

import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useNotifications } from '../hooks/useNotifications';
import { Button } from './ui/Button';
import NotificationDropdown from './NotificationDropdown';
import { LogoutConfirmationModal } from './ui/LogoutConfirmationModal';
import { useDatabase } from '../hooks/useDatabase';

const UserIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
);

const LogOutIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/></svg>
);

const MenuIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="4" x2="20" y1="12" y2="12"/><line x1="4" x2="20" y1="6" y2="6"/><line x1="4" x2="20" y1="18" y2="18"/></svg>
);

const BellIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>
);


interface HeaderProps {
    setIsSidebarOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

const Header: React.FC<HeaderProps> = ({ setIsSidebarOpen }) => {
  const { user, logout } = useAuth();
  const { unreadCount } = useNotifications();
  const { data } = useDatabase();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  
  const facilityName = user?.facilityId ? data.facilities.find(f => f.id === user.facilityId)?.name : '';


  return (
    <>
    <header className="flex items-center justify-between px-4 sm:px-6 py-3 bg-white border-b-2 border-secondary-200">
      <div className="flex items-center">
        <button onClick={() => setIsSidebarOpen(true)} className="text-secondary-500 hover:text-secondary-800 focus:outline-none md:hidden mr-4" aria-label="Open sidebar">
            <MenuIcon />
        </button>
        <h1 className="text-xl font-semibold text-secondary-800">Welcome{user ? `, ${user.name}` : ''}</h1>
      </div>
      <div className="flex items-center">
        {user && (
          <>
            <div className="relative" ref={dropdownRef}>
              <Button variant="ghost" size="sm" onClick={() => setIsDropdownOpen(prev => !prev)} aria-label="Notifications" className="mr-2">
                <BellIcon />
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 flex h-4 w-4">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-xs text-white">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  </span>
                )}
              </Button>
              {isDropdownOpen && <NotificationDropdown onClose={() => setIsDropdownOpen(false)} />}
            </div>
            <div className="flex items-center mr-2 sm:mr-4">
              <UserIcon/>
              <div className="ml-2 text-sm hidden sm:block">
                  <p className="font-semibold">{user.name}</p>
                  <p className="text-secondary-600">{user.role} {facilityName && `| ${facilityName}`}</p>
              </div>
            </div>
          </>
        )}
        <Button variant="ghost" size="sm" onClick={() => setIsLogoutModalOpen(true)} leftIcon={<LogOutIcon />}>
          <span className="hidden sm:inline">Logout</span>
        </Button>
      </div>
    </header>
    <LogoutConfirmationModal
        isOpen={isLogoutModalOpen}
        onClose={() => setIsLogoutModalOpen(false)}
        onConfirm={logout}
    />
    </>
  );
};

export default Header;