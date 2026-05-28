/**
 * @file SkinImportModal.jsx
 * @description File picker + drag-drop for .cm25skin packs. Validates and
 * installs the skin into the library on success.
 */

import React, { useRef, useState, useCallback } from 'react';
import { X, Upload, AlertCircle, Check, Loader } from 'lucide-react';
import { importSkinPack } from '../../utils/SkinManager';

const SkinImportModal = ({ onClose, onImported }) => {
  const inputRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [dragOver, setDragOver] = useState(false);

  const handleFile = useCallback(async (file) => {
    if (!file) return;
    setBusy(true); setError(null); setSuccess(null);
    const result = await importSkinPack(file);
    if (!result.success) {
      setError(result.error);
      setBusy(false);
      return;
    }
    setSuccess(`Installed: ${result.skinId}`);
    setBusy(false);
    if (onImported) onImported(result.skinId);
    setTimeout(() => onClose(), 900);
  }, [onClose, onImported]);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  }, [handleFile]);

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-bg-secondary border border-border-primary rounded-lg shadow-2xl">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border-primary">
          <h2 className="text-sm font-semibold text-text-primary">Import Skin</h2>
          <button onClick={onClose} className="text-text-tertiary hover:text-text-primary">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-3">
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => inputRef.current?.click()}
            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
              dragOver
                ? 'border-cricket-accent bg-cricket-accent/5'
                : 'border-border-primary hover:border-cricket-accent/50 hover:bg-bg-primary'
            }`}
          >
            {busy ? (
              <>
                <Loader className="w-8 h-8 mx-auto mb-2 text-cricket-accent animate-spin" />
                <p className="text-xs text-text-secondary">Installing…</p>
              </>
            ) : (
              <>
                <Upload className="w-8 h-8 mx-auto mb-2 text-text-tertiary" />
                <p className="text-xs text-text-primary font-medium">Drop a .cm25skin file here</p>
                <p className="text-xxs text-text-tertiary mt-1">or click to browse</p>
              </>
            )}
            <input
              ref={inputRef}
              type="file"
              accept=".cm25skin"
              className="hidden"
              onChange={(e) => handleFile(e.target.files?.[0])}
            />
          </div>

          {error && (
            <div className="text-xxs text-red-400 flex items-start gap-1.5 bg-red-500/10 border border-red-500/20 rounded px-2 py-1.5">
              <AlertCircle className="w-3 h-3 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}
          {success && (
            <div className="text-xxs text-green-400 flex items-start gap-1.5 bg-green-500/10 border border-green-500/20 rounded px-2 py-1.5">
              <Check className="w-3 h-3 flex-shrink-0 mt-0.5" />
              <span>{success}</span>
            </div>
          )}

          <p className="text-[10px] text-text-tertiary">
            Max 5 MB per skin. SVG files are sanitized to block script vectors. Skins are local to this device.
          </p>
        </div>
      </div>
    </div>
  );
};

export default SkinImportModal;
