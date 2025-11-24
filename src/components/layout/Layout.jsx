/**
 * @file Layout.jsx
 * @description Main layout component with navigation
 */

import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import useUIStore from '../../stores/uiStore';
import useNavigationStore from '../../stores/navigationStore';

const Layout = ({ children }) => {
  const location = useLocation();
  const { preferences } = useUIStore();
  const { pushRoute } = useNavigationStore();

  // Track navigation history for in-game routes only
  useEffect(() => {
    if (location.pathname.startsWith('/game/')) {
      pushRoute(location.pathname);
    }
  }, [location.pathname, pushRoute]);

  return (
    <div className="h-full flex">
      <Sidebar currentPath={location.pathname} />
      
      <div className={`flex-1 flex flex-col transition-all duration-300 ${
        preferences.sidebarCollapsed ? 'ml-16' : 'ml-48'
      }`}>
        <Header />

        <main className="flex-1 overflow-auto p-3 bg-bg-primary">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default Layout;