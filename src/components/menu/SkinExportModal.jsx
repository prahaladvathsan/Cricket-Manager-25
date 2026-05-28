/**
 * @file SkinExportModal.jsx
 * @description Modal triggered from ClubEditorScreen. Collects skin metadata,
 * generates a preview from the live kit-card via canvas, packages all current
 * customizations + global assets into a .cm25skin file, and triggers download.
 */

import React, { useState } from 'react';
import { X, Download, AlertCircle, Loader } from 'lucide-react';
import {
  buildSkinPackFromCustomClubs,
  exportSkinPack
} from '../../utils/SkinManager';
import { validateSkinPack } from '../../data/schemas/skinSchema';

const SkinExportModal = ({ customClubs, globalCosmetics, previewElementId, onClose }) => {
  const [name, setName] = useState('');
  const [author, setAuthor] = useState('');
  const [description, setDescription] = useState('');
  const [version, setVersion] = useState('1.0.0');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const customCount = Object.keys(customClubs || {}).length;
  const hasGlobal = !!(globalCosmetics?.wallpaperDataUrl || globalCosmetics?.gameLogoLightDataUrl || globalCosmetics?.gameLogoDarkDataUrl);

  const handleExport = async () => {
    if (!name.trim()) { setError('Skin name is required'); return; }
    if (customCount === 0 && !hasGlobal) { setError('Nothing to export — customize at least one team or upload a global asset first'); return; }

    setBusy(true); setError(null);
    try {
      const previewDataUrl = await capturePreview(previewElementId).catch(() => null);
      const pack = buildSkinPackFromCustomClubs({
        customClubs,
        metadata: { name: name.trim(), author: author.trim(), description: description.trim(), version: version.trim() },
        global: globalCosmetics,
        previewDataUrl
      });
      const validation = validateSkinPack(pack);
      if (!validation.valid) {
        setError(validation.reason);
        setBusy(false);
        return;
      }
      await exportSkinPack(pack);
      onClose();
    } catch (err) {
      console.error('Export failed:', err);
      setError(err?.message || 'Export failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-bg-secondary border border-border-primary rounded-lg shadow-2xl">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border-primary">
          <h2 className="text-sm font-semibold text-text-primary">Export as Skin</h2>
          <button onClick={onClose} className="text-text-tertiary hover:text-text-primary">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-3">
          <p className="text-xxs text-text-tertiary">
            Package your customizations into a .cm25skin file. Share it with friends — they can drag it into Skin Manager → Import.
          </p>

          <div className="bg-bg-primary border border-border-primary rounded px-3 py-2 text-xxs">
            <div className="flex items-center justify-between">
              <span className="text-text-tertiary">Teams customized</span>
              <span className="text-text-primary font-mono">{customCount} / 10</span>
            </div>
            <div className="flex items-center justify-between mt-1">
              <span className="text-text-tertiary">Global assets</span>
              <span className="text-text-primary font-mono">{hasGlobal ? 'Included' : 'None'}</span>
            </div>
          </div>

          <Field label="Skin Name *" value={name} onChange={setName} maxLength={60} placeholder="Indian Premier League 2026" />
          <Field label="Author" value={author} onChange={setAuthor} maxLength={40} placeholder="Your name or handle" />
          <Field label="Description" value={description} onChange={setDescription} maxLength={200} placeholder="What this skin re-themes" textarea />
          <Field label="Version" value={version} onChange={setVersion} maxLength={20} placeholder="1.0.0" />

          {error && (
            <div className="text-xxs text-red-400 flex items-start gap-1.5 bg-red-500/10 border border-red-500/20 rounded px-2 py-1.5">
              <AlertCircle className="w-3 h-3 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-border-primary">
          <button onClick={onClose} className="text-xs px-3 py-1.5 rounded text-text-secondary hover:text-text-primary border border-border-primary hover:border-border-secondary transition-colors">
            Cancel
          </button>
          <button
            onClick={handleExport}
            disabled={busy || !name.trim()}
            className="text-xs px-3 py-1.5 rounded bg-cricket-accent text-black font-semibold hover:bg-cricket-accent/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 transition-colors"
          >
            {busy
              ? <><Loader className="w-3.5 h-3.5 animate-spin" /> Exporting…</>
              : <><Download className="w-3.5 h-3.5" /> Download .cm25skin</>
            }
          </button>
        </div>
      </div>
    </div>
  );
};

function Field({ label, value, onChange, maxLength, placeholder, textarea = false }) {
  return (
    <div>
      <label className="text-xxs text-text-tertiary mb-1 block">{label}</label>
      {textarea
        ? <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            maxLength={maxLength}
            placeholder={placeholder}
            rows={2}
            className="w-full bg-bg-tertiary border border-border-primary rounded px-2.5 py-1.5 text-xs text-text-primary placeholder-text-tertiary/50 focus:outline-none focus:border-cricket-accent resize-none"
          />
        : <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            maxLength={maxLength}
            placeholder={placeholder}
            className="w-full bg-bg-tertiary border border-border-primary rounded px-2.5 py-1.5 text-xs text-text-primary placeholder-text-tertiary/50 focus:outline-none focus:border-cricket-accent"
          />
      }
    </div>
  );
}

async function capturePreview(elementId) {
  if (!elementId) return null;
  const el = document.getElementById(elementId);
  if (!el) return null;
  try {
    // Use foreignObject SVG → canvas trick to snapshot a DOM node without
    // pulling in html2canvas. Works for backgrounds, gradients, and images.
    const rect = el.getBoundingClientRect();
    const w = Math.min(rect.width, 360);
    const h = Math.min(rect.height, 460);

    const clone = el.cloneNode(true);
    clone.style.width = `${w}px`;
    clone.style.height = `${h}px`;
    clone.style.transform = 'none';

    const xml = new XMLSerializer().serializeToString(clone);
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
      <foreignObject width="100%" height="100%">
        <div xmlns="http://www.w3.org/1999/xhtml" style="width:${w}px;height:${h}px;">${xml}</div>
      </foreignObject>
    </svg>`;
    const img = new Image();
    const url = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = reject;
      img.src = url;
    });
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    canvas.getContext('2d').drawImage(img, 0, 0, w, h);
    return canvas.toDataURL('image/jpeg', 0.6);
  } catch {
    return null;
  }
}

export default SkinExportModal;
