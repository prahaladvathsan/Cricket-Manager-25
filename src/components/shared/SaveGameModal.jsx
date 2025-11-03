/**
 * @file SaveGameModal.jsx
 * @description Modal for saving game during gameplay
 */

import React, { useState, useEffect } from 'react';
import { X, Save, Edit2, Check } from 'lucide-react';
import SaveGameManager from '../../utils/SaveGameManager';
import useGameStore from '../../stores/gameStore';
import useTeamStore from '../../stores/teamStore';
import usePlayerStore from '../../stores/playerStore';
import useLeagueStore from '../../stores/leagueStore';
import useFinanceStore from '../../stores/financeStore';
import useMatchStore from '../../stores/matchStore';
import useAuctionStore from '../../stores/auctionStore';
import useUIStore from '../../stores/uiStore';

const SaveGameModal = ({ isOpen, onClose }) => {
  const [saves, setSaves] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [customName, setCustomName] = useState('');
  const [editingSlot, setEditingSlot] = useState(null);
  const [saving, setSaving] = useState(false);

  const stores = {
    gameStore: useGameStore,
    teamStore: useTeamStore,
    playerStore: usePlayerStore,
    leagueStore: useLeagueStore,
    financeStore: useFinanceStore,
    matchStore: useMatchStore,
    auctionStore: useAuctionStore,
    uiStore: useUIStore
  };

  useEffect(() => {
    if (isOpen) {
      loadSaves();
    }
  }, [isOpen]);

  const loadSaves = () => {
    const allSaves = SaveGameManager.getAllSaves();
    setSaves(allSaves);
  };

  const handleSave = async () => {
    if (selectedSlot === null) {
      alert('Please select a slot to save to');
      return;
    }

    setSaving(true);
    try {
      const success = SaveGameManager.saveGame(
        selectedSlot,
        stores,
        customName || null
      );

      if (success) {
        alert('Game saved successfully!');
        setCustomName('');
        setSelectedSlot(null);
        onClose();
      } else {
        alert('Failed to save game. Please try again.');
      }
    } catch (error) {
      console.error('Error saving game:', error);
      alert('Failed to save game. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (!isOpen) return null;

  const emptySlots = SaveGameManager.getEmptySlots();
  const allSlots = Array.from({ length: 10 }, (_, i) => i);

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="card w-full max-w-4xl max-h-[90vh] overflow-auto">
        {/* Header */}
        <div className="sticky top-0 bg-cricket-secondary p-6 border-b border-cricket-primary flex items-center justify-between">
          <h2 className="text-2xl font-bold text-cricket-text-primary">
            Save Game
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-cricket-dark rounded transition-colors"
          >
            <X className="w-5 h-5 text-cricket-text-secondary" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <p className="text-cricket-text-secondary mb-6">
            Select a slot to save your game. You can overwrite existing saves or create a new one.
          </p>

          {/* Save Slots Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
            {allSlots.map((slot) => {
              const saveData = saves.find(s => s.slot === slot);
              const isEmpty = !saveData;
              const isSelected = selectedSlot === slot;

              return (
                <div
                  key={slot}
                  onClick={() => setSelectedSlot(slot)}
                  className={`
                    p-4 rounded border-2 cursor-pointer transition-all
                    ${isSelected ? 'border-cricket-primary bg-cricket-primary/20' : 'border-cricket-secondary hover:border-cricket-primary/50'}
                    ${isEmpty ? 'bg-cricket-secondary/30' : 'bg-cricket-secondary'}
                  `}
                >
                  {isEmpty ? (
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-cricket-dark rounded">
                        <Save className="w-5 h-5 text-cricket-text-secondary" />
                      </div>
                      <div>
                        <div className="font-semibold text-cricket-text-primary">
                          Empty Slot
                        </div>
                        <div className="text-xs text-cricket-text-secondary">
                          Slot {slot + 1}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <div className="font-semibold text-cricket-text-primary">
                            {saveData.saveName}
                          </div>
                          <div className="text-xs text-cricket-text-secondary mt-1">
                            {formatDate(saveData.timestamp)}
                          </div>
                        </div>
                        <div className="text-xs text-cricket-text-secondary">
                          Slot {slot + 1}
                        </div>
                      </div>
                      <div className="flex gap-2 text-xs mt-2">
                        <span className="px-2 py-0.5 bg-cricket-dark rounded text-cricket-text-secondary">
                          S{saveData.metadata.season}
                        </span>
                        <span className="px-2 py-0.5 bg-cricket-dark rounded text-cricket-text-secondary capitalize">
                          {saveData.metadata.phase}
                        </span>
                        {saveData.metadata.position && (
                          <span className="px-2 py-0.5 bg-cricket-dark rounded text-cricket-text-secondary">
                            #{saveData.metadata.position}
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Custom Name Input */}
          {selectedSlot !== null && (
            <div className="mb-6">
              <label className="block text-sm font-semibold text-cricket-text-primary mb-2">
                Save Name (Optional)
              </label>
              <input
                type="text"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                placeholder="Enter custom save name or leave blank for auto-generated"
                className="w-full px-4 py-2 bg-cricket-secondary border border-cricket-primary/30 rounded text-cricket-text-primary placeholder-cricket-text-secondary focus:outline-none focus:border-cricket-primary"
                maxLength={50}
              />
              <p className="text-xs text-cricket-text-secondary mt-1">
                {customName.length}/50 characters
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={handleSave}
              disabled={selectedSlot === null || saving}
              className="btn-primary flex items-center gap-2 flex-1"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Saving...' : 'Save Game'}
            </button>
            <button
              onClick={onClose}
              className="btn-secondary"
            >
              Cancel
            </button>
          </div>

          {/* Info */}
          <div className="mt-4 p-3 bg-cricket-secondary/50 rounded text-xs text-cricket-text-secondary">
            <p className="mb-1">💾 Maximum 10 saves allowed</p>
            <p>✏️ You can overwrite existing saves by selecting them</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SaveGameModal;
