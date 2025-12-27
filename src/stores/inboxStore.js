/**
 * @file inboxStore.js
 * @description Inbox/messaging store for in-game notifications and communications
 * @module stores/inboxStore
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { compressedStorageOptions } from '../utils/compression.js';

/**
 * @typedef {Object} Message
 * @property {string} id - Unique message ID
 * @property {string} type - Message type (welcome, expectations, tutorial, auction_summary, match_reminder, etc.)
 * @property {string} subject - Message subject line
 * @property {string} body - Message body content (can include markdown)
 * @property {string} sender - Sender name
 * @property {string} date - Message date (ISO string)
 * @property {boolean} read - Whether message has been read
 * @property {Object} metadata - Additional data (links, attachments, etc.)
 */

/**
 * @typedef {Object} InboxState
 * @property {Array<Message>} messages - All messages
 * @property {number} unreadCount - Number of unread messages
 */

const useInboxStore = create(
  persist(
    (set, get) => ({
      // State
      messages: [],
      unreadCount: 0,
      currentFilter: 'all', // all | match | injury | finance | board | tutorial
      currentSort: 'date', // date | type | unread

      /**
       * Add a new message to inbox
       * @param {Object} messageData - Message data
       * @returns {string} Message ID
       */
      addMessage: (messageData) => {
        const message = {
          id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          type: messageData.type,
          subject: messageData.subject,
          body: messageData.body,
          sender: messageData.sender || 'Team Management',
          date: messageData.date || new Date().toISOString(),
          read: false,
          metadata: messageData.metadata || {}
        };

        set((state) => ({
          messages: [message, ...state.messages],
          unreadCount: state.unreadCount + 1
        }));

        return message.id;
      },

      /**
       * Mark message as read
       * @param {string} messageId - Message ID
       */
      markAsRead: (messageId) => {
        set((state) => {
          const message = state.messages.find(m => m.id === messageId);
          if (!message || message.read) return state;

          return {
            messages: state.messages.map(m =>
              m.id === messageId ? { ...m, read: true } : m
            ),
            unreadCount: Math.max(0, state.unreadCount - 1)
          };
        });
      },

      /**
       * Mark message as unread
       * @param {string} messageId - Message ID
       */
      markAsUnread: (messageId) => {
        set((state) => {
          const message = state.messages.find(m => m.id === messageId);
          if (!message || !message.read) return state;

          return {
            messages: state.messages.map(m =>
              m.id === messageId ? { ...m, read: false } : m
            ),
            unreadCount: state.unreadCount + 1
          };
        });
      },

      /**
       * Delete a message
       * @param {string} messageId - Message ID
       */
      deleteMessage: (messageId) => {
        set((state) => {
          const message = state.messages.find(m => m.id === messageId);
          const wasUnread = message && !message.read;

          return {
            messages: state.messages.filter(m => m.id !== messageId),
            unreadCount: wasUnread ? Math.max(0, state.unreadCount - 1) : state.unreadCount
          };
        });
      },

      /**
       * Get message by ID
       * @param {string} messageId - Message ID
       * @returns {Message|undefined}
       */
      getMessage: (messageId) => {
        const state = get();
        return state.messages.find(m => m.id === messageId);
      },

      /**
       * Get all messages by type
       * @param {string} type - Message type
       * @returns {Array<Message>}
       */
      getMessagesByType: (type) => {
        const state = get();
        return state.messages.filter(m => m.type === type);
      },

      /**
       * Get unread messages
       * @returns {Array<Message>}
       */
      getUnreadMessages: () => {
        const state = get();
        return state.messages.filter(m => !m.read);
      },

      /**
       * Mark all messages as read
       */
      markAllAsRead: () => {
        set((state) => ({
          messages: state.messages.map(m => ({ ...m, read: true })),
          unreadCount: 0
        }));
      },

      /**
       * Clear all messages (use with caution)
       */
      clearAllMessages: () => {
        set({ messages: [], unreadCount: 0 });
      },

      /**
       * Recalculate unread count (utility function for data integrity)
       */
      recalculateUnreadCount: () => {
        set((state) => ({
          unreadCount: state.messages.filter(m => !m.read).length
        }));
      },

      /**
       * Set current filter
       * @param {string} filter - Filter type (all | match | injury | finance | board | tutorial)
       */
      setFilter: (filter) => {
        set({ currentFilter: filter });
      },

      /**
       * Set current sort option
       * @param {string} sort - Sort option (date | type | unread)
       */
      setSort: (sort) => {
        set({ currentSort: sort });
      },

      /**
       * Get filtered and sorted messages
       * @returns {Array<Message>} Filtered and sorted messages
       */
      getFilteredAndSortedMessages: () => {
        const state = get();
        let filtered = [...state.messages];

        // Apply filter
        if (state.currentFilter !== 'all') {
          const filterTypeMap = {
            match: ['match_reminder', 'match_result'],
            injury: ['injury', 'recovery'],
            finance: ['auction_summary'],
            board: ['expectations', 'season_summary', 'board_objectives'],
            tutorial: ['tutorial', 'welcome']
          };

          const allowedTypes = filterTypeMap[state.currentFilter] || [];
          filtered = filtered.filter(m => allowedTypes.includes(m.type));
        }

        // Apply sort
        switch (state.currentSort) {
          case 'date':
            // Sort by date descending (newest first)
            filtered.sort((a, b) => new Date(b.date) - new Date(a.date));
            break;
          case 'type':
            // Sort by type alphabetically
            filtered.sort((a, b) => a.type.localeCompare(b.type));
            break;
          case 'unread':
            // Sort unread first, then by date
            filtered.sort((a, b) => {
              if (a.read === b.read) {
                return new Date(b.date) - new Date(a.date);
              }
              return a.read ? 1 : -1;
            });
            break;
          default:
            // Default to date descending
            filtered.sort((a, b) => new Date(b.date) - new Date(a.date));
        }

        return filtered;
      }
    }),
    {
      name: 'cm25-inbox-store',
      version: 2, // Bumped version for compressed storage migration
      storage: createJSONStorage(() => localStorage, compressedStorageOptions)
    }
  )
);

export default useInboxStore;
