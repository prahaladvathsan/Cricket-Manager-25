/**
 * @file NotificationToast.jsx
 * @description Phone-style notification toasts, top-center, solid background, auto-dismiss after 5s
 */

import React, { useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { X } from 'lucide-react';
import useUIStore from '../../stores/uiStore';

const CATEGORY_COLORS = {
  match: { bar: 'bg-orange-500', text: 'text-orange-400', label: 'Match' },
  injury: { bar: 'bg-red-500', text: 'text-red-400', label: 'Injury' },
  finance: { bar: 'bg-yellow-500', text: 'text-yellow-400', label: 'Finance' },
  board: { bar: 'bg-cricket-accent', text: 'text-cricket-accent', label: 'Board' },
  tutorial: { bar: 'bg-blue-500', text: 'text-blue-400', label: 'Tip' },
};

const DISMISS_AFTER_MS = 5000;

const Toast = ({ notification, onDismiss }) => {
  const navigate = useNavigate();
  const progressRef = useRef(null);
  const timerRef = useRef(null);

  const dismiss = useCallback(() => onDismiss(notification.id), [notification.id, onDismiss]);

  useEffect(() => {
    // Animate the progress bar shrinking
    if (progressRef.current) {
      progressRef.current.style.transition = `width ${DISMISS_AFTER_MS}ms linear`;
      progressRef.current.style.width = '0%';
    }
    timerRef.current = setTimeout(dismiss, DISMISS_AFTER_MS);
    return () => clearTimeout(timerRef.current);
  }, [dismiss]);

  const handleView = () => {
    dismiss();
    navigate(notification.link || '/game/inbox');
  };

  const colors = CATEGORY_COLORS[notification.category] || CATEGORY_COLORS.board;

  return (
    <div className="w-96 bg-bg-primary border border-border-primary rounded-xl shadow-2xl overflow-hidden">
      {/* Progress bar */}
      <div className="h-0.5 bg-border-primary">
        <div ref={progressRef} className={`h-full ${colors.bar} w-full`} />
      </div>

      <div className="px-4 py-3">
        {/* Top row: category label + dismiss */}
        <div className="flex items-center justify-between mb-1.5">
          <span className={`text-xs font-bold uppercase tracking-widest ${colors.text}`}>
            {colors.label}
          </span>
          <button
            onClick={dismiss}
            className="text-text-tertiary hover:text-text-primary transition-colors p-0.5"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Subject */}
        <p className="text-sm font-semibold text-text-primary leading-snug mb-0.5">
          {notification.subject}
        </p>

        {/* Sender + View link on same row */}
        <div className="flex items-center justify-between mt-2">
          {notification.sender && (
            <span className="text-xs text-text-tertiary">{notification.sender}</span>
          )}
          <button
            onClick={handleView}
            className={`text-xs font-semibold ${colors.text} hover:opacity-80 transition-opacity ml-auto`}
          >
            View →
          </button>
        </div>
      </div>
    </div>
  );
};

const NotificationToast = () => {
  const notificationQueue = useUIStore((state) => state.notificationQueue);
  const dismissNotification = useUIStore((state) => state.dismissNotification);

  if (!notificationQueue || notificationQueue.length === 0) return null;

  // Show most recent at top, max 3
  const visible = notificationQueue.slice(-3).reverse();

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[9999] flex flex-col gap-2 items-center pointer-events-none">
      {visible.map((notification) => (
        <div key={notification.id} className="pointer-events-auto w-96">
          <Toast notification={notification} onDismiss={dismissNotification} />
        </div>
      ))}
    </div>
  );
};

export default NotificationToast;
