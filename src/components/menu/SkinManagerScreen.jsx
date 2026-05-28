/**
 * @file SkinManagerScreen.jsx
 * @description Library + apply/delete/export UI for installed skins.
 * Tabs: My Library | Featured | Import. Editor button links to ClubEditorScreen.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Package, Star, Upload, Pencil, Trash2, Check, Download, AlertCircle, Sparkles
} from 'lucide-react';
import {
  listSkins,
  getActiveSkinId,
  activateSkin,
  deleteSkin,
  exportSkinPack,
  getLibrarySizeBytes,
  LIBRARY_WARN_BYTES
} from '../../utils/SkinManager';
import SkinImportModal from './SkinImportModal';

const TABS = [
  { id: 'library', label: 'My Library', icon: Package },
  { id: 'featured', label: 'Featured', icon: Star },
  { id: 'import', label: 'Import', icon: Upload }
];

const SkinManagerScreen = () => {
  const navigate = useNavigate();
  const [tab, setTab] = useState('library');
  const [skins, setSkins] = useState({});
  const [activeId, setActiveId] = useState(null);
  const [showImport, setShowImport] = useState(false);
  const [libraryBytes, setLibraryBytes] = useState(0);
  const [actionError, setActionError] = useState(null);

  const refresh = useCallback(async () => {
    const [s, active, bytes] = await Promise.all([
      listSkins(),
      getActiveSkinId(),
      getLibrarySizeBytes()
    ]);
    setSkins(s);
    setActiveId(active);
    setLibraryBytes(bytes);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const handleApply = async (id) => {
    setActionError(null);
    try {
      await activateSkin(id);
      await refresh();
    } catch (err) {
      setActionError(err?.message || 'Could not apply skin');
    }
  };

  const handleUnapply = async () => {
    setActionError(null);
    try {
      await activateSkin(null);
      await refresh();
    } catch (err) {
      setActionError(err?.message || 'Could not unapply skin');
    }
  };

  const handleDelete = async (id) => {
    setActionError(null);
    if (!confirm('Delete this skin? This cannot be undone.')) return;
    try {
      await deleteSkin(id);
      await refresh();
    } catch (err) {
      setActionError(err?.message || 'Could not delete skin');
    }
  };

  const handleExport = async (skin) => {
    setActionError(null);
    try {
      await exportSkinPack(skin);
    } catch (err) {
      setActionError(err?.message || 'Could not export skin');
    }
  };

  const entries = Object.entries(skins);
  const officialEntries = entries.filter(([, s]) => s.isOfficial);
  const visibleEntries = tab === 'featured' ? officialEntries : entries;

  return (
    <div className="h-screen bg-bg-primary text-text-primary flex flex-col overflow-hidden">

      <div className="flex-none border-b border-border-primary bg-bg-secondary px-5 py-3 flex items-center gap-4">
        <button
          onClick={() => navigate('/')}
          className="text-text-secondary hover:text-text-primary transition-colors flex items-center gap-1.5 text-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
        <div className="w-px h-4 bg-border-primary" />
        <h1 className="text-sm font-semibold text-text-primary flex items-center gap-2">
          <Package className="w-4 h-4 text-cricket-accent" />
          Skin Manager
        </h1>
        <span className="text-xs text-text-tertiary">{entries.length} skin{entries.length === 1 ? '' : 's'} installed</span>

        <button
          onClick={() => navigate('/club-editor')}
          className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded bg-bg-tertiary border border-border-primary text-xs text-text-secondary hover:text-text-primary transition-colors"
        >
          <Pencil className="w-3.5 h-3.5" />
          Customize Teams
        </button>
      </div>

      {/* Tabs */}
      <div className="flex-none border-b border-border-primary bg-bg-secondary px-5 flex gap-1">
        {TABS.map(t => {
          const Icon = t.icon;
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => {
                if (t.id === 'import') { setShowImport(true); return; }
                setTab(t.id);
              }}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs transition-colors border-b-2 -mb-px ${
                active
                  ? 'text-cricket-accent border-cricket-accent'
                  : 'text-text-secondary border-transparent hover:text-text-primary'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Active banner */}
      {activeId && skins[activeId] && (
        <div className="flex-none px-5 py-2 bg-cricket-accent/10 border-b border-cricket-accent/20 flex items-center gap-3 text-xs">
          <Sparkles className="w-3.5 h-3.5 text-cricket-accent" />
          <span className="text-text-primary">
            Active: <strong>{skins[activeId].skin?.name || activeId}</strong>
          </span>
          <button
            onClick={handleUnapply}
            className="ml-auto text-xxs text-text-secondary hover:text-text-primary px-2 py-0.5 rounded hover:bg-bg-primary transition-colors"
          >
            Unapply
          </button>
        </div>
      )}

      {actionError && (
        <div className="flex-none px-5 py-2 bg-red-500/10 border-b border-red-500/20 flex items-center gap-2 text-xxs text-red-400">
          <AlertCircle className="w-3 h-3" />
          {actionError}
          <button onClick={() => setActionError(null)} className="ml-auto text-text-tertiary hover:text-text-primary">×</button>
        </div>
      )}

      {/* Grid */}
      <div className="flex-1 overflow-y-auto p-5">
        {visibleEntries.length === 0 ? (
          <EmptyState tab={tab} onImport={() => setShowImport(true)} onEdit={() => navigate('/club-editor')} />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {visibleEntries.map(([id, skin]) => (
              <SkinCard
                key={id}
                id={id}
                skin={skin}
                isActive={id === activeId}
                onApply={() => handleApply(id)}
                onUnapply={handleUnapply}
                onDelete={() => handleDelete(id)}
                onExport={() => handleExport(skin)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Footer with library size */}
      <div className="flex-none border-t border-border-primary bg-bg-secondary px-5 py-2 text-xxs text-text-tertiary flex items-center gap-3">
        <span>Library size: {(libraryBytes / 1024 / 1024).toFixed(1)} MB</span>
        {libraryBytes > LIBRARY_WARN_BYTES && (
          <span className="text-amber-400 flex items-center gap-1">
            <AlertCircle className="w-3 h-3" />
            Library exceeds 50 MB — consider deleting unused skins
          </span>
        )}
        <span className="ml-auto">User-installed skins are local to this device.</span>
      </div>

      {showImport && (
        <SkinImportModal
          onClose={() => setShowImport(false)}
          onImported={() => { setShowImport(false); refresh(); }}
        />
      )}
    </div>
  );
};

function SkinCard({ id, skin, isActive, onApply, onUnapply, onDelete, onExport }) {
  const meta = skin.skin || {};
  const teamCount = Object.keys(skin.teams || {}).length;
  const hasGlobal = !!(skin.global?.wallpaperDataUrl || skin.global?.gameLogoLightDataUrl || skin.global?.gameLogoDarkDataUrl);

  return (
    <div className={`bg-bg-secondary border rounded-lg overflow-hidden transition-colors ${
      isActive ? 'border-cricket-accent shadow-lg shadow-cricket-accent/10' : 'border-border-primary'
    }`}>
      <div className="relative aspect-[5/3] bg-bg-primary overflow-hidden">
        {meta.previewDataUrl
          ? <img src={meta.previewDataUrl} alt={meta.name} className="w-full h-full object-cover" />
          : <div className="w-full h-full flex items-center justify-center text-text-tertiary text-xxs">
              No preview
            </div>
        }
        {skin.isOfficial && (
          <div className="absolute top-2 left-2 flex items-center gap-1 px-2 py-0.5 rounded-full bg-cricket-accent/90 text-black text-xxs font-semibold">
            <Star className="w-3 h-3" />
            Official
          </div>
        )}
        {isActive && (
          <div className="absolute top-2 right-2 flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-500/90 text-white text-xxs font-semibold">
            <Check className="w-3 h-3" />
            Active
          </div>
        )}
      </div>

      <div className="p-3">
        <h3 className="text-sm font-semibold text-text-primary truncate">{meta.name || id}</h3>
        <p className="text-xxs text-text-tertiary mt-0.5 line-clamp-2 min-h-[2em]">
          {meta.description || 'No description'}
        </p>
        <div className="flex items-center gap-2 mt-2 text-[10px] text-text-tertiary">
          <span>v{meta.version}</span>
          <span>·</span>
          <span>{meta.author || 'Anonymous'}</span>
          <span>·</span>
          <span>{teamCount} team{teamCount === 1 ? '' : 's'}{hasGlobal ? ' · global' : ''}</span>
        </div>

        <div className="flex items-center gap-1 mt-3">
          {isActive ? (
            <button
              onClick={onUnapply}
              className="flex-1 text-xxs px-2 py-1.5 rounded bg-bg-tertiary border border-border-primary text-text-secondary hover:text-text-primary transition-colors"
            >
              Unapply
            </button>
          ) : (
            <button
              onClick={onApply}
              className="flex-1 text-xxs px-2 py-1.5 rounded bg-cricket-accent text-black font-semibold hover:bg-cricket-accent/90 transition-colors"
            >
              Apply
            </button>
          )}
          <button
            onClick={onExport}
            title="Export"
            className="text-xxs p-1.5 rounded border border-border-primary text-text-secondary hover:text-text-primary transition-colors"
          >
            <Download className="w-3 h-3" />
          </button>
          {!skin.isOfficial && (
            <button
              onClick={onDelete}
              title="Delete"
              className="text-xxs p-1.5 rounded border border-border-primary text-text-tertiary hover:text-red-400 transition-colors"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function EmptyState({ tab, onImport, onEdit }) {
  if (tab === 'featured') {
    return (
      <div className="text-center py-16 text-text-tertiary text-sm">
        <Star className="w-10 h-10 mx-auto mb-3 opacity-40" />
        <p>No official skins available yet.</p>
        <p className="text-xxs mt-1">Featured skins ship with the game and appear here on first launch.</p>
      </div>
    );
  }
  return (
    <div className="text-center py-16 text-text-tertiary text-sm">
      <Package className="w-10 h-10 mx-auto mb-3 opacity-40" />
      <p>No skins installed yet.</p>
      <div className="flex items-center justify-center gap-2 mt-4">
        <button
          onClick={onImport}
          className="text-xs px-3 py-1.5 rounded bg-cricket-accent text-black font-semibold hover:bg-cricket-accent/90 transition-colors"
        >
          Import a .cm25skin file
        </button>
        <button
          onClick={onEdit}
          className="text-xs px-3 py-1.5 rounded bg-bg-tertiary border border-border-primary text-text-secondary hover:text-text-primary transition-colors"
        >
          Create your own
        </button>
      </div>
    </div>
  );
}

export default SkinManagerScreen;
