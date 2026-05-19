/**
 * @file DatabaseExportModal.jsx
 * @description Modal for exporting the player database.
 * Users can choose between full database export or customizations only.
 */

import React, { useState, useEffect } from 'react';
import { X, Download, Database, FileJson, Users, Edit3 } from 'lucide-react';
import usePlayerStore from '../../stores/playerStore';
import customDatabaseManager from '../../utils/CustomDatabaseManager';

const DatabaseExportModal = ({ isOpen, onClose }) => {
  const { players } = usePlayerStore();

  const [exportFormat, setExportFormat] = useState('full');
  const [isExporting, setIsExporting] = useState(false);
  const [stats, setStats] = useState({
    totalPlayers: 0,
    modifiedPlayers: 0,
    customPlayers: 0
  });

  // Load stats when modal opens
  useEffect(() => {
    if (isOpen) {
      loadStats();
    }
  }, [isOpen, players]);

  const loadStats = async () => {
    try {
      const status = await customDatabaseManager.getCustomizationStatus();
      setStats({
        totalPlayers: Object.keys(players).length,
        modifiedPlayers: status.modifiedCount,
        customPlayers: status.customPlayerCount
      });
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      await customDatabaseManager.exportDatabase(exportFormat, players);
      onClose();
    } catch (error) {
      console.error('Export failed:', error);
      alert('Export failed: ' + error.message);
    } finally {
      setIsExporting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[200] p-4">
      <div className="bg-black/85 backdrop-blur-md border border-border-primary rounded-lg shadow-xl max-w-md w-full">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border-primary">
          <div className="flex items-center gap-2">
            <Download className="w-5 h-5 text-cricket-accent" />
            <h2 className="text-lg font-semibold text-text-primary">
              Export Database
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-bg-tertiary rounded transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5 text-text-secondary" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Stats */}
          <div className="grid grid-cols-3 gap-3">
            <div className="card p-3 text-center">
              <Users className="w-5 h-5 text-blue-400 mx-auto mb-1" />
              <div className="text-lg font-bold text-text-primary">{stats.totalPlayers}</div>
              <div className="text-xs text-text-secondary">Total Players</div>
            </div>
            <div className="card p-3 text-center">
              <Edit3 className="w-5 h-5 text-yellow-400 mx-auto mb-1" />
              <div className="text-lg font-bold text-text-primary">{stats.modifiedPlayers}</div>
              <div className="text-xs text-text-secondary">Modified</div>
            </div>
            <div className="card p-3 text-center">
              <Database className="w-5 h-5 text-purple-400 mx-auto mb-1" />
              <div className="text-lg font-bold text-text-primary">{stats.customPlayers}</div>
              <div className="text-xs text-text-secondary">Custom</div>
            </div>
          </div>

          {/* Format Selection */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-text-primary">Export Format</label>

            {/* Full Database Option */}
            <label
              className={`block p-3 rounded border cursor-pointer transition-colors ${
                exportFormat === 'full'
                  ? 'border-cricket-accent bg-cricket-accent/10'
                  : 'border-border-primary hover:border-text-secondary'
              }`}
            >
              <div className="flex items-start gap-3">
                <input
                  type="radio"
                  name="exportFormat"
                  value="full"
                  checked={exportFormat === 'full'}
                  onChange={(e) => setExportFormat(e.target.value)}
                  className="mt-1"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <FileJson className="w-4 h-4 text-blue-400" />
                    <span className="font-medium text-text-primary">Full Database</span>
                  </div>
                  <p className="text-xs text-text-secondary mt-1">
                    Export all {stats.totalPlayers} players including modifications.
                    Larger file size (~2MB). Best for complete backup or sharing.
                  </p>
                </div>
              </div>
            </label>

            {/* Patches Only Option */}
            <label
              className={`block p-3 rounded border cursor-pointer transition-colors ${
                exportFormat === 'patch'
                  ? 'border-cricket-accent bg-cricket-accent/10'
                  : 'border-border-primary hover:border-text-secondary'
              } ${stats.modifiedPlayers === 0 && stats.customPlayers === 0 ? 'opacity-50' : ''}`}
            >
              <div className="flex items-start gap-3">
                <input
                  type="radio"
                  name="exportFormat"
                  value="patch"
                  checked={exportFormat === 'patch'}
                  onChange={(e) => setExportFormat(e.target.value)}
                  disabled={stats.modifiedPlayers === 0 && stats.customPlayers === 0}
                  className="mt-1"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Edit3 className="w-4 h-4 text-yellow-400" />
                    <span className="font-medium text-text-primary">Customizations Only</span>
                  </div>
                  <p className="text-xs text-text-secondary mt-1">
                    Export only your modifications ({stats.modifiedPlayers} modified + {stats.customPlayers} custom).
                    Smaller file size. Best for sharing edits.
                  </p>
                  {stats.modifiedPlayers === 0 && stats.customPlayers === 0 && (
                    <p className="text-xs text-yellow-400 mt-1">
                      No customizations to export.
                    </p>
                  )}
                </div>
              </div>
            </label>
          </div>

          {/* Info */}
          <div className="text-xs text-text-secondary bg-bg-tertiary rounded p-3">
            <p>
              Exported files use the <code className="text-cricket-accent">.cm25db</code> format (JSON).
              You can edit these files in any text editor and re-import them.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-border-primary">
          <button
            onClick={onClose}
            className="btn-secondary px-4 py-1.5 text-sm"
            disabled={isExporting}
          >
            Cancel
          </button>
          <button
            onClick={handleExport}
            disabled={isExporting}
            className="btn-primary px-4 py-1.5 text-sm flex items-center gap-2 disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            {isExporting ? 'Exporting...' : 'Export'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DatabaseExportModal;
