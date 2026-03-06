/**
 * @file Inbox.jsx
 * @description Main inbox page with message list and viewer
 */

import React, { useState, useEffect } from 'react';
import { Mail, MailOpen, Filter, ArrowUpDown, Settings, X } from 'lucide-react';
import useInboxStore from '../../stores/inboxStore';
import useUIStore from '../../stores/uiStore';
import MessagePreview from './MessagePreview';
import MessageViewer from './MessageViewer';

const PREF_LABELS = {
  match: 'Match notifications',
  injury: 'Injury & recovery',
  finance: 'Finance & auctions',
  board: 'Board & season',
  tutorial: 'Tutorial tips'
};

const Inbox = () => {
  const {
    messages,
    currentFilter,
    currentSort,
    markAsRead,
    markAsUnread,
    deleteMessage,
    markAllAsRead,
    setFilter,
    setSort,
    getFilteredAndSortedMessages
  } = useInboxStore();

  const { notificationPreferences, updateNotificationPreferences } = useUIStore();
  const [selectedMessageId, setSelectedMessageId] = useState(null);
  const [showSettings, setShowSettings] = useState(false);

  // Get filtered and sorted messages
  const filteredMessages = getFilteredAndSortedMessages();

  // Auto-select first unread message on load
  useEffect(() => {
    if (filteredMessages.length > 0 && !selectedMessageId) {
      const firstUnread = filteredMessages.find(m => !m.read);
      setSelectedMessageId((firstUnread || filteredMessages[0]).id);
    }
  }, [filteredMessages, selectedMessageId]);

  const selectedMessage = filteredMessages.find(m => m.id === selectedMessageId);

  const handleSelectMessage = (messageId) => {
    setSelectedMessageId(messageId);
    const message = messages.find(m => m.id === messageId);
    if (message && !message.read) markAsRead(messageId);
  };

  const handleDelete = (messageId) => {
    deleteMessage(messageId);
    const currentIndex = filteredMessages.findIndex(m => m.id === messageId);
    if (filteredMessages.length > 1) {
      const nextMessage = filteredMessages[currentIndex + 1] || filteredMessages[currentIndex - 1];
      if (nextMessage) setSelectedMessageId(nextMessage.id);
    } else {
      setSelectedMessageId(null);
    }
  };

  const handleToggleRead = (messageId) => {
    const message = messages.find(m => m.id === messageId);
    if (message) {
      if (message.read) markAsUnread(messageId);
      else markAsRead(messageId);
    }
  };

  const filterOptions = [
    { value: 'all', label: 'All Messages' },
    { value: 'match', label: 'Match' },
    { value: 'injury', label: 'Injury' },
    { value: 'finance', label: 'Finance' },
    { value: 'transfer', label: 'Transfer' },
    { value: 'board', label: 'Board' },
    { value: 'tutorial', label: 'Tutorial' }
  ];

  const sortOptions = [
    { value: 'date', label: 'Date' },
    { value: 'type', label: 'Type' },
    { value: 'unread', label: 'Unread First' }
  ];

  return (
    <div className="h-full flex flex-col">
      {messages.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Mail className="w-16 h-16 text-text-tertiary mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-text-primary mb-2">No Messages</h2>
            <p className="text-text-secondary">Your inbox is empty. Messages will appear here as you progress through the season.</p>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex gap-2 overflow-hidden">
          {/* Message List */}
          <div className="w-2/5 flex flex-col border border-border-primary rounded-lg bg-bg-secondary overflow-hidden">
            {/* Header */}
            <div className="p-2 border-b border-border-primary bg-bg-tertiary flex items-center justify-between gap-2">
              <h2 className="text-sm font-semibold text-text-primary">
                Messages ({filteredMessages.length} of {messages.length})
              </h2>
              <div className="flex items-center gap-1">
                {messages.some(m => !m.read) && (
                  <button
                    onClick={markAllAsRead}
                    className="btn-secondary text-xs flex items-center gap-1 px-2 py-1"
                  >
                    <MailOpen className="w-3 h-3" />
                    Mark All Read
                  </button>
                )}
                <button
                  onClick={() => setShowSettings(s => !s)}
                  className={`p-1 rounded transition-colors ${showSettings ? 'text-cricket-accent' : 'text-text-tertiary hover:text-text-primary'}`}
                  title="Notification settings"
                >
                  <Settings className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Notification Settings Panel */}
            {showSettings && (
              <div className="p-3 border-b border-border-primary bg-bg-primary">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-text-primary">Pop-up Notifications</span>
                  <button onClick={() => setShowSettings(false)} className="text-text-tertiary hover:text-text-primary">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="space-y-1.5">
                  {Object.entries(PREF_LABELS).map(([key, label]) => (
                    <label key={key} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={notificationPreferences[key] ?? true}
                        onChange={(e) => updateNotificationPreferences({ [key]: e.target.checked })}
                        className="w-3 h-3 accent-cricket-accent"
                      />
                      <span className="text-xs text-text-secondary">{label}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Filter and Sort Controls */}
            <div className="p-2 border-b border-border-primary bg-bg-secondary flex items-center gap-2">
              <div className="flex items-center gap-1 flex-1">
                <Filter className="w-3 h-3 text-text-secondary" />
                <select
                  value={currentFilter}
                  onChange={(e) => setFilter(e.target.value)}
                  className="text-xs bg-bg-tertiary text-text-primary border border-border-primary rounded px-2 py-1 flex-1"
                >
                  {filterOptions.map(option => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-1 flex-1">
                <ArrowUpDown className="w-3 h-3 text-text-secondary" />
                <select
                  value={currentSort}
                  onChange={(e) => setSort(e.target.value)}
                  className="text-xs bg-bg-tertiary text-text-primary border border-border-primary rounded px-2 py-1 flex-1"
                >
                  {sortOptions.map(option => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              {filteredMessages.map((message) => (
                <MessagePreview
                  key={message.id}
                  message={message}
                  isSelected={message.id === selectedMessageId}
                  onSelect={() => handleSelectMessage(message.id)}
                  onDelete={() => handleDelete(message.id)}
                  onToggleRead={() => handleToggleRead(message.id)}
                />
              ))}
            </div>
          </div>

          {/* Message Viewer */}
          <div className="flex-1 border border-border-primary rounded-lg bg-bg-secondary overflow-hidden">
            {selectedMessage ? (
              <MessageViewer
                message={selectedMessage}
                onDelete={() => handleDelete(selectedMessage.id)}
                onToggleRead={() => handleToggleRead(selectedMessage.id)}
              />
            ) : (
              <div className="h-full flex items-center justify-center">
                <p className="text-text-secondary">Select a message to view</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Inbox;
