/**
 * @file MessagePreview.jsx
 * @description Message list item preview component
 */

import React from 'react';
import { Mail, MailOpen, Trash2 } from 'lucide-react';

const MessagePreview = ({ message, isSelected, onSelect, onDelete, onToggleRead }) => {
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffHours = diffMs / (1000 * 60 * 60);

    if (diffHours < 24) {
      return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    } else if (diffHours < 48) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
  };

  // Get message type badge color
  const getTypeBadgeColor = (type) => {
    switch (type) {
      case 'welcome':
      case 'expectations':
        return 'bg-cricket-accent text-white';
      case 'tutorial':
        return 'bg-blue-500 text-white';
      case 'auction_summary':
        return 'bg-trophy-gold text-cricket-dark';
      case 'match_reminder':
        return 'bg-orange-500 text-white';
      case 'match_result':
        return 'bg-green-500 text-white';
      default:
        return 'bg-bg-tertiary text-text-secondary';
    }
  };

  // Format type label
  const getTypeLabel = (type) => {
    return type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const handleDelete = (e) => {
    e.stopPropagation();
    onDelete();
  };

  const handleToggleRead = (e) => {
    e.stopPropagation();
    onToggleRead();
  };

  return (
    <div
      onClick={onSelect}
      className={`p-3 border-b border-border-primary cursor-pointer transition-colors hover:bg-bg-tertiary ${
        isSelected ? 'bg-cricket-primary/10 border-l-4 border-l-cricket-accent' : ''
      } ${!message.read ? 'bg-bg-primary/50' : ''}`}
    >
      <div className="flex items-start gap-2">
        {/* Read/Unread Icon */}
        <button
          onClick={handleToggleRead}
          className="mt-0.5 text-text-secondary hover:text-cricket-accent transition-colors"
          title={message.read ? 'Mark as unread' : 'Mark as read'}
        >
          {message.read ? (
            <MailOpen className="w-4 h-4" />
          ) : (
            <Mail className="w-4 h-4 text-cricket-accent" />
          )}
        </button>

        {/* Message Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-1">
            <span className={`text-xs font-medium ${!message.read ? 'text-text-primary' : 'text-text-secondary'}`}>
              {message.sender}
            </span>
            <span className="text-xs text-text-tertiary flex-shrink-0">
              {formatDate(message.date)}
            </span>
          </div>

          <h3 className={`text-sm mb-1 truncate ${!message.read ? 'font-semibold text-text-primary' : 'text-text-secondary'}`}>
            {message.subject}
          </h3>

          <p className="text-xs text-text-tertiary line-clamp-2">
            {message.body.substring(0, 100)}...
          </p>

          <div className="flex items-center justify-between mt-2">
            <span className={`text-xxs px-2 py-0.5 rounded ${getTypeBadgeColor(message.type)}`}>
              {getTypeLabel(message.type)}
            </span>

            <button
              onClick={handleDelete}
              className="text-text-tertiary hover:text-red-400 transition-colors"
              title="Delete message"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MessagePreview;
