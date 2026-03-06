/**
 * @file NotificationToast.jsx
 * @description Stacked notification toast queue, top-right, auto-dismiss after 4s
 */

import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Bell } from 'lucide-react';
import useUIStore from '../../stores/uiStore';

const CATEGORY_COLORS = {
  match: 'border-orange-400',
  injury: 'border-red-400',
  finance: 'border-trophy-gold',
  board: 'border-cricket-accent',
  tutorial: 'border-blue-400'
};

const CATEGORY_LABELS = {
  match: 'Match',
  injury: 'Injury',
  finance: 'Finance',
  board: 'Board',
  tutorial: 'Tutorial'
};

const Toast = ({ notification, onDismiss }) => {
  const navigate = useNavigate();
  const timerRef = useRef(null);

  useEffect(() => {
    timerRef.current = setTimeout(() => {
      onDismiss(notification.id);
    }, 4000);

    return () => clearTimeout(timerRef.current);
  }, [notification.id, onDismiss]);

  const handleView = () => {
    onDismiss(notification.id);
    if (notification.link) {
      navigate(notification.link);
    } else {
      navigate('/game/inbox');
    }
  };

  const borderColor = CATEGORY_COLORS[notification.category] || 'border-border-accent';

  return (
    <div
      className={`bg-bg-secondary border border-border-primary border-l-4 ${borderColor} rounded-lg shadow-xl p-3 w-72 flex flex-col gap-1 animate-slide-in`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <Bell className="w-3.5 h-3.5 text-text-tertiary flex-shrink-0" />
          <span className="text-xxs text-text-tertiary font-medium uppercase tracking-wide">
            {CATEGORY_LABELS[notification.category] || 'Notification'}
          </span>
        </div>
        <button
          onClick={() => onDismiss(notification.id)}
          className="text-text-tertiary hover:text-text-primary transition-colors flex-shrink-0"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      <p className="text-sm font-semibold text-text-primary leading-snug truncate">
        {notification.subject}
      </p>

      {notification.sender && (
        <p className="text-xs text-text-secondary truncate">From: {notification.sender}</p>
      )}

      <button
        onClick={handleView}
        className="mt-1 text-xs text-cricket-accent hover:text-cricket-light transition-colors text-left font-medium"
      >
        View →
      </button>
    </div>
  );
};

const NotificationToast = () => {
  const notificationQueue = useUIStore((state) => state.notificationQueue);
  const dismissNotification = useUIStore((state) => state.dismissNotification);

  if (notificationQueue.length === 0) return null;

  // Show at most 3 toasts at once
  const visible = notificationQueue.slice(-3);

  return (
    <div className="fixed top-14 right-3 z-50 flex flex-col gap-2 pointer-events-none">
      {visible.map((notification) => (
        <div key={notification.id} className="pointer-events-auto">
          <Toast notification={notification} onDismiss={dismissNotification} />
        </div>
      ))}
    </div>
  );
};

export default NotificationToast;
