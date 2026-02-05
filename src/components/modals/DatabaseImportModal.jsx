/**
 * @file DatabaseImportModal.jsx
 * @description Modal for importing a player database file.
 * Validates the file and shows a preview before importing.
 */

import React, { useState, useRef } from 'react';
import { X, Upload, FileJson, AlertTriangle, CheckCircle, AlertCircle } from 'lucide-react';
import customDatabaseManager from '../../utils/CustomDatabaseManager';

const DatabaseImportModal = ({ isOpen, onClose, onImportComplete }) => {
  const fileInputRef = useRef(null);

  const [selectedFile, setSelectedFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [isValidating, setIsValidating] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [error, setError] = useState(null);

  // Reset state when modal opens
  React.useEffect(() => {
    if (isOpen) {
      setSelectedFile(null);
      setPreview(null);
      setError(null);
    }
  }, [isOpen]);

  // Handle file selection
  const handleFileSelect = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    setError(null);
    setIsValidating(true);

    try {
      // Read and validate file
      const content = await readFileAsText(file);
      const data = JSON.parse(content);

      // Validate structure
      const validation = customDatabaseManager.validateImport(data);

      if (!validation.valid) {
        setError(validation.error);
        setPreview(null);
      } else {
        setPreview({
          fileName: file.name,
          fileSize: formatFileSize(file.size),
          exportType: data.exportType,
          version: data.version,
          exportedAt: data.exportedAt,
          metadata: data.metadata,
          warnings: validation.warnings,
          patches: data.patches ? Object.keys(data.patches).length : 0,
          newPlayers: data.newPlayers ? Object.keys(data.newPlayers).length : 0,
          players: data.players ? data.players.length : 0
        });
      }
    } catch (err) {
      console.error('File validation error:', err);
      setError('Failed to read file. Make sure it\'s a valid JSON file.');
      setPreview(null);
    } finally {
      setIsValidating(false);
    }
  };

  // Read file as text
  const readFileAsText = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    });
  };

  // Format file size
  const formatFileSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Handle import
  const handleImport = async () => {
    if (!selectedFile) return;

    setIsImporting(true);
    try {
      const result = await customDatabaseManager.importDatabase(selectedFile);

      if (result.success) {
        // Notify parent to reload database
        if (onImportComplete) {
          onImportComplete(result);
        }
        onClose();
      } else {
        setError(result.error);
      }
    } catch (err) {
      console.error('Import error:', err);
      setError('Import failed: ' + err.message);
    } finally {
      setIsImporting(false);
    }
  };

  // Trigger file input click
  const handleBrowseClick = () => {
    fileInputRef.current?.click();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[200] p-4">
      <div className="bg-bg-secondary border border-border-primary rounded-lg shadow-xl max-w-md w-full">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border-primary">
          <div className="flex items-center gap-2">
            <Upload className="w-5 h-5 text-cricket-accent" />
            <h2 className="text-lg font-semibold text-text-primary">
              Import Database
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
          {/* File Input */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".cm25db,.json"
            onChange={handleFileSelect}
            className="hidden"
          />

          {/* Drop Zone / File Selector */}
          <div
            onClick={handleBrowseClick}
            className="border-2 border-dashed border-border-primary rounded-lg p-6 text-center cursor-pointer hover:border-cricket-accent transition-colors"
          >
            {selectedFile ? (
              <div className="flex items-center justify-center gap-2">
                <FileJson className="w-6 h-6 text-cricket-accent" />
                <div>
                  <p className="text-text-primary font-medium">{selectedFile.name}</p>
                  <p className="text-xs text-text-secondary">{formatFileSize(selectedFile.size)}</p>
                </div>
              </div>
            ) : (
              <>
                <Upload className="w-8 h-8 text-text-secondary mx-auto mb-2" />
                <p className="text-text-primary font-medium">Click to select file</p>
                <p className="text-xs text-text-secondary mt-1">
                  Accepts .cm25db or .json files
                </p>
              </>
            )}
          </div>

          {/* Validation Loading */}
          {isValidating && (
            <div className="text-center text-text-secondary text-sm">
              Validating file...
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="flex items-start gap-2 p-3 bg-red-900/20 border border-red-800 rounded">
              <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm text-red-400 font-medium">Invalid File</p>
                <p className="text-xs text-red-300 mt-0.5">{error}</p>
              </div>
            </div>
          )}

          {/* Preview */}
          {preview && (
            <div className="space-y-3">
              {/* Success indicator */}
              <div className="flex items-center gap-2 text-green-400">
                <CheckCircle className="w-5 h-5" />
                <span className="text-sm font-medium">File validated successfully</span>
              </div>

              {/* File details */}
              <div className="card p-3 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-text-secondary">Type:</span>
                  <span className="text-text-primary font-medium capitalize">
                    {preview.exportType === 'full' ? 'Full Database' : 'Patches Only'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-secondary">Version:</span>
                  <span className="text-text-primary font-mono">{preview.version}</span>
                </div>
                {preview.exportedAt && (
                  <div className="flex justify-between">
                    <span className="text-text-secondary">Exported:</span>
                    <span className="text-text-primary">
                      {new Date(preview.exportedAt).toLocaleDateString()}
                    </span>
                  </div>
                )}

                <div className="border-t border-border-primary pt-2 mt-2">
                  {preview.exportType === 'full' ? (
                    <div className="flex justify-between">
                      <span className="text-text-secondary">Players:</span>
                      <span className="text-text-primary font-bold">{preview.players}</span>
                    </div>
                  ) : (
                    <>
                      <div className="flex justify-between">
                        <span className="text-text-secondary">Modified Players:</span>
                        <span className="text-yellow-400 font-bold">{preview.patches}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-text-secondary">Custom Players:</span>
                        <span className="text-purple-400 font-bold">{preview.newPlayers}</span>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Warnings */}
              {preview.warnings && preview.warnings.length > 0 && (
                <div className="space-y-1">
                  {preview.warnings.map((warning, idx) => (
                    <div key={idx} className="flex items-start gap-2 p-2 bg-yellow-900/20 border border-yellow-800 rounded">
                      <AlertCircle className="w-4 h-4 text-yellow-400 flex-shrink-0 mt-0.5" />
                      <p className="text-xs text-yellow-300">{warning}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Import info */}
              <div className="text-xs text-text-secondary bg-bg-tertiary rounded p-2">
                Importing will merge these changes with your existing customizations.
                Existing patches for the same players will be overwritten.
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-border-primary">
          <button
            onClick={onClose}
            className="btn-secondary px-4 py-1.5 text-sm"
            disabled={isImporting}
          >
            Cancel
          </button>
          <button
            onClick={handleImport}
            disabled={!preview || isImporting}
            className="btn-primary px-4 py-1.5 text-sm flex items-center gap-2 disabled:opacity-50"
          >
            <Upload className="w-4 h-4" />
            {isImporting ? 'Importing...' : 'Import'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DatabaseImportModal;
