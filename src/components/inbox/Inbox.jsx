/**
 * @file Inbox.jsx
 * @description Main inbox page with message list and viewer
 */

import React, { useState, useEffect } from 'react';
import { Mail, MailOpen, Trash2, RotateCcw } from 'lucide-react';
import useInboxStore from '../../stores/inboxStore';
import MessagePreview from './MessagePreview';
import MessageViewer from './MessageViewer';

const Inbox = () => {
  const { messages, markAsRead, markAsUnread, deleteMessage, markAllAsRead } = useInboxStore();
  const [selectedMessageId, setSelectedMessageId] = useState(null);

  // Auto-select first unread message on load
  useEffect(() => {
    if (messages.length > 0 && !selectedMessageId) {
      const firstUnread = messages.find(m => !m.read);
      setSelectedMessageId((firstUnread || messages[0]).id);
    }
  }, [messages, selectedMessageId]);

  const selectedMessage = messages.find(m => m.id === selectedMessageId);

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
    const currentIndex = messages.findIndex(m => m.id === messageId);
    if (messages.length > 1) {
      const nextMessage = messages[currentIndex + 1] || messages[currentIndex - 1];
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

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="border-b border-border-primary pb-3 mb-4">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-semibold text-text-primary">Inbox</h1>
          <div className="flex items-center gap-2">
            {messages.some(m => !m.read) && (
              <button
                onClick={markAllAsRead}
                className="btn-secondary text-sm flex items-center gap-1.5"
              >
                <MailOpen className="w-4 h-4" />
                Mark All Read
              </button>
            )}
          </div>
        </div>
      </div>

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
        <div className="flex-1 flex gap-4 overflow-hidden">
          {/* Message List */}
          <div className="w-2/5 flex flex-col border border-border-primary rounded-lg bg-bg-secondary overflow-hidden">
            <div className="p-3 border-b border-border-primary bg-bg-tertiary">
              <h2 className="text-sm font-semibold text-text-primary">
                Messages ({messages.length})
              </h2>
            </div>
            <div className="flex-1 overflow-y-auto">
              {messages.map((message) => (
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
