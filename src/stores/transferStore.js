/**
 * @file transferStore.js
 * @description Zustand store for transfer market UI state
 * Manages active listings, user bids, free agents, and transfer notifications
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { indexedDBStorage } from '../utils/indexedDBStorage.js';
import { markHydrated } from '../utils/storeHydration.js';

const useTransferStore = create(
  persist(
    (set, get) => ({
      // Active listings in the transfer market
      activeListings: [],

      // User's own listings (players they're selling)
      userListings: [],

      // User's active bids on other players
      userBids: [],

      // Free agents (players without teams)
      freeAgents: [],

      // Completed transfers (persisted for display in Completed Transfers tab)
      completedTransfers: [],

      // Transfer notifications
      notifications: [],

      // UI filters and sorting
      filters: {
        position: 'all', // 'all', 'batsman', 'bowler', 'allrounder', 'wicketkeeper'
        minRating: 0,
        maxRating: 100,
        minPrice: 0,
        maxPrice: 10000000,
        searchQuery: ''
      },

      sorting: {
        field: 'price', // 'price', 'rating', 'timeRemaining', 'interest'
        direction: 'asc' // 'asc', 'desc'
      },

      // Transfer window status
      transferWindow: {
        isOpen: false,
        startWeek: null,
        endWeek: null,
        daysRemaining: 0,
        windowOpenGameDay: null
      },

      // Transfer window summary (shown after window closes, until auction)
      transferWindowSummary: null,
      showTransferSummary: false,

      // Actions

      /**
       * Set active listings from TransferMarket
       * @param {Array} listings - Array of listing objects
       */
      setActiveListings: (listings) => set({ activeListings: listings }),

      /**
       * Add a new listing
       * @param {Object} listing - Listing object
       */
      addListing: (listing) => set((state) => ({
        activeListings: [...state.activeListings, listing]
      })),

      /**
       * Remove a listing
       * @param {string} listingId - Listing ID
       */
      removeListing: (listingId) => set((state) => ({
        activeListings: state.activeListings.filter(l => l.id !== listingId),
        userListings: state.userListings.filter(l => l.id !== listingId)
      })),

      /**
       * Update a listing (e.g., new bid placed)
       * @param {string} listingId - Listing ID
       * @param {Object} updates - Fields to update
       */
      updateListing: (listingId, updates) => set((state) => ({
        activeListings: state.activeListings.map(l =>
          l.id === listingId ? { ...l, ...updates } : l
        ),
        userListings: state.userListings.map(l =>
          l.id === listingId ? { ...l, ...updates } : l
        )
      })),

      /**
       * Set user's own listings
       * @param {Array} listings - User's listings
       */
      setUserListings: (listings) => set({ userListings: listings }),

      /**
       * Add user listing
       * @param {Object} listing - Listing object
       */
      addUserListing: (listing) => set((state) => ({
        userListings: [...state.userListings, listing]
      })),

      /**
       * Set user's bids
       * @param {Array} bids - User's active bids
       */
      setUserBids: (bids) => set({ userBids: bids }),

      /**
       * Place a bid
       * @param {Object} bid - Bid object
       */
      placeBid: (bid) => set((state) => ({
        userBids: [...state.userBids, bid]
      })),

      /**
       * Remove a bid (outbid or withdrawn)
       * @param {string} bidId - Bid ID
       */
      removeBid: (bidId) => set((state) => ({
        userBids: state.userBids.filter(b => b.id !== bidId)
      })),

      /**
       * Set free agents
       * @param {Array} agents - Free agent players
       */
      setFreeAgents: (agents) => set({ freeAgents: agents }),

      /**
       * Add a single free agent
       * @param {Object} player - Free agent player object
       */
      addFreeAgent: (player) => set((state) => ({
        freeAgents: [...state.freeAgents, player]
      })),

      /**
       * Remove free agent (signed)
       * @param {string} playerId - Player ID
       */
      removeFreeAgent: (playerId) => set((state) => ({
        freeAgents: state.freeAgents.filter(p => p.id !== playerId)
      })),

      /**
       * Add a completed transfer record
       * @param {Object} transfer - Transfer record
       */
      addCompletedTransfer: (transfer) => set((state) => ({
        completedTransfers: [...state.completedTransfers, {
          id: `ct_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
          timestamp: new Date().toISOString(),
          ...transfer
        }]
      })),

      /**
       * Add notification
       * @param {Object} notification - Notification object
       */
      addNotification: (notification) => set((state) => ({
        notifications: [
          {
            id: Date.now().toString(),
            timestamp: new Date().toISOString(),
            read: false,
            ...notification
          },
          ...state.notifications
        ]
      })),

      /**
       * Mark notification as read
       * @param {string} notificationId - Notification ID
       */
      markNotificationRead: (notificationId) => set((state) => ({
        notifications: state.notifications.map(n =>
          n.id === notificationId ? { ...n, read: true } : n
        )
      })),

      /**
       * Clear all notifications
       */
      clearNotifications: () => set({ notifications: [] }),

      /**
       * Clear read notifications
       */
      clearReadNotifications: () => set((state) => ({
        notifications: state.notifications.filter(n => !n.read)
      })),

      /**
       * Update filters
       * @param {Object} newFilters - Filter updates
       */
      updateFilters: (newFilters) => set((state) => ({
        filters: { ...state.filters, ...newFilters }
      })),

      /**
       * Reset filters to default
       */
      resetFilters: () => set({
        filters: {
          position: 'all',
          minRating: 0,
          maxRating: 100,
          minPrice: 0,
          maxPrice: 10000000,
          searchQuery: ''
        }
      }),

      /**
       * Update sorting
       * @param {Object} newSorting - Sorting updates
       */
      updateSorting: (newSorting) => set((state) => ({
        sorting: { ...state.sorting, ...newSorting }
      })),

      /**
       * Set transfer window status
       * @param {Object} status - Transfer window status
       */
      setTransferWindow: (status) => set({ transferWindow: status }),

      /**
       * Open transfer window
       * @param {number} startWeek - Start week
       * @param {number} endWeek - End week
       */
      openTransferWindow: (startWeek, endWeek, gameDay = null) => set({
        transferWindow: {
          isOpen: true,
          startWeek,
          endWeek,
          daysRemaining: (endWeek - startWeek) * 7,
          windowOpenGameDay: gameDay
        },
        // Reset seasonal transfer data so each window starts fresh
        completedTransfers: [],
        freeAgents: [],
        activeListings: [],
        userListings: [],
        userBids: []
      }),

      /**
       * Close transfer window
       */
      closeTransferWindow: () => set({
        transferWindow: {
          isOpen: false,
          startWeek: null,
          endWeek: null,
          daysRemaining: 0,
          windowOpenGameDay: null
        },
        activeListings: [],
        userListings: [],
        userBids: []
      }),

      /**
       * Set transfer window summary data (shown after window closes)
       * @param {Object} summary - Summary data
       */
      setTransferWindowSummary: (summary) => set({
        transferWindowSummary: summary,
        showTransferSummary: true
      }),

      /**
       * Clear transfer window summary (when auction phase begins)
       */
      clearTransferWindowSummary: () => set({
        transferWindowSummary: null,
        showTransferSummary: false
      }),

      /**
       * Update days remaining
       * @param {number} days - Days remaining
       */
      updateDaysRemaining: (days) => set((state) => ({
        transferWindow: {
          ...state.transferWindow,
          daysRemaining: days
        }
      })),

      /**
       * Get filtered and sorted listings
       * @returns {Array} Filtered and sorted listings
       */
      getFilteredListings: () => {
        const { activeListings, filters, sorting } = get();

        let filtered = [...activeListings];

        // Apply filters
        if (filters.position !== 'all') {
          filtered = filtered.filter(l =>
            l.player.primaryRole?.toLowerCase() === filters.position.toLowerCase()
          );
        }

        if (filters.minRating > 0) {
          filtered = filtered.filter(l => l.player.rating >= filters.minRating);
        }

        if (filters.maxRating < 100) {
          filtered = filtered.filter(l => l.player.rating <= filters.maxRating);
        }

        if (filters.minPrice > 0) {
          filtered = filtered.filter(l => l.currentBid >= filters.minPrice);
        }

        if (filters.maxPrice < 10000000) {
          filtered = filtered.filter(l => l.currentBid <= filters.maxPrice);
        }

        if (filters.searchQuery) {
          const query = filters.searchQuery.toLowerCase();
          filtered = filtered.filter(l =>
            l.player.name.toLowerCase().includes(query) ||
            l.sellerTeamName.toLowerCase().includes(query)
          );
        }

        // Apply sorting
        filtered.sort((a, b) => {
          let aVal, bVal;

          switch (sorting.field) {
            case 'price':
              aVal = a.currentBid;
              bVal = b.currentBid;
              break;
            case 'rating':
              aVal = a.player.rating;
              bVal = b.player.rating;
              break;
            case 'timeRemaining':
              aVal = new Date(a.expiryDate).getTime();
              bVal = new Date(b.expiryDate).getTime();
              break;
            case 'interest':
              aVal = a.interestedTeams?.length || 0;
              bVal = b.interestedTeams?.length || 0;
              break;
            default:
              return 0;
          }

          if (sorting.direction === 'asc') {
            return aVal - bVal;
          } else {
            return bVal - aVal;
          }
        });

        return filtered;
      },

      /**
       * Get unread notification count
       * @returns {number} Unread count
       */
      getUnreadCount: () => {
        const { notifications } = get();
        return notifications.filter(n => !n.read).length;
      },

      /**
       * Reset transfer store
       */
      reset: () => set({
        activeListings: [],
        userListings: [],
        userBids: [],
        freeAgents: [],
        completedTransfers: [],
        notifications: [],
        filters: {
          position: 'all',
          minRating: 0,
          maxRating: 100,
          minPrice: 0,
          maxPrice: 10000000,
          searchQuery: ''
        },
        sorting: {
          field: 'price',
          direction: 'asc'
        },
        transferWindow: {
          isOpen: false,
          startWeek: null,
          endWeek: null,
          daysRemaining: 0,
          windowOpenGameDay: null
        },
        transferWindowSummary: null,
        showTransferSummary: false
      })
    }),
    {
      name: 'transfer-storage',
      version: 1,
      storage: createJSONStorage(() => indexedDBStorage),
      onRehydrateStorage: () => (state, error) => {
        if (error) {
          console.error('Failed to rehydrate transferStore:', error);
        }
        console.log(`✅ [transferStore] rehydrated — ${state?.activeListings?.length ?? 0} listings from IDB`);
        markHydrated('transfer');
        import('../core/finance/transferManagerSingleton.js')
          .then(({ getTransferManager }) => {
            console.log('🔧 [transferStore] post-rehydrate: invoking restoreFromStore');
            getTransferManager().restoreFromStore();
          })
          .catch((err) => console.error('Post-rehydrate TransferManager restore failed:', err));
      }
    }
  )
);

export default useTransferStore;
