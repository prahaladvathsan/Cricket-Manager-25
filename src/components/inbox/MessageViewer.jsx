/**
 * @file MessageViewer.jsx
 * @description Full message viewer component
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, MailOpen, Trash2, ExternalLink } from 'lucide-react';

const MessageViewer = ({ message, onDelete, onToggleRead }) => {
  const navigate = useNavigate();

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  };

  // Handle link clicks in metadata
  const handleLinkClick = () => {
    if (message.metadata?.link) {
      navigate(message.metadata.link);
    }
  };

  // Format message body with basic markdown-like rendering
  const formatBody = (body) => {
    return body.split('\n').map((line, index) => {
      // Bold text (**text**)
      const boldRegex = /\*\*(.*?)\*\*/g;
      const parts = line.split(boldRegex);

      return (
        <p key={index} className="mb-2">
          {parts.map((part, i) => {
            if (i % 2 === 1) {
              return <strong key={i} className="font-semibold text-text-primary">{part}</strong>;
            }
            return part;
          })}
        </p>
      );
    });
  };

  return (
    <div className="h-full flex flex-col">
      {/* Message Header */}
      <div className="p-4 border-b border-border-primary bg-bg-tertiary">
        <div className="flex items-start justify-between gap-4 mb-3">
          <div className="flex-1">
            <h2 className="text-xl font-semibold text-text-primary mb-2">
              {message.subject}
            </h2>
            <div className="flex items-center gap-2 text-sm text-text-secondary">
              <span className="font-medium">{message.sender}</span>
              <span>•</span>
              <span>{formatDate(message.date)}</span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={onToggleRead}
              className="p-2 rounded hover:bg-cricket-primary/20 transition-colors text-text-secondary hover:text-text-primary"
              title={message.read ? 'Mark as unread' : 'Mark as read'}
            >
              {message.read ? (
                <Mail className="w-5 h-5" />
              ) : (
                <MailOpen className="w-5 h-5" />
              )}
            </button>
            <button
              onClick={onDelete}
              className="p-2 rounded hover:bg-red-500/20 transition-colors text-text-secondary hover:text-red-400"
              title="Delete message"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Message Body */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-3xl text-text-secondary leading-relaxed">
          {formatBody(message.body)}

          {/* Link/Action if available */}
          {message.metadata?.link && (
            <div className="mt-6 pt-4 border-t border-border-primary">
              <button
                onClick={handleLinkClick}
                className="btn-primary flex items-center gap-2"
              >
                <ExternalLink className="w-4 h-4" />
                {{
                  auction_summary: 'View Squad',
                  match_reminder: 'Set Tactics',
                  match_result: 'View League',
                  injury: 'Update Tactics',
                  recovery: 'View Squad',
                  board_objectives: 'View Objectives',
                  expectations: 'View Board',
                  season_summary: 'View Off-Season',
                  transfer: 'Transfer Market'
                }[message.type] || 'View Details'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MessageViewer;
