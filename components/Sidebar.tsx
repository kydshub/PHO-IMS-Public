

import React, { useState, useEffect, useMemo } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Role } from '../types';
import { useSettings } from '../hooks/useSettings';
import { useMediaQuery } from '../hooks/useMediaQuery';

// Define the structure for navigation items, which can be a link or a collapsible group
export type NavSubItem = {
    path: string;
    label: string;
    roles: Role[];
};

export type NavItem = {
    type: 'link';
    path: string;
    label: string;
    roles: Role[];
};

export type NavGroup = {
    type: 'group';
    label: string;
    roles: Role[];
    items: NavSubItem[];
};

export type NavigationConfigItem = NavItem | NavGroup;

// Centralized navigation configuration
export const navigationConfig: NavigationConfigItem[] = [
  { type: 'link', path: '/analytics', label: 'Analytics & Reports', roles: [Role.SystemAdministrator, Role.Admin, Role.Encoder, Role.Auditor, Role.User] },
  { type: 'link', path: '/bulletin-board', label: 'Bulletin Board', roles: [Role.SystemAdministrator, Role.Admin, Role.Encoder, Role.Auditor, Role.User] },
  {
    type: 'group',
    label: 'Inventory',
    roles: [Role.SystemAdministrator, Role.Admin, Role.Encoder, Role.Auditor, Role.User],
    items: [
      { path: '/inventory/ppe', label: 'PPE', roles: [Role.SystemAdministrator, Role.Admin, Role.Encoder, Role.Auditor, Role.User] },
      { path: '/inventory/commodities', label: 'Commodities', roles: [Role.SystemAdministrator, Role.Admin, Role.Encoder, Role.Auditor, Role.User] },
      { path: '/physical-counts', label: 'Physical Counts', roles: [Role.SystemAdministrator, Role.Admin, Role.Encoder] },
    ].sort((a,b) => a.label.localeCompare(b.label))
  },
  {
    type: 'group',
    label: 'Regular Transactions',
    roles: [Role.SystemAdministrator, Role.Admin, Role.Encoder],
    items: [
      { path: '/dispense', label: 'Dispense', roles: [Role.SystemAdministrator, Role.Admin, Role.Encoder] },
      { path: '/returns-internal', label: 'Patient & Ward Returns', roles: [Role.SystemAdministrator, Role.Admin, Role.Encoder] },
      { path: '/purchase-orders', label: 'Purchase Orders', roles: [Role.SystemAdministrator, Role.Admin, Role.Encoder] },
      { path: '/receiving', label: 'Receive', roles: [Role.SystemAdministrator, Role.Admin, Role.Encoder] },
      { path: '/release-order', label: 'Release Order', roles: [Role.SystemAdministrator, Role.Admin, Role.Encoder] },
      { path: '/returns', label: 'Returns to Supplier', roles: [Role.SystemAdministrator, Role.Admin, Role.Encoder] },
      { path: '/ris', label: 'RIS', roles: [Role.SystemAdministrator, Role.Admin, Role.Encoder] }, // Requisition and Issuance Slip
      { path: '/transfers', label: 'Transfers', roles: [Role.SystemAdministrator, Role.Admin, Role.Encoder] },
      { path: '/write-offs', label: 'Write-Offs', roles: [Role.SystemAdministrator, Role.Admin, Role.Encoder] },
    ].sort((a,b) => a.label.localeCompare(b.label))
  },
   {
    type: 'group',
    label: 'Consignment',
    roles: [Role.SystemAdministrator, Role.Admin, Role.Encoder, Role.Auditor, Role.User],
    items: [
      { path: '/consignment/inventory', label: 'Consignment Stock', roles: [Role.SystemAdministrator, Role.Admin, Role.Encoder, Role.Auditor, Role.User] },
      { path: '/consignment/receiving', label: 'Consignment Receiving', roles: [Role.SystemAdministrator, Role.Admin, Role.Encoder] },
      { path: '/consignment/transfers', label: 'Consignment Transfers', roles: [Role.SystemAdministrator, Role.Admin, Role.Encoder] },
      { path: '/consignment/returns', label: 'Consignment Returns', roles: [Role.SystemAdministrator, Role.Admin, Role.Encoder] },
      { path: '/consignment/write-offs', label: 'Consignment Write-Offs', roles: [Role.SystemAdministrator, Role.Admin, Role.Encoder] },
      { path: '/consignment/reports', label: 'Consumption Reports', roles: [Role.SystemAdministrator, Role.Admin, Role.Auditor] },
    ]
  },
  {
    type: 'group',
    label: 'Management',
    roles: [Role.SystemAdministrator, Role.Admin, Role.Encoder],
    items: [
      { path: '/ppe-management', label: 'PPE Management', roles: [Role.SystemAdministrator, Role.Admin, Role.Encoder] },
      { path: '/categories', label: 'Categories', roles: [Role.SystemAdministrator, Role.Admin] },
      { path: '/items', label: 'Commodity Management', roles: [Role.SystemAdministrator, Role.Admin, Role.Encoder] },
      { path: '/facilities', label: 'Facilities', roles: [Role.SystemAdministrator, Role.Admin] },
      { path: '/fund-sources', label: 'Fund Sources', roles: [Role.SystemAdministrator, Role.Admin] },
      { path: '/programs', label: 'Programs', roles: [Role.SystemAdministrator, Role.Admin] },
      { path: '/service-providers', label: 'Service Providers', roles: [Role.SystemAdministrator, Role.Admin] },
      { path: '/suppliers', label: 'Suppliers', roles: [Role.SystemAdministrator, Role.Admin] },
      { path: '/settings', label: 'Settings', roles: [Role.SystemAdministrator] },
      { path: '/users', label: 'User Management', roles: [Role.SystemAdministrator, Role.Admin] },
    ].sort((a,b) => a.label.localeCompare(b.label))
  },
  { type: 'link', path: '/audit-trail', label: 'Audit Trail', roles: [Role.SystemAdministrator, Role.Auditor] },
];

const sanitizePathForKey = (path: string) => path.replace(/\//g, '_');


const SidebarIcon = ({ path }: { path: string }) => {
    const icons: { [key: string]: React.ReactNode } = {
        '/analytics': <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/></svg>,
        '/bulletin-board': <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>,
        'Inventory': <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/><path d="M12 11h4"/><path d="M12 16h4"/><path d="M8 11h.01"/><path d="M8 16h.01"/></svg>,
        'Regular Transactions': <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12H3"/><path d="m18 15 3-3-3-3"/><path d="M6 9 3 12l3 3"/></svg>,
        'Consignment': <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><path d="M16 8h-2a2 2 0 1 0 0 4h4v1a2 2 0 0 1-2 2h-4v-3"/><path d="m18 13 2-2-2-2"/></svg>,
        'Management': <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="4" y1="21" x2="4" y2="14"></line><line x1="4" y1="10" x2="4" y2="3"></line><line x1="12" y1="21" x2="12" y2="12"></line><line x1="12" y1="8" x2="12" y2="3"></line><line x1="20" y1="21" x2="20" y2="16"></line><line x1="20" y1="12" x2="20" y2="3"></line><line x1="1" y1="14" x2="7" y2="14"></line><line x1="9" y1="8" x2="15" y2="8"></line><line x1="17" y1="16" x2="23" y2="16"></line></svg>,
        '/audit-trail': <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
    };
    return icons[path] || null;
}

const ChevronDownIcon = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><polyline points="6 9 12 15 18 9"></polyline></svg>
);

const CollapseToggleIcon = ({ isCollapsed }: { isCollapsed: boolean }) => (
    isCollapsed ? (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect width="18" height="18" x="3" y="3" rx="2"/>
            <path d="M9 3v18"/>
            <path d="m14 9 3 3-3 3"/>
        </svg>
    ) : (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect width="18" height="18" x="3" y="3" rx="2"/>
            <path d="M9 3v18"/>
            <path d="m16 15-3-3 3-3"/>
        </svg>
    )
);

interface SidebarProps {
    isSidebarOpen: boolean;
    setIsSidebarOpen: React.Dispatch<React.SetStateAction<boolean>>;
    isCollapsed: boolean;
    setIsCollapsed: React.Dispatch<React.SetStateAction<boolean>>;
}

const Sidebar: React.FC<SidebarProps> = ({ isSidebarOpen, setIsSidebarOpen, isCollapsed, setIsCollapsed }) => {
  const { user } = useAuth();
  const { settings } = useSettings();
  const location = useLocation();
  const isDesktop = useMediaQuery('(min-width: 768px)');

  // On mobile, the sidebar is never visually collapsed, even if the state is set.
  const isVisuallyCollapsed = isDesktop && isCollapsed;
  
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});

  useEffect(() => {
    // If the sidebar is collapsed on desktop, close all accordion sections.
    if (isDesktop && isCollapsed) {
        setOpenSections({});
    }
  }, [isCollapsed, isDesktop]);

  const filteredNavigation = useMemo(() => {
    if (!user || !settings) return [];
    const disabledItems = settings.disabledNavItems || {};

    return navigationConfig.reduce<NavigationConfigItem[]>((acc, item) => {
      if (item.roles.includes(user.role)) {
        if (item.type === 'group') {
          const accessibleSubItems = item.items.filter(subItem => 
            subItem.roles.includes(user.role) && !disabledItems[sanitizePathForKey(subItem.path)]
          );
          if (accessibleSubItems.length > 0) {
            acc.push({ ...item, items: accessibleSubItems });
          }
        } else { // type is 'link'
          if (!disabledItems[sanitizePathForKey(item.path)]) {
            acc.push(item);
          }
        }
      }
      return acc;
    }, []);
  }, [user, settings]);

  const activeLinkClass = "bg-primary-700 text-white";
  const defaultLinkClass = "text-secondary-100 hover:bg-primary-700 hover:text-white";
  const baseLinkClass = "flex items-center px-4 py-2 mt-2 rounded-lg transition-colors duration-200";


  const handleLinkClick = () => {
    // Close sidebar on mobile when a link is clicked
    if (!isDesktop) {
        setIsSidebarOpen(false);
    }
  }

  const toggleSection = (label: string) => {
    setOpenSections(prev => (prev[label] ? {} : { [label]: true }));
  };

  const handleGroupClick = (label: string) => {
    if (isDesktop && isCollapsed) {
        setIsCollapsed(false); // Expand the sidebar
        setOpenSections({ [label]: true }); 
    } else {
        // Normal toggle behavior if expanded or on mobile
        toggleSection(label);
    }
  };
  
  // Effect to open the group that contains the currently active link on page load/navigation,
  // and close any other open groups.
  useEffect(() => {
    let activeGroupLabel: string | null = null;
    
    navigationConfig.forEach(item => {
        if (item.type === 'group' && item.items.some(subItem => location.pathname.startsWith(subItem.path))) {
            activeGroupLabel = item.label;
        }
    });

    if (activeGroupLabel) {
        // If the active link is in a group, ensure that group is the only one open.
        setOpenSections({ [activeGroupLabel]: true });
    } else {
        // If the active link is a top-level link, close all groups.
        const isTopLevelLink = navigationConfig.some(item => 
            item.type === 'link' && location.pathname.startsWith(item.path)
        );
        if (isTopLevelLink) {
            setOpenSections({});
        }
    }
  }, [location.pathname]);

  return (
    <div className={`fixed inset-y-0 left-0 z-30 bg-primary-900 transform transition-all duration-300 ease-in-out md:relative md:translate-x-0 md:flex md:flex-col ${isSidebarOpen ? 'translate-x-0 w-64' : '-translate-x-full'} ${isCollapsed ? 'md:w-20' : 'md:w-64'}`}>
      <div className={`flex items-center h-16 bg-primary-950 px-4 shrink-0 ${isVisuallyCollapsed ? 'justify-center' : 'justify-between'}`}>
          {!isVisuallyCollapsed && (
              <h1 className="text-xl font-bold text-white whitespace-nowrap">
                  {settings.appName}
              </h1>
          )}
          <button
              onClick={() => setIsCollapsed(prev => !prev)}
              className={`p-2 rounded-lg transition-colors duration-200 text-secondary-100 hover:bg-primary-700 hover:text-white hidden md:block`}
              title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
          >
              <CollapseToggleIcon isCollapsed={isCollapsed} />
          </button>
      </div>
      <div className="flex flex-col flex-1 overflow-hidden">
        <nav className="flex-1 px-2 py-4 overflow-y-auto">
          {filteredNavigation.map((item) => {
            if (item.type === 'link') {
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.path !== '/analytics'}
                  onClick={handleLinkClick}
                  title={isVisuallyCollapsed ? item.label : undefined}
                  className={({ isActive }) => 
                    `${baseLinkClass} ${isVisuallyCollapsed ? 'justify-center' : ''} ${isActive ? activeLinkClass : defaultLinkClass}`
                  }
                >
                  <SidebarIcon path={item.path} />
                  {!isVisuallyCollapsed && <span className="ml-3 whitespace-nowrap">{item.label}</span>}
                </NavLink>
              );
            }

            if (item.type === 'group') {
              const isOpen = openSections[item.label] || false;
              const isGroupActive = !isOpen && item.items.some(subItem => location.pathname.startsWith(subItem.path));
              return (
                <div key={item.label} className="mt-2">
                    <button
                        onClick={() => handleGroupClick(item.label)}
                        title={isVisuallyCollapsed ? item.label : undefined}
                        className={`flex items-center w-full px-4 py-2 rounded-lg transition-colors duration-200 ${defaultLinkClass} ${isGroupActive ? activeLinkClass : ''} ${isVisuallyCollapsed ? 'justify-center' : 'justify-between'}`}
                    >
                        <div className="flex items-center">
                            <SidebarIcon path={item.label} />
                            {!isVisuallyCollapsed && <span className="ml-3 whitespace-nowrap">{item.label}</span>}
                        </div>
                        {!isVisuallyCollapsed && <ChevronDownIcon className={`transform transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />}
                    </button>
                    {isOpen && !isVisuallyCollapsed && (
                        <div className="pt-1 pb-2 pl-6">
                            {item.items.map(subItem => {
                                return (
                                    <NavLink
                                        key={subItem.path}
                                        to={subItem.path}
                                        end
                                        onClick={handleLinkClick}
                                        className={({ isActive }) => 
                                            `${baseLinkClass} text-sm ${isActive ? activeLinkClass : defaultLinkClass}`
                                        }
                                    >
                                        <span className="ml-3 whitespace-nowrap">{subItem.label}</span>
                                    </NavLink>
                                )
                            })}
                        </div>
                    )}
                </div>
              );
            }
            return null;
          })}
        </nav>
        
        <div className="px-4 py-3 text-center h-10 flex items-center justify-center">
            {settings.sidebarBadgeText && !isVisuallyCollapsed && (
                <span className="inline-flex items-center px-2 py-1 text-xs font-bold leading-none text-yellow-800 bg-yellow-200 rounded-full">
                    {settings.sidebarBadgeText}
                </span>
            )}
        </div>
      </div>
    </div>
  );
};

export default Sidebar;