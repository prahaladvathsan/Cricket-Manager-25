/**
 * @file LoadGame.jsx
 * @description Compact save management with unified save list
 *
 * All saves (autosaves + manual) shown in one list.
 * Click any save to load it. Download/delete buttons on each tile.
 */

import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  Play,
  Upload,
  AlertCircle,
  CheckCircle,
  Trophy,
  Trash2,
  Download,
  RefreshCw,
  AlertTriangle
} from 'lucide-react';
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
import GameController from '../../core/game/GameController';
import LoadingScreen from '../shared/LoadingScreen';
import { getTeamBadge } from '../../utils/assetHelpers';
import { AuthModal, AuthSection } from '../auth';
import '../../styles/wallpaper.css';

const LoadGame = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState(null);
  const [saves, setSaves] = useState([]);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [cloudSaves, setCloudSaves] = useState([]);
  const [loadingCloudSaves, setLoadingCloudSaves] = useState(false);
  const [uploadingSaveId, setUploadingSaveId] = useState(null);
  const fileInputRef = useRef(null);

  // Auth state
  const isAnonymous = useAuthStore(s => s.isAnonymous);
  const authUser = useAuthStore(s => s.user);
  const isLoggedIn = !isAnonymous && !!authUser;

  // Check if we're in recovery mode (redirected here due to empty stores)
  const isRecoveryMode = searchParams.get('recovery') === 'true';

  // Clear recovery param after showing the message
  useEffect(() => {
    if (isRecoveryMode) {
      // Clear the recovery param after 10 seconds so refresh doesn't keep showing it
      const timer = setTimeout(() => {
        setSearchParams({}, { replace: true });
      }, 10000);
      return () => clearTimeout(timer);
    }
  }, [isRecoveryMode, setSearchParams]);

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

  // Get current game state from Zustand (already rehydrated from IndexedDB)
  const currentSeason = useGameStore(s => s.currentSeason);
  const currentPhase = useGameStore(s => s.currentPhase);
  const currentDate = useGameStore(s => s.currentDate);
  const userTeamId = useTeamStore(s => s.userTeamId);
  const teams = useTeamStore(s => s.teams);
  const standings = useLeagueStore(s => s.standings);

  const userTeam = teams[userTeamId];
  const hasSave = !!userTeamId && !!userTeam;

  useEffect(() => {
    // Ensure auth is initialized (important for OAuth redirects)
    const initAuth = useAuthStore.getState().initAuth;
    if (initAuth) {
      initAuth();
    }

    loadSaves();
    SaveGameManager.migrateLegacySave().then(result => {
      if (result.migrated) loadSaves();
    });
  }, []);

  // Load cloud saves when user logs in
  useEffect(() => {
    if (isLoggedIn) {
      loadCloudSaves();
    } else {
      setCloudSaves([]);
    }
  }, [isLoggedIn]);

  const loadSaves = async () => {
    const allSaves = await SaveGameManager.listSaves();
    setSaves(allSaves);
  };

  const loadCloudSaves = async () => {
    setLoadingCloudSaves(true);
    try {
      const cloudData = await SaveGameManager.downloadFromCloud();
      setCloudSaves(cloudData);
    } catch (error) {
      console.error('Error loading cloud saves:', error);
    } finally {
      setLoadingCloudSaves(false);
    }
  };

  const handleUploadSaveToCloud = async (e, saveId, saveLabel) => {
    e.stopPropagation();
    setUploadingSaveId(saveId);
    setResult(null);
    try {
      const uploadResult = await SaveGameManager.uploadToCloud(saveId);
      if (uploadResult.success) {
        setResult({ success: true, message: `"${saveLabel}" uploaded to cloud` });
        loadCloudSaves();
      } else {
        setResult({ success: false, message: uploadResult.error || 'Upload failed' });
      }
    } catch (error) {
      setResult({ success: false, message: 'Upload failed' });
    } finally {
      setUploadingSaveId(null);
      setTimeout(() => setResult(null), 3000);
    }
  };

  const handleSyncFromCloud = async () => {
    setLoadingCloudSaves(true);
    setResult(null);
    try {
      // Get cloud saves that don't exist locally
      const cloudData = await SaveGameManager.downloadFromCloud();
      const localSaveIds = new Set(saves.map(s => s.id));
      const newCloudSaves = cloudData.filter(cs => !localSaveIds.has(cs.id));

      if (newCloudSaves.length === 0) {
        setResult({ success: true, message: 'All cloud saves already downloaded' });
        setLoadingCloudSaves(false);
        setTimeout(() => setResult(null), 3000);
        return;
      }

      // Download each new cloud save
      let downloaded = 0;
      for (const cloudSave of newCloudSaves) {
        const downloadResult = await SaveGameManager.downloadCloudSave(cloudSave.id);
        if (downloadResult.success) downloaded++;
      }

      setResult({ success: true, message: `Downloaded ${downloaded} save${downloaded !== 1 ? 's' : ''} from cloud` });
      loadSaves();
      loadCloudSaves();
    } catch (error) {
      setResult({ success: false, message: 'Sync from cloud failed' });
    } finally {
      setLoadingCloudSaves(false);
      setTimeout(() => setResult(null), 3000);
    }
  };

  const handleDownloadCloudSave = async (cloudSaveId) => {
    setLoading(true);
    setResult(null);
    try {
      const downloadResult = await SaveGameManager.downloadCloudSave(cloudSaveId);
      if (downloadResult.success) {
        // Load the downloaded save
        const loadResult = await SaveGameManager.loadSave(downloadResult.saveId, stores);
        if (loadResult.success) {
          setResult({ success: true, message: 'Cloud save loaded!' });
          setTimeout(() => navigateToGame(), 800);
        } else {
          setResult({ success: false, message: loadResult.error || 'Failed to load save' });
          setLoading(false);
        }
      } else {
        setResult({ success: false, message: downloadResult.error || 'Failed to download' });
        setLoading(false);
      }
    } catch (error) {
      setResult({ success: false, message: 'Download failed' });
      setLoading(false);
    }
  };

  const getPosition = () => {
    if (!standings?.length || !userTeamId) return null;
    const sorted = [...standings].sort((a, b) =>
      b.points !== a.points ? b.points - a.points : b.netRunRate - a.netRunRate
    );
    const pos = sorted.findIndex(s => s.clubId === userTeamId);
    return pos >= 0 ? pos + 1 : null;
  };

  const getUserStats = () => {
    if (!standings?.length || !userTeamId) return null;
    return standings.find(s => s.clubId === userTeamId);
  };

  const navigateToGame = () => {
    const auctionState = useAuctionStore.getState();
    if (auctionState.auctionState === 'in_progress') {
      navigate('/game/auction');
      return;
    }

    const controller = new GameController({
      gameStore: useGameStore.getState(),
      leagueStore: useLeagueStore.getState(),
      teamStore: useTeamStore.getState(),
      playerStore: usePlayerStore.getState(),
      matchStore: useMatchStore.getState(),
      auctionStore: useAuctionStore.getState()
    });

    const nextEvent = controller.getNextEvent();
    switch (nextEvent.type) {
      case 'team_selection': navigate('/team-selection'); break;
      case 'auction': navigate('/game/auction'); break;
      case 'match':
      case 'playoff_match': navigate('/game/match', { state: { matchData: nextEvent.data } }); break;
      default: navigate('/game/home');
    }
  };

  const handleContinue = () => {
    setLoading(true);
    setTimeout(() => navigateToGame(), 300);
  };

  const handleLoadSave = async (saveId) => {
    setLoading(true);
    setResult(null);
    try {
      const loadResult = await SaveGameManager.loadSave(saveId, stores);
      if (loadResult.success) {
        setResult({ success: true, message: 'Save loaded!' });
        setTimeout(() => navigateToGame(), 800);
      } else {
        setResult({ success: false, message: loadResult.error || 'Failed to load save.' });
        setLoading(false);
      }
    } catch (error) {
      setResult({ success: false, message: 'Failed to load save.' });
      setLoading(false);
    }
  };

  const handleDeleteSave = async (e, saveId, label) => {
    e.stopPropagation();
    if (confirm(`Delete "${label}"?`)) {
      await SaveGameManager.deleteSave(saveId);
      loadSaves();
      setResult({ success: true, message: 'Deleted.' });
      setTimeout(() => setResult(null), 1500);
    }
  };

  const handleExportSave = async (e, saveId) => {
    e.stopPropagation();
    const success = await SaveGameManager.exportSave(saveId);
    if (success) {
      setResult({ success: true, message: 'Exported!' });
      setTimeout(() => setResult(null), 1500);
    }
  };

  const handleDeleteAll = async () => {
    if (confirm('Delete ALL saves? This cannot be undone.')) {
      await SaveGameManager.deleteAllSaves();
      const { clearAll } = await import('../../utils/indexedDBStorage');
      await clearAll();
      window.location.reload();
    }
  };

  const handleImportClick = () => fileInputRef.current?.click();

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    setImporting(true);
    setResult(null);
    try {
      const importResult = await SaveGameManager.importSave(file);
      if (importResult.success) {
        const loadResult = await SaveGameManager.loadSave(importResult.saveId, stores);
        if (loadResult.success) {
          setResult({ success: true, message: `Imported!` });
          loadSaves();
          setTimeout(() => navigateToGame(), 1000);
        } else {
          setResult({ success: false, message: 'Import failed to load.' });
        }
      } else {
        setResult({ success: false, message: importResult.error });
      }
    } catch {
      setResult({ success: false, message: 'Import failed.' });
    } finally {
      setImporting(false);
    }
  };

  const formatInGameDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return '-';
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    if (diffMins < 1) return 'now';
    if (diffMins < 60) return `${diffMins}m`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays < 7) return `${diffDays}d`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  // Compact Save Tile - Click to load
  const SaveTile = ({ save, onClick, onDelete, onExport, onUploadToCloud, isUploading = false, isCurrent = false, isHighlighted = false }) => {
    const meta = save?.metadata || {};
    // Use teamId from metadata for checkpoint saves, current userTeamId for current session
    const teamId = isCurrent ? userTeamId : (meta.userTeamId || userTeamId);
    const teamName = isCurrent ? userTeam?.name : (meta.userTeamName || 'Unknown');
    const position = isCurrent ? getPosition() : meta.position;
    const season = isCurrent ? currentSeason : meta.season;
    const phase = isCurrent ? currentPhase : meta.phase;
    const inGameDate = isCurrent ? currentDate : meta.inGameDate;
    const timestamp = save?.timestamp || meta.savedAt;
    const stats = isCurrent ? getUserStats() : meta;
    const label = save?.label || (isCurrent ? 'Current Session' : '');
    const isAutosave = save?.type === 'autosave';

    // Format season display: "S1" not "S1 lea"
    const seasonDisplay = season ? `S${season}` : '-';

    return (
      <div
        onClick={onClick}
        className={`
          group flex items-center gap-3 px-3 py-2.5 rounded cursor-pointer
          transition-all duration-150
          bg-black/40 border backdrop-blur-sm
          hover:bg-green-900/20 hover:border-green-500/60
          ${isCurrent
            ? 'border-cricket-accent/50'
            : isHighlighted
              ? 'border-yellow-500/70 ring-1 ring-yellow-500/30'
              : 'border-gray-600/50'
          }
        `}
      >
        {/* Team Badge - Fixed width */}
        <div className="w-8 flex-shrink-0 flex justify-center">
          <img
            src={getTeamBadge(teamId)}
            alt={teamName}
            className="w-7 h-7 object-contain"
          />
        </div>

        {/* Team & Label - Flex grow */}
        <div className="w-44 flex-shrink-0 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-cricket-text-primary text-sm truncate">
              {teamName}
            </span>
            {isCurrent && (
              <span className="text-[9px] bg-cricket-accent/40 text-cricket-accent px-1 py-0.5 rounded font-bold uppercase">
                Current
              </span>
            )}
            {isAutosave && !isCurrent && (
              <span className="text-[9px] bg-blue-500/30 text-blue-400 px-1 py-0.5 rounded uppercase">
                Auto
              </span>
            )}
          </div>
          <p className="text-[11px] text-cricket-text-secondary truncate">
            {label}
          </p>
        </div>

        {/* Position - Fixed width */}
        <div className="w-12 flex-shrink-0 text-center">
          {position ? (
            <span className="flex items-center justify-center gap-0.5 text-trophy-gold">
              <Trophy className="w-3 h-3" />
              <span className="text-xs font-bold">#{position}</span>
            </span>
          ) : (
            <span className="text-xs text-cricket-text-secondary">-</span>
          )}
        </div>

        {/* Season - Fixed width */}
        <div className="w-10 flex-shrink-0 text-center">
          <span className="text-xs text-cricket-text-secondary">{seasonDisplay}</span>
        </div>

        {/* Record - Fixed width */}
        <div className="w-14 flex-shrink-0 text-center">
          {(stats?.won !== undefined && stats?.lost !== undefined) ? (
            <span className="text-xs text-green-400">{stats.won}W-{stats.lost}L</span>
          ) : (
            <span className="text-xs text-cricket-text-secondary">-</span>
          )}
        </div>

        {/* In-game Date - Fixed width */}
        <div className="w-14 flex-shrink-0 text-center">
          <span className="text-xs text-cricket-text-secondary">{formatInGameDate(inGameDate)}</span>
        </div>

        {/* Real Time - Fixed width */}
        <div className="w-12 flex-shrink-0 text-right">
          <span className="text-xs text-cricket-text-secondary/70">{formatTimestamp(timestamp)}</span>
        </div>

        {/* Actions - Fixed width, always visible */}
        <div className="w-28 flex-shrink-0 flex items-center justify-end gap-1.5">
          {!isCurrent && onUploadToCloud && (
            <button
              onClick={(e) => onUploadToCloud(e, save.id, save.label)}
              disabled={isUploading}
              className="p-1.5 bg-blue-500/20 hover:bg-blue-500/40 rounded transition-colors"
              title="Upload to cloud"
            >
              {isUploading ? (
                <RefreshCw className="w-4 h-4 text-blue-400 animate-spin" />
              ) : (
                <svg className="w-4 h-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
              )}
            </button>
          )}
          {!isCurrent && onExport && (
            <button
              onClick={(e) => onExport(e, save.id)}
              className="p-1.5 bg-green-500/20 hover:bg-green-500/40 rounded transition-colors"
              title="Download to file"
            >
              <Download className="w-4 h-4 text-green-400" />
            </button>
          )}
          {!isCurrent && onDelete && (
            <button
              onClick={(e) => onDelete(e, save.id, save.label)}
              className="p-1.5 bg-red-500/20 hover:bg-red-500/40 rounded transition-colors"
              title="Delete"
            >
              <Trash2 className="w-4 h-4 text-red-400" />
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen app-wallpaper p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <button onClick={() => navigate('/')} className="btn-secondary flex items-center gap-2 text-sm">
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
          <h1 className="text-xl font-bold text-cricket-text-primary">Career Saves</h1>
          <button onClick={loadSaves} className="btn-secondary p-2" title="Refresh">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {/* Auth Section */}
        <AuthSection onSignInClick={() => setShowAuthModal(true)} />

        {/* Recovery Mode Banner */}
        {isRecoveryMode && (
          <div className="mb-3 px-4 py-3 rounded-lg bg-yellow-900/30 border border-yellow-600/50 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-yellow-400 font-semibold text-sm">Career State Reset Detected</p>
              <p className="text-yellow-200/80 text-xs mt-1">
                Your career state was reset, possibly due to a page refresh or browser data clearing.
                Load your most recent save below to continue where you left off.
              </p>
            </div>
          </div>
        )}

        {/* Result Message */}
        {result && (
          <div className={`mb-3 px-3 py-2 rounded flex items-center gap-2 text-sm ${
            result.success
              ? 'bg-green-900/30 border border-green-700/50 text-green-400'
              : 'bg-red-900/30 border border-red-700/50 text-red-400'
          }`}>
            {result.success ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            <span>{result.message}</span>
          </div>
        )}

        {hasSave ? (
          <div className="space-y-2">
            {/* Column Headers - Matching tile structure */}
            <div className="flex items-center gap-3 px-3 py-1 text-[10px] text-cricket-text-secondary uppercase tracking-wider">
              <div className="w-8 flex-shrink-0" /> {/* Badge */}
              <div className="w-44 flex-shrink-0">Team / Save</div>
              <div className="w-12 flex-shrink-0 text-center">Pos</div>
              <div className="w-10 flex-shrink-0 text-center">Season</div>
              <div className="w-14 flex-shrink-0 text-center">Record</div>
              <div className="w-14 flex-shrink-0 text-center">Career Date</div>
              <div className="w-12 flex-shrink-0 text-right">Saved</div>
              <div className="w-28 flex-shrink-0 text-right">Actions</div>
            </div>

            {/* Checkpoints */}
            {saves.length > 0 && (
              <>
                <div className="text-[10px] text-cricket-text-secondary uppercase tracking-wider px-3 pt-3">
                  Checkpoints ({saves.length})
                  {isRecoveryMode && (
                    <span className="ml-2 text-yellow-400 normal-case">← Load your most recent save</span>
                  )}
                </div>
                {saves.map((save, index) => (
                  <SaveTile
                    key={save.id}
                    save={save}
                    onClick={() => handleLoadSave(save.id)}
                    onDelete={handleDeleteSave}
                    onExport={handleExportSave}
                    onUploadToCloud={isLoggedIn ? handleUploadSaveToCloud : null}
                    isUploading={uploadingSaveId === save.id}
                    isHighlighted={isRecoveryMode && index === 0}
                  />
                ))}
              </>
            )}

            {/* Cloud Saves Section (when logged in) */}
            {isLoggedIn && (
              <>
                <div className="text-[10px] text-cricket-text-secondary uppercase tracking-wider px-3 pt-4 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
                    </svg>
                    <span>Cloud Saves {cloudSaves.length > 0 && `(${cloudSaves.length})`}</span>
                  </div>
                  {loadingCloudSaves && (
                    <span className="text-cricket-accent">Loading...</span>
                  )}
                </div>
                {cloudSaves.length > 0 ? (
                  <div className="space-y-1.5 mt-1.5">
                    {cloudSaves.map(cloudSave => {
                      const existsLocally = saves.some(s => s.id === cloudSave.id);
                      const meta = cloudSave.metadata || {};
                      return (
                        <div
                          key={cloudSave.id}
                          onClick={() => !existsLocally && handleDownloadCloudSave(cloudSave.id)}
                          className={`
                            flex items-center gap-3 px-3 py-2.5 rounded
                            bg-blue-900/20 border border-blue-600/30
                            transition-all duration-150
                            ${existsLocally
                              ? 'opacity-50 cursor-default'
                              : 'cursor-pointer hover:bg-green-900/20 hover:border-green-500/60'}
                          `}
                        >
                          {/* Team Badge */}
                          <div className="w-8 flex-shrink-0 flex justify-center">
                            <img
                              src={getTeamBadge(meta.userTeamId)}
                              alt={meta.userTeamName || 'Team'}
                              className="w-7 h-7 object-contain"
                            />
                          </div>

                          {/* Team & Label */}
                          <div className="w-44 flex-shrink-0 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="font-semibold text-cricket-text-primary text-sm truncate">
                                {meta.userTeamName || 'Unknown'}
                              </span>
                              <span className="text-[9px] bg-blue-500/30 text-blue-400 px-1 py-0.5 rounded uppercase">
                                Cloud
                              </span>
                              {existsLocally && (
                                <span className="text-[9px] bg-gray-500/30 text-gray-400 px-1 py-0.5 rounded">
                                  Local
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-cricket-text-secondary truncate">
                              {cloudSave.label}
                            </p>
                          </div>

                          {/* Position */}
                          <div className="w-12 flex-shrink-0 text-center">
                            {meta.position ? (
                              <span className="flex items-center justify-center gap-0.5 text-trophy-gold">
                                <Trophy className="w-3 h-3" />
                                <span className="text-xs font-bold">#{meta.position}</span>
                              </span>
                            ) : (
                              <span className="text-xs text-cricket-text-secondary">-</span>
                            )}
                          </div>

                          {/* Season */}
                          <div className="w-10 flex-shrink-0 text-center">
                            <span className="text-xs text-cricket-text-secondary">
                              {meta.season ? `S${meta.season}` : '-'}
                            </span>
                          </div>

                          {/* Record */}
                          <div className="w-14 flex-shrink-0 text-center">
                            {(meta.won !== undefined && meta.lost !== undefined) ? (
                              <span className="text-xs text-green-400">{meta.won}W-{meta.lost}L</span>
                            ) : (
                              <span className="text-xs text-cricket-text-secondary">-</span>
                            )}
                          </div>

                          {/* In-game Date */}
                          <div className="w-14 flex-shrink-0 text-center">
                            <span className="text-xs text-cricket-text-secondary">
                              {formatInGameDate(meta.inGameDate)}
                            </span>
                          </div>

                          {/* Real Time */}
                          <div className="w-12 flex-shrink-0 text-right">
                            <span className="text-xs text-cricket-text-secondary/70">
                              {formatTimestamp(cloudSave.updated_at)}
                            </span>
                          </div>

                          {/* Actions */}
                          <div className="w-28 flex-shrink-0 flex items-center justify-end gap-1.5">
                            {!existsLocally && (
                              <button
                                onClick={(e) => { e.stopPropagation(); handleDownloadCloudSave(cloudSave.id); }}
                                className="p-1.5 bg-blue-500/20 hover:bg-blue-500/40 rounded transition-colors"
                                title="Download from cloud"
                              >
                                <svg className="w-4 h-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                                </svg>
                              </button>
                            )}
                            <button
                              onClick={async (e) => {
                                e.stopPropagation();
                                if (confirm(`Delete "${cloudSave.label}" from cloud?`)) {
                                  const result = await SaveGameManager.deleteFromCloud(cloudSave.id);
                                  if (result.success) {
                                    setResult({ success: true, message: 'Deleted from cloud' });
                                    loadCloudSaves();
                                  } else {
                                    setResult({ success: false, message: result.error || 'Delete failed' });
                                  }
                                  setTimeout(() => setResult(null), 2000);
                                }
                              }}
                              className="p-1.5 bg-red-500/20 hover:bg-red-500/40 rounded transition-colors"
                              title="Delete from cloud"
                            >
                              <Trash2 className="w-4 h-4 text-red-400" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : !loadingCloudSaves && (
                  <p className="text-xs text-cricket-text-secondary/70 px-3 py-2">No cloud saves found</p>
                )}
              </>
            )}

            {/* Actions Row */}
            <div className="flex items-center justify-between pt-4 border-t border-gray-700/50">
              <div className="flex gap-2">
                <button
                  onClick={handleImportClick}
                  disabled={importing}
                  className="btn-secondary flex items-center gap-1.5 text-sm px-3 py-1.5"
                >
                  <Upload className="w-3.5 h-3.5" /> {importing ? 'Importing...' : 'Import'}
                </button>
                {isLoggedIn && (
                  <button
                    onClick={handleSyncFromCloud}
                    disabled={loadingCloudSaves}
                    className="btn-secondary flex items-center gap-1.5 text-sm px-3 py-1.5"
                    title="Download saves from cloud that aren't stored locally"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                    </svg>
                    {loadingCloudSaves ? 'Syncing...' : 'Sync from Cloud'}
                  </button>
                )}
              </div>
              {saves.length > 0 && (
                <button
                  onClick={handleDeleteAll}
                  className="text-xs text-red-400/70 hover:text-red-400 transition-colors"
                >
                  Delete All
                </button>
              )}
            </div>
          </div>
        ) : (
          /* No existing save */
          <div className="bg-black/40 border border-gray-600/50 rounded-lg p-8 text-center">
            <AlertCircle className="w-12 h-12 text-cricket-text-secondary mx-auto mb-3 opacity-50" />
            <h3 className="text-lg font-semibold text-cricket-text-primary mb-1">No Saved Career</h3>
            <p className="text-cricket-text-secondary text-sm mb-4">Start a new career or import a save.</p>
            <div className="flex flex-col gap-2 max-w-xs mx-auto">
              <button
                onClick={() => navigate('/team-selection')}
                className="btn-primary flex items-center justify-center gap-2"
              >
                <Play className="w-4 h-4" /> New Career
              </button>
              <button
                onClick={handleImportClick}
                disabled={importing}
                className="btn-secondary flex items-center justify-center gap-2"
              >
                <Upload className="w-4 h-4" /> {importing ? 'Importing...' : 'Import Save'}
              </button>
            </div>
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept=".cm25"
          onChange={handleFileSelect}
          className="hidden"
        />

        {(loading || importing) && (
          <LoadingScreen
            message={loading ? "Loading Career" : "Importing Save"}
            submessage={loading ? "Preparing..." : "Reading file..."}
          />
        )}

        {/* Auth Modal */}
        <AuthModal
          isOpen={showAuthModal}
          onClose={() => setShowAuthModal(false)}
        />
      </div>
    </div>
  );
};

export default LoadGame;
