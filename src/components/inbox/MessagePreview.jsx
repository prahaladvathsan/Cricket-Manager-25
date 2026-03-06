/**
 * @file MessagePreview.jsx
 * @description Message list item preview component
 */

import React from 'react';
import { Trash2 } from 'lucide-react';

// Avatar color by sender type
const SENDER_COLORS = {
  'Board of Directors': 'bg-cricket-accent',
  'Chairman': 'bg-trophy-gold text-cricket-dark',
  'Team Analyst': 'bg-blue-500',
  'Match Commissioner': 'bg-green-600',
  'Auction Commissioner': 'bg-purple-500',
  'Medical Staff': 'bg-red-500',
  'Game Support': 'bg-blue-400',
  'Transfer Market': 'bg-orange-500',
  default: 'bg-bg-tertiary text-text-secondary'
};

function getSenderInitials(sender) {
  if (!sender) return '?';
  const words = sender.split(' ');
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
  return sender.substring(0, 2).toUpperCase();
}

function getSenderColor(sender) {
  return SENDER_COLORS[sender] || SENDER_COLORS.default;
}

const MessagePreview = ({ message, isSelected, onSelect, onDelete, onToggleRead }) => {
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffHours = (now - date) / (1000 * 60 * 60);

    if (diffHours < 24) return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    if (diffHours < 48) return 'Yesterday';
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const handleDelete = (e) => {
    e.stopPropagation();
    onDelete();
  };

  const isUnread = !message.read;

  return (
    <div
      onClick={onSelect}
      className={`p-3 border-b border-border-primary cursor-pointer transition-colors hover:bg-bg-tertiary relative ${
        isSelected ? 'bg-cricket-primary/10' : ''
      } ${isUnread ? 'bg-bg-primary/30' : ''}`}
    >
      {/* Unread left-border accent */}
      {isUnread && (
        <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-cricket-accent rounded-l" />
      )}

      <div className="flex items-start gap-2 pl-1">
        {/* Sender Avatar */}
        <div
          className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${getSenderColor(message.sender)}`}
          title={message.sender}
        >
          {getSenderInitials(message.sender)}
        </div>

        {/* Message Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-1 mb-0.5">
            <span className={`text-xs font-medium truncate ${isUnread ? 'text-text-primary' : 'text-text-secondary'}`}>
              {message.sender}
            </span>
            <span className="text-xxs text-text-tertiary flex-shrink-0">
              {formatDate(message.date)}
            </span>
          </div>

          <h3 className={`text-xs mb-1 truncate ${isUnread ? 'font-semibold text-text-primary' : 'text-text-secondary'}`}>
            {message.subject}
          </h3>

          <p className="text-xxs text-text-tertiary line-clamp-2 leading-relaxed">
            {message.body.replace(/\*\*(.*?)\*\*/g, '$1').substring(0, 90)}...
          </p>

          <div className="flex items-center justify-end mt-1.5">
            <button
              onClick={handleDelete}
              className="text-text-tertiary hover:text-red-400 transition-colors"
              title="Delete message"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MessagePreview;
