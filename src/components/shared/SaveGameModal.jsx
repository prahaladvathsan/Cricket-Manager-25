/**
 * @file SaveGameModal.jsx
 * @description Save management modal with export and cloud sync options
 *
 * Note: Game state is auto-saved via Zustand persist middleware.
 * This modal is for exporting saves for backup/sharing and syncing to cloud.
 */

import React, { useState } from 'react';
import { X, Download, CheckCircle, AlertCircle, Trophy, RefreshCw } from 'lucide-react';
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
import useAuthStore from '../../stores/authStore';
import { getTeamBadge } from '../../utils/assetHelpers';

const SaveGameModal = ({ isOpen, onClose }) => {
  const [exporting, setExporting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [result, setResult] = useState(null);

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
  const currentDate = useGameStore(s => s.currentDate);
  const gameDay = useGameStore(s => s.gameDay);
  const userTeamId = useTeamStore(s => s.userTeamId);
  const teams = useTeamStore(s => s.teams);
  const standings = useLeagueStore(s => s.standings);
  const userTeam = teams[userTeamId];

  // Auth state
  const isAnonymous = useAuthStore(s => s.isAnonymous);
  const authUser = useAuthStore(s => s.user);
  const isLoggedIn = !isAnonymous && !!authUser;

  // Calculate position from standings
  const getPosition = () => {
    if (!standings?.length || !userTeamId) return null;
    const sorted = [...standings].sort((a, b) =>
      b.points !== a.points ? b.points - a.points : b.netRunRate - a.netRunRate
    );
    const pos = sorted.findIndex(s => s.clubId === userTeamId);
    return pos >= 0 ? pos + 1 : null;
  };

  // Get user team stats
  const getUserStats = () => {
    if (!standings?.length || !userTeamId) return null;
    return standings.find(s => s.clubId === userTeamId);
  };

  const position = getPosition();
  const stats = getUserStats();

  // Format in-game date
  const formatInGameDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const handleExport = async () => {
    setExporting(true);
    setResult(null);

    try {
      // First create a manual save to ensure it's up-to-date
      const saveResult = await SaveGameManager.createManualSave(stores, `${userTeam?.name || 'Game'} - Export`);

      if (saveResult.success) {
        // Then export to file
        const success = await SaveGameManager.exportSave(saveResult.saveId);
        if (success) {
          setResult({ success: true, message: 'Save exported! Check your downloads.' });
        } else {
          setResult({ success: false, message: 'Failed to export save.' });
        }
      } else {
        setResult({ success: false, message: saveResult.error || 'Failed to create save.' });
      }
    } catch (error) {
      console.error('Export error:', error);
      setResult({ success: false, message: 'Export failed.' });
    } finally {
      setExporting(false);
    }
  };

  const handleSyncToCloud = async () => {
    if (!isLoggedIn) return;

    setSyncing(true);
    setResult(null);

    try {
      // First create a manual save
      const saveResult = await SaveGameManager.createManualSave(stores, `${userTeam?.name || 'Game'} - Cloud Sync`);

      if (saveResult.success) {
        // Then upload to cloud
        const uploadResult = await SaveGameManager.uploadToCloud(saveResult.saveId);
        if (uploadResult.success) {
          setResult({ success: true, message: 'Save synced to cloud!' });
        } else {
          setResult({ success: false, message: uploadResult.error || 'Failed to sync to cloud.' });
        }
      } else {
        setResult({ success: false, message: saveResult.error || 'Failed to create save.' });
      }
    } catch (error) {
      console.error('Cloud sync error:', error);
      setResult({ success: false, message: 'Cloud sync failed.' });
    } finally {
      setSyncing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="card w-full max-w-md">
        {/* Header */}
        <div className="p-6 border-b border-cricket-primary flex items-center justify-between">
          <h2 className="text-xl font-bold text-cricket-text-primary">
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
        <div className="p-6 space-y-4">
          {/* Current Game Info - Detailed like LoadGame */}
          {userTeam && (
            <div className="p-4 bg-cricket-secondary/50 rounded-lg border border-gray-700/50">
              <div className="flex items-center gap-4">
                {/* Team Badge */}
                <img
                  src={getTeamBadge(userTeamId)}
                  alt={userTeam.name}
                  className="w-14 h-14 object-contain"
                />

                {/* Team Info */}
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-lg text-cricket-text-primary">{userTeam.name}</div>
                  <div className="text-sm text-cricket-text-secondary">
                    Season {currentSeason} • {currentPhase}
                  </div>
                </div>

                {/* Position */}
                {position && (
                  <div className="flex items-center gap-1 text-trophy-gold">
                    <Trophy className="w-5 h-5" />
                    <span className="text-lg font-bold">#{position}</span>
                  </div>
                )}
              </div>

              {/* Stats Row */}
              <div className="mt-4 pt-3 border-t border-gray-700/50 grid grid-cols-4 gap-2 text-center">
                <div>
                  <div className="text-xs text-cricket-text-secondary uppercase">Record</div>
                  <div className="text-sm font-semibold text-green-400">
                    {stats ? `${stats.won}W-${stats.lost}L` : '-'}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-cricket-text-secondary uppercase">Points</div>
                  <div className="text-sm font-semibold text-cricket-text-primary">
                    {stats?.points ?? '-'}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-cricket-text-secondary uppercase">Game Day</div>
                  <div className="text-sm font-semibold text-cricket-text-primary">
                    Day {gameDay}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-cricket-text-secondary uppercase">Date</div>
                  <div className="text-sm font-semibold text-cricket-text-primary">
                    {formatInGameDate(currentDate).split(',')[0]}
                  </div>
                </div>
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
            Your game is automatically saved after matches and auctions. Use the options below to backup or sync your progress.
          </div>

          {/* Actions */}
          <div className="space-y-3">
            {/* Sync to Cloud */}
            <button
              onClick={handleSyncToCloud}
              disabled={syncing || !userTeam || !isLoggedIn}
              className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium transition-colors ${
                isLoggedIn
                  ? 'bg-blue-600 hover:bg-blue-500 text-white'
                  : 'bg-gray-700/50 text-gray-500 cursor-not-allowed'
              }`}
              title={isLoggedIn ? 'Upload current save to cloud' : 'Sign in to enable cloud saves'}
            >
              {syncing ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
              )}
              {syncing ? 'Syncing...' : 'Sync to Cloud'}
            </button>

            {!isLoggedIn && (
              <p className="text-xs text-cricket-text-secondary text-center -mt-1">
                Sign in from Load Game screen to enable cloud saves
              </p>
            )}

            {/* Export to File */}
            <button
              onClick={handleExport}
              disabled={exporting || !userTeam}
              className="btn-secondary w-full flex items-center justify-center gap-2"
            >
              <Download className="w-4 h-4" />
              {exporting ? 'Exporting...' : 'Export to File (.cm25)'}
            </button>
          </div>

          {/* Info text */}
          <p className="text-xs text-cricket-text-secondary text-center">
            Exported files can be imported from the Load Game screen.
          </p>
        </div>
      </div>
    </div>
  );
};

export default SaveGameModal;
