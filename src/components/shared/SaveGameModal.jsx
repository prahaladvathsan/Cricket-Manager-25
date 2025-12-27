/**
 * @file SaveGameModal.jsx
 * @description Simple export/import modal for save files
 *
 * Note: Game state is auto-saved via Zustand persist middleware.
 * This modal is for exporting saves for backup/sharing.
 */

import React, { useState, useRef } from 'react';
import { X, Download, Upload, CheckCircle, AlertCircle } from 'lucide-react';
import SaveGameManager from '../../utils/SaveGameManager';
import useGameStore from '../../stores/gameStore';
import useTeamStore from '../../stores/teamStore';
import usePlayerStore from '../../stores/playerStore';
import useLeagueStore from '../../stores/leagueStore';
import useFinanceStore from '../../stores/financeStore';
import useMatchStore from '../../stores/matchStore';
import useAuctionStore from '../../stores/auctionStore';
import useInboxStore from '../../stores/inboxStore';
import useTransferStore from '../../stores/transferStore';

const SaveGameModal = ({ isOpen, onClose }) => {
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState(null);
  const fileInputRef = useRef(null);

  const stores = {
    gameStore: useGameStore,
    teamStore: useTeamStore,
    playerStore: usePlayerStore,
    leagueStore: useLeagueStore,
    financeStore: useFinanceStore,
    matchStore: useMatchStore,
    auctionStore: useAuctionStore,
    inboxStore: useInboxStore,
    transferStore: useTransferStore
  };

  // Get current game info for display
  const currentSeason = useGameStore(s => s.currentSeason);
  const currentPhase = useGameStore(s => s.currentPhase);
  const userTeamId = useTeamStore(s => s.userTeamId);
  const teams = useTeamStore(s => s.teams);
  const userTeam = teams[userTeamId];

  const handleExport = async () => {
    setExporting(true);
    setResult(null);

    try {
      // First save current state to ensure export is up-to-date
      SaveGameManager.saveGame(stores, 'export');

      // Then export to file
      const success = SaveGameManager.exportSave();
      if (success) {
        setResult({ success: true, message: 'Save exported! Check your downloads.' });
      } else {
        setResult({ success: false, message: 'Failed to export save.' });
      }
    } catch (error) {
      console.error('Export error:', error);
      setResult({ success: false, message: 'Export failed.' });
    } finally {
      setExporting(false);
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    e.target.value = '';
    setImporting(true);
    setResult(null);

    try {
      const importResult = await SaveGameManager.importSave(file);
      if (importResult.success) {
        // Load the imported save into stores
        const loadSuccess = SaveGameManager.loadGame(stores);
        if (loadSuccess) {
          setResult({ success: true, message: `Imported "${importResult.saveName}"! Refreshing...` });
          // Refresh page to ensure all components pick up new state
          setTimeout(() => window.location.reload(), 1500);
        } else {
          setResult({ success: false, message: 'Failed to load imported save.' });
        }
      } else {
        setResult({ success: false, message: importResult.error });
      }
    } catch (error) {
      console.error('Import error:', error);
      setResult({ success: false, message: 'Import failed.' });
    } finally {
      setImporting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="card w-full max-w-md">
        {/* Header */}
        <div className="p-6 border-b border-cricket-primary flex items-center justify-between">
          <h2 className="text-xl font-bold text-cricket-text-primary">
            Save Management
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-cricket-dark rounded transition-colors"
          >
            <X className="w-5 h-5 text-cricket-text-secondary" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Current Game Info */}
          {userTeam && (
            <div className="p-4 bg-cricket-secondary/50 rounded">
              <div className="text-sm text-cricket-text-secondary mb-1">Current Game</div>
              <div className="font-semibold text-cricket-text-primary">{userTeam.name}</div>
              <div className="text-sm text-cricket-text-secondary">
                Season {currentSeason} - {currentPhase}
              </div>
            </div>
          )}

          {/* Result Message */}
          {result && (
            <div className={`p-3 rounded flex items-center gap-2 ${
              result.success
                ? 'bg-green-900/30 border border-green-700 text-green-400'
                : 'bg-red-900/30 border border-red-700 text-red-400'
            }`}>
              {result.success ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
              <span>{result.message}</span>
            </div>
          )}

          {/* Auto-save Note */}
          <div className="p-3 bg-cricket-dark/50 rounded text-sm text-cricket-text-secondary">
            Your game is automatically saved. Use Export to create a backup file you can share or restore later.
          </div>

          {/* Actions */}
          <div className="space-y-3">
            <button
              onClick={handleExport}
              disabled={exporting || !userTeam}
              className="btn-primary w-full flex items-center justify-center gap-2"
            >
              <Download className="w-4 h-4" />
              {exporting ? 'Exporting...' : 'Export Save (.cm25)'}
            </button>

            <button
              onClick={handleImportClick}
              disabled={importing}
              className="btn-secondary w-full flex items-center justify-center gap-2"
            >
              <Upload className="w-4 h-4" />
              {importing ? 'Importing...' : 'Import Save'}
            </button>
          </div>

          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".cm25"
            onChange={handleFileSelect}
            className="hidden"
          />

          {/* Warning for import */}
          <p className="text-xs text-cricket-text-secondary text-center">
            Importing will replace your current game progress.
          </p>
        </div>
      </div>
    </div>
  );
};

export default SaveGameModal;
