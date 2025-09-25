/**
 * @file Layout.jsx
 * @description Main layout component with navigation
 */

import React from 'react';
import { useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import useUIStore from '../../stores/uiStore';

const Layout = ({ children }) => {
  const location = useLocation();
  const { preferences } = useUIStore();

  return (
    <div className="h-full flex">
      <Sidebar currentPath={location.pathname} />
      
      <div className={`flex-1 flex flex-col transition-all duration-300 ${
        preferences.sidebarCollapsed ? 'ml-16' : 'ml-64'
      }`}>
        <Header />
        
        <main className="flex-1 overflow-auto p-6 bg-cricket-background">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default Layout;