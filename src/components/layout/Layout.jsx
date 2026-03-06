/**
 * @file Layout.jsx
 * @description Main layout component with navigation
 */

import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import AutosaveIndicator from '../shared/AutosaveIndicator';
import ProcessingOverlay from '../shared/ProcessingOverlay';
import NotificationToast from '../shared/NotificationToast';
import useUIStore from '../../stores/uiStore';
import useGameStore from '../../stores/gameStore';
import useNavigationStore from '../../stores/navigationStore';
import '../../styles/wallpaper.css';

const Layout = ({ children }) => {
  const location = useLocation();
  const { preferences } = useUIStore();
  const isProcessingTurn = useGameStore((state) => state.isProcessingTurn);
  const { pushRoute } = useNavigationStore();

  // Track navigation history for in-game routes only
  useEffect(() => {
    if (location.pathname.startsWith('/game/')) {
      pushRoute(location.pathname);
    }
  }, [location.pathname, pushRoute]);

  return (
    <div className="h-full flex app-wallpaper">
      <Sidebar currentPath={location.pathname} />

      <div className={`flex-1 flex flex-col transition-all duration-300 ${preferences.sidebarCollapsed ? 'ml-16' : 'ml-48'
        }`}>
        <Header />

        <main className="flex-1 overflow-auto p-3" aria-label="Main content">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>

      {/* Global autosave indicator */}
      <AutosaveIndicator />

      {/* Processing overlay during advanceDay */}
      <ProcessingOverlay isVisible={isProcessingTurn} />

      {/* Notification toasts */}
      <NotificationToast />
    </div>
  );
};

export default Layout;