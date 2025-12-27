/**
 * @file Inbox.jsx
 * @description Main inbox page with message list and viewer
 */

import React, { useState, useEffect } from 'react';
import { Mail, MailOpen, Trash2, RotateCcw, Filter, ArrowUpDown } from 'lucide-react';
import useInboxStore from '../../stores/inboxStore';
import MessagePreview from './MessagePreview';
import MessageViewer from './MessageViewer';

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
  const [selectedMessageId, setSelectedMessageId] = useState(null);

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

  // Handle message selection
  const handleSelectMessage = (messageId) => {
    setSelectedMessageId(messageId);
    // Auto-mark as read when opened
    const message = messages.find(m => m.id === messageId);
    if (message && !message.read) {
      markAsRead(messageId);
    }
  };

  // Handle delete
  const handleDelete = (messageId) => {
    deleteMessage(messageId);
    // Select next message
    const currentIndex = filteredMessages.findIndex(m => m.id === messageId);
    if (filteredMessages.length > 1) {
      const nextMessage = filteredMessages[currentIndex + 1] || filteredMessages[currentIndex - 1];
      if (nextMessage) {
        setSelectedMessageId(nextMessage.id);
      }
    } else {
      setSelectedMessageId(null);
    }
  };

  // Handle toggle read status
  const handleToggleRead = (messageId) => {
    const message = messages.find(m => m.id === messageId);
    if (message) {
      if (message.read) {
        markAsUnread(messageId);
      } else {
        markAsRead(messageId);
      }
    }
  };

  // Filter options
  const filterOptions = [
    { value: 'all', label: 'All Messages' },
    { value: 'match', label: 'Match' },
    { value: 'injury', label: 'Injury' },
    { value: 'finance', label: 'Finance' },
    { value: 'board', label: 'Board' },
    { value: 'tutorial', label: 'Tutorial' }
  ];

  // Sort options
  const sortOptions = [
    { value: 'date', label: 'Date' },
    { value: 'type', label: 'Type' },
    { value: 'unread', label: 'Unread First' }
  ];

  return (
    <div className="h-full flex flex-col">
      {/* Inbox Content */}
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
            {/* Header with title and Mark All Read */}
            <div className="p-2 border-b border-border-primary bg-bg-tertiary flex items-center justify-between">
              <h2 className="text-sm font-semibold text-text-primary">
                Messages ({filteredMessages.length} of {messages.length})
              </h2>
              {messages.some(m => !m.read) && (
                <button
                  onClick={markAllAsRead}
                  className="btn-secondary text-xs flex items-center gap-1 px-2 py-1"
                >
                  <MailOpen className="w-3 h-3" />
                  Mark All Read
                </button>
              )}
            </div>

            {/* Filter and Sort Controls */}
            <div className="p-2 border-b border-border-primary bg-bg-secondary flex items-center gap-2">
              {/* Filter Dropdown */}
              <div className="flex items-center gap-1 flex-1">
                <Filter className="w-3 h-3 text-text-secondary" />
                <select
                  value={currentFilter}
                  onChange={(e) => setFilter(e.target.value)}
                  className="text-xs bg-bg-tertiary text-text-primary border border-border-primary rounded px-2 py-1 flex-1"
                >
                  {filterOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Sort Dropdown */}
              <div className="flex items-center gap-1 flex-1">
                <ArrowUpDown className="w-3 h-3 text-text-secondary" />
                <select
                  value={currentSort}
                  onChange={(e) => setSort(e.target.value)}
                  className="text-xs bg-bg-tertiary text-text-primary border border-border-primary rounded px-2 py-1 flex-1"
                >
                  {sortOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
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
