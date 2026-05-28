/**
 * @file ClubEditorScreen.jsx
 * @description Pre-game club customization screen.
 * 3-column layout: team selector | live preview | editor controls.
 * Now supports badge / icon / banner per-team plus global wallpaper & game logo.
 * "Export as Skin" packages the current state into a .cm25skin file.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Upload, RotateCcw, Save, Check, AlertCircle, Pencil, X, Package, Share2, Image as ImageIcon
} from 'lucide-react';
import wplTeamsData from '../../data/teams/wpl-teams.json';
import { getTeamBadge } from '../../utils/assetHelpers';
import {
  saveCustomClub,
  getCustomClubs,
  deleteCustomClub,
  fileToSafeDataUrl
} from '../../utils/CustomClubManager';
import { get, set } from 'idb-keyval';
import { applyActiveSkinToStores, getActiveSkin } from '../../utils/SkinManager';
import SkinExportModal from './SkinExportModal';

const GLOBAL_KEY = 'cm25-global-cosmetics';

const ClubEditorScreen = () => {
  const navigate = useNavigate();
  const badgeInputRef = useRef(null);
  const iconInputRef = useRef(null);
  const bannerInputRef = useRef(null);
  const wallpaperInputRef = useRef(null);
  const logoLightInputRef = useRef(null);
  const logoDarkInputRef = useRef(null);

  const [customClubs, setCustomClubs] = useState({});
  const [activeSkinTeams, setActiveSkinTeams] = useState({}); // teamId → skin's team override
  const [selectedTeamId, setSelectedTeamId] = useState(null);
  const [primaryColor, setPrimaryColor] = useState('#1a1a2e');
  const [secondaryColor, setSecondaryColor] = useState('#ffffff');
  const [badgeDataUrl, setBadgeDataUrl] = useState(null);
  const [iconDataUrl, setIconDataUrl] = useState(null);
  const [bannerDataUrl, setBannerDataUrl] = useState(null);
  const [teamName, setTeamName] = useState('');
  const [shortName, setShortName] = useState('');
  const [coachName, setCoachName] = useState('');
  const [homeVenue, setHomeVenue] = useState('');
  const [saveStatus, setSaveStatus] = useState(null);
  const [assetError, setAssetError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showExport, setShowExport] = useState(false);

  // Global cosmetics (wallpaper + logos) — used to seed Export-as-Skin.
  const [globalCosmetics, setGlobalCosmetics] = useState({
    wallpaperDataUrl: null,
    gameLogoLightDataUrl: null,
    gameLogoDarkDataUrl: null
  });

  useEffect(() => {
    getCustomClubs().then(clubs => {
      setCustomClubs(clubs);
      setLoading(false);
    });
    getActiveSkin().then(skin => {
      setActiveSkinTeams(skin?.teams || {});
    }).catch(() => {});
    get(GLOBAL_KEY).then((g) => {
      if (g) setGlobalCosmetics({ wallpaperDataUrl: g.wallpaperDataUrl || null, gameLogoLightDataUrl: g.gameLogoLightDataUrl || null, gameLogoDarkDataUrl: g.gameLogoDarkDataUrl || null });
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!selectedTeamId) return;
    const originalTeam = wplTeamsData.find(t => t.id === selectedTeamId);
    const skin = activeSkinTeams[selectedTeamId] || {};
    const custom = customClubs[selectedTeamId];
    // Form inputs hold the USER's tweak only (empty string = no tweak).
    // Color pickers seed from the effective value (custom > skin > WPL) so
    // they reflect what's currently displayed; only changes get saved.
    setPrimaryColor(custom?.primaryColor || skin.primaryColor || originalTeam?.colors?.primary || '#1a1a2e');
    setSecondaryColor(custom?.secondaryColor || skin.secondaryColor || originalTeam?.colors?.secondary || '#ffffff');
    setBadgeDataUrl(custom?.badgeDataUrl || null);
    setIconDataUrl(custom?.iconDataUrl || null);
    setBannerDataUrl(custom?.bannerDataUrl || null);
    setTeamName(custom?.teamName || '');
    setShortName(custom?.shortName || '');
    setCoachName(custom?.coachName || '');
    setHomeVenue(custom?.homeVenue || '');
    setAssetError(null);
    setSaveStatus(null);
  }, [selectedTeamId, customClubs, activeSkinTeams]);

  const selectedTeam = wplTeamsData.find(t => t.id === selectedTeamId);
  const selectedSkin = activeSkinTeams[selectedTeamId] || {};
  const hasCustomization = !!customClubs[selectedTeamId];

  // Effective fallback for display when no user tweak: skin > WPL default.
  const skinName = selectedSkin.teamName || selectedTeam?.name || '';
  const skinShort = selectedSkin.shortName || selectedTeam?.shortName || '';
  const skinCoach = selectedSkin.coachName || selectedTeam?.coachName || '';
  const skinVenue = selectedSkin.homeVenue || selectedTeam?.homeVenue || '';

  const displayName = teamName || skinName;
  const displayShort = shortName || skinShort;
  const displayCoach = coachName || skinCoach;
  const displayVenue = homeVenue || skinVenue;
  // Badge: user tweak > skin badge > WPL bundled file via assetHelpers (which
  // also reads the live teamStore overlay, so skin badge resolves there too).
  const displayBadge = badgeDataUrl || selectedSkin.badgeDataUrl || getTeamBadge(selectedTeamId || '');

  const handleAssetUpload = useCallback(async (e, kind, setter) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const { dataUrl, error } = await fileToSafeDataUrl(file, kind);
    if (error) { setAssetError(`${kind}: ${error}`); return; }
    setAssetError(null);
    setter(dataUrl);
    e.target.value = '';
  }, []);

  const handleGlobalUpload = useCallback(async (e, key, kind) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const { dataUrl, error } = await fileToSafeDataUrl(file, kind);
    if (error) { setAssetError(`${kind}: ${error}`); return; }
    setAssetError(null);
    const next = { ...globalCosmetics, [key]: dataUrl };
    setGlobalCosmetics(next);
    await set(GLOBAL_KEY, next);
    e.target.value = '';
  }, [globalCosmetics]);

  const handleSave = async () => {
    if (!selectedTeamId) return;
    try {
      await saveCustomClub({
        teamId: selectedTeamId,
        badgeDataUrl,
        iconDataUrl,
        bannerDataUrl,
        primaryColor,
        secondaryColor,
        teamName: teamName.trim() || null,
        shortName: shortName.trim().toUpperCase().slice(0, 3) || null,
        coachName: coachName.trim() || null,
        homeVenue: homeVenue.trim() || null,
      });
      setCustomClubs(await getCustomClubs());
      // Push the change into the live teamStore so any other open screens see it.
      applyActiveSkinToStores().catch(() => {});
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus(null), 2000);
    } catch (err) {
      console.error('Failed to save custom club:', err);
      setSaveStatus('error');
    }
  };

  const handleReset = async () => {
    if (!selectedTeamId) return;
    await deleteCustomClub(selectedTeamId);
    setCustomClubs(await getCustomClubs());
    applyActiveSkinToStores().catch(() => {});
    setSaveStatus(null);
  };

  const removeGlobal = async (key) => {
    const next = { ...globalCosmetics, [key]: null };
    setGlobalCosmetics(next);
    await set(GLOBAL_KEY, next);
  };

  return (
    <div className="h-screen bg-bg-primary text-text-primary flex flex-col overflow-hidden">

      {/* ── Topbar ── */}
      <div className="flex-none border-b border-border-primary bg-bg-secondary px-5 py-3 flex items-center gap-4">
        <button
          onClick={() => navigate('/')}
          className="text-text-secondary hover:text-text-primary transition-colors flex items-center gap-1.5 text-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
        <div className="w-px h-4 bg-border-primary" />
        <h1 className="text-sm font-semibold text-text-primary">Club Customization</h1>
        <span className="text-xs text-text-tertiary">
          Customizations persist across all game saves
        </span>
        <button
          onClick={() => setShowExport(true)}
          className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded bg-cricket-accent/10 border border-cricket-accent/30 text-xs text-cricket-accent hover:bg-cricket-accent/20 transition-colors"
        >
          <Share2 className="w-3.5 h-3.5" />
          Export as Skin
        </button>
        <button
          onClick={() => navigate('/skins')}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-bg-tertiary border border-border-primary text-xs text-text-secondary hover:text-text-primary transition-colors"
        >
          <Package className="w-3.5 h-3.5" />
          Skin Manager
        </button>
      </div>

      {/* ── Body: 3 columns ── */}
      <div className="flex flex-1 overflow-hidden">

        {/* ── Col 1: Team Selector ── */}
        <div className="w-52 flex-none border-r border-border-primary bg-bg-secondary flex flex-col overflow-hidden">
          <div className="px-3 py-2 border-b border-border-primary">
            <p className="text-xs text-text-tertiary font-medium uppercase tracking-wider">Teams</p>
          </div>
          <div className="flex-1 overflow-y-auto p-1.5 space-y-0.5">
            {loading ? (
              <p className="p-3 text-xs text-text-tertiary text-center">Loading…</p>
            ) : wplTeamsData.map(team => {
              const custom = customClubs[team.id];
              const skin = activeSkinTeams[team.id] || {};
              const isSelected = selectedTeamId === team.id;
              const pri = custom?.primaryColor || skin.primaryColor || team.colors?.primary;
              const sec = custom?.secondaryColor || skin.secondaryColor || team.colors?.secondary;
              const displayedName = custom?.teamName || skin.teamName || team.name;
              const displayedShort = custom?.shortName || skin.shortName || team.shortName;
              const displayedBadge = custom?.badgeDataUrl || skin.badgeDataUrl || getTeamBadge(team.id);
              return (
                <button
                  key={team.id}
                  onClick={() => setSelectedTeamId(team.id)}
                  className={`w-full flex items-center gap-2.5 px-2 py-1.5 rounded text-left transition-colors ${
                    isSelected
                      ? 'bg-cricket-primary/20 border border-cricket-accent/40'
                      : 'hover:bg-bg-tertiary border border-transparent'
                  }`}
                >
                  <div
                    className="w-7 h-7 rounded-full flex-shrink-0 overflow-hidden border-2"
                    style={{ borderColor: pri }}
                  >
                    <img
                      src={displayedBadge}
                      alt=""
                      className="w-full h-full object-cover"
                      onError={(e) => { e.target.style.display = 'none'; }}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs font-medium truncate leading-tight ${isSelected ? 'text-cricket-accent' : 'text-text-primary'}`}>
                      {displayedName}
                    </p>
                    <p className="text-xxs text-text-tertiary">{displayedShort}</p>
                  </div>
                  <div className="flex flex-col gap-0.5 flex-shrink-0">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: pri }} />
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: sec }} />
                  </div>
                </button>
              );
            })}
          </div>

          {/* Global Cosmetics block — wallpaper / logos */}
          <div className="flex-none border-t border-border-primary p-3 space-y-2">
            <p className="text-xxs text-text-tertiary font-semibold uppercase tracking-wider">Global Assets</p>
            <GlobalAssetRow
              label="Wallpaper"
              dataUrl={globalCosmetics.wallpaperDataUrl}
              onUpload={(e) => handleGlobalUpload(e, 'wallpaperDataUrl', 'wallpaper')}
              onRemove={() => removeGlobal('wallpaperDataUrl')}
              inputRef={wallpaperInputRef}
              accept="image/png,image/jpeg,image/jpg,image/webp"
            />
            <GlobalAssetRow
              label="Logo (light)"
              dataUrl={globalCosmetics.gameLogoLightDataUrl}
              onUpload={(e) => handleGlobalUpload(e, 'gameLogoLightDataUrl', 'logo')}
              onRemove={() => removeGlobal('gameLogoLightDataUrl')}
              inputRef={logoLightInputRef}
              accept="image/png,image/jpeg,image/svg+xml,image/webp"
            />
            <GlobalAssetRow
              label="Logo (dark)"
              dataUrl={globalCosmetics.gameLogoDarkDataUrl}
              onUpload={(e) => handleGlobalUpload(e, 'gameLogoDarkDataUrl', 'logo')}
              onRemove={() => removeGlobal('gameLogoDarkDataUrl')}
              inputRef={logoDarkInputRef}
              accept="image/png,image/jpeg,image/svg+xml,image/webp"
            />
            <p className="text-xxs text-text-tertiary">Bundled with the skin on export.</p>
          </div>
        </div>

        {/* ── Col 2: Live Preview ── */}
        <div className="flex-1 flex items-center justify-center bg-bg-primary relative overflow-hidden">
          {!selectedTeamId ? (
            <div className="text-center text-text-tertiary">
              <div className="w-20 h-20 rounded-full bg-bg-secondary border border-border-primary flex items-center justify-center mx-auto mb-3">
                <Pencil className="w-8 h-8 opacity-30" />
              </div>
              <p className="text-sm">Select a team to preview</p>
            </div>
          ) : (
            <div id="skin-preview-card" className="relative w-72 rounded-2xl overflow-hidden shadow-2xl border border-white/10" style={{ height: '460px' }}>

              <div className="absolute inset-0">
                <div
                  className="absolute inset-0"
                  style={{
                    background: `linear-gradient(145deg, ${primaryColor} 55%, ${secondaryColor} 55%)`
                  }}
                />
                <div
                  className="absolute inset-0 opacity-10"
                  style={{
                    backgroundImage: `repeating-linear-gradient(
                      -45deg,
                      transparent,
                      transparent 8px,
                      rgba(255,255,255,0.15) 8px,
                      rgba(255,255,255,0.15) 9px
                    )`
                  }}
                />
              </div>

              <div
                className="absolute top-4 left-4 px-2.5 py-1 rounded font-bold text-xs tracking-widest"
                style={{ backgroundColor: secondaryColor + 'cc', color: primaryColor }}
              >
                {displayShort}
              </div>

              {hasCustomization && (
                <div className="absolute top-4 right-4 px-2 py-0.5 rounded-full bg-black/40 text-xxs text-white/70 border border-white/20">
                  Customized
                </div>
              )}

              <div className="absolute left-1/2 -translate-x-1/2" style={{ top: '60px' }}>
                <div
                  className="w-36 h-36 rounded-full border-4 overflow-hidden shadow-xl bg-bg-primary/20 backdrop-blur-sm"
                  style={{ borderColor: secondaryColor }}
                >
                  <img
                    src={displayBadge}
                    alt={displayName}
                    className="w-full h-full object-cover"
                    onError={(e) => { e.target.style.opacity = '0'; }}
                  />
                </div>
              </div>

              <div
                className="absolute bottom-0 left-0 right-0 px-5 py-5"
                style={{ background: `linear-gradient(to top, ${primaryColor}f0 60%, transparent)` }}
              >
                <p
                  className="text-2xl font-black tracking-tight leading-tight"
                  style={{ color: secondaryColor }}
                >
                  {displayName}
                </p>
                <p className="text-xs mt-1 font-medium" style={{ color: secondaryColor + 'aa' }}>
                  {displayVenue}
                </p>
                <p className="text-xs mt-0.5" style={{ color: secondaryColor + '77' }}>
                  Coach: {displayCoach}
                </p>
                <div className="flex items-center gap-2 mt-3">
                  <div className="h-3 flex-1 rounded-full border border-white/20" style={{ backgroundColor: primaryColor }} />
                  <div className="h-3 flex-1 rounded-full border border-white/20" style={{ backgroundColor: secondaryColor }} />
                </div>
                {(iconDataUrl || bannerDataUrl) && (
                  <div className="flex items-center gap-2 mt-3">
                    {iconDataUrl && (
                      <div className="flex items-center gap-1 text-xxs text-white/70">
                        <ImageIcon className="w-3 h-3" /> Icon set
                      </div>
                    )}
                    {bannerDataUrl && (
                      <div className="flex items-center gap-1 text-xxs text-white/70">
                        <ImageIcon className="w-3 h-3" /> Banner set
                      </div>
                    )}
                  </div>
                )}
                {selectedTeam?.perk && (
                  <div
                    className="mt-3 inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xxs font-semibold border"
                    style={{ borderColor: secondaryColor + '44', color: secondaryColor + 'bb', backgroundColor: secondaryColor + '11' }}
                  >
                    ⚡ {selectedTeam.perk.name}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ── Col 3: Editor Controls ── */}
        <div className="w-72 flex-none border-l border-border-primary bg-bg-secondary flex flex-col overflow-hidden">
          {!selectedTeamId ? (
            <div className="flex-1 flex items-center justify-center">
              <p className="text-xs text-text-tertiary text-center px-4">Pick a team on the left to edit</p>
            </div>
          ) : (
            <div className="flex-1 flex flex-col overflow-hidden p-4 gap-3 overflow-y-auto">

              {/* ── Colors ── */}
              <div>
                <p className="text-xs font-semibold text-text-tertiary uppercase tracking-wider mb-2">Kit Colors</p>
                <div className="grid grid-cols-2 gap-2">
                  <div
                    className="relative rounded-lg overflow-hidden cursor-pointer group border-2 border-transparent hover:border-cricket-accent/50 transition-colors"
                    style={{ backgroundColor: primaryColor, height: '56px' }}
                    onClick={() => document.getElementById('picker-primary').click()}
                  >
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex flex-col items-center justify-center">
                      <p className="text-xs font-bold drop-shadow" style={{ color: secondaryColor }}>Primary</p>
                      <p className="text-xxs font-mono drop-shadow mt-0.5 opacity-80" style={{ color: secondaryColor }}>{primaryColor}</p>
                    </div>
                    <input
                      id="picker-primary"
                      type="color"
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      className="absolute opacity-0 w-0 h-0"
                    />
                  </div>
                  <div
                    className="relative rounded-lg overflow-hidden cursor-pointer group border-2 border-transparent hover:border-cricket-accent/50 transition-colors"
                    style={{ backgroundColor: secondaryColor, height: '56px' }}
                    onClick={() => document.getElementById('picker-secondary').click()}
                  >
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex flex-col items-center justify-center">
                      <p className="text-xs font-bold drop-shadow" style={{ color: primaryColor }}>Secondary</p>
                      <p className="text-xxs font-mono drop-shadow mt-0.5 opacity-80" style={{ color: primaryColor }}>{secondaryColor}</p>
                    </div>
                    <input
                      id="picker-secondary"
                      type="color"
                      value={secondaryColor}
                      onChange={(e) => setSecondaryColor(e.target.value)}
                      className="absolute opacity-0 w-0 h-0"
                    />
                  </div>
                </div>
              </div>

              {/* ── Assets: Badge / Icon / Banner ── */}
              <div>
                <p className="text-xs font-semibold text-text-tertiary uppercase tracking-wider mb-2">Assets</p>
                <div className="space-y-1.5">
                  <AssetRow
                    label="Badge"
                    hint="PNG/JPG/SVG · 500KB"
                    dataUrl={badgeDataUrl}
                    onUpload={(e) => handleAssetUpload(e, 'badge', setBadgeDataUrl)}
                    onRemove={() => setBadgeDataUrl(null)}
                    inputRef={badgeInputRef}
                    accept="image/png,image/jpeg,image/jpg,image/svg+xml,image/webp"
                  />
                  <AssetRow
                    label="Icon"
                    hint="PNG/JPG/SVG · 250KB"
                    dataUrl={iconDataUrl}
                    onUpload={(e) => handleAssetUpload(e, 'icon', setIconDataUrl)}
                    onRemove={() => setIconDataUrl(null)}
                    inputRef={iconInputRef}
                    accept="image/png,image/jpeg,image/jpg,image/svg+xml,image/webp"
                  />
                  <AssetRow
                    label="Banner"
                    hint="PNG/JPG/SVG · 500KB"
                    dataUrl={bannerDataUrl}
                    onUpload={(e) => handleAssetUpload(e, 'banner', setBannerDataUrl)}
                    onRemove={() => setBannerDataUrl(null)}
                    inputRef={bannerInputRef}
                    accept="image/png,image/jpeg,image/jpg,image/svg+xml,image/webp"
                  />
                </div>
                {assetError && (
                  <p className="mt-1 text-xxs text-red-400 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {assetError}
                  </p>
                )}
              </div>

              {/* ── Club Identity ── */}
              <div className="flex-1 min-h-0">
                <p className="text-xs font-semibold text-text-tertiary uppercase tracking-wider mb-2">Club Identity</p>
                <div className="space-y-2">
                  <div className="grid grid-cols-3 gap-2">
                    <div className="col-span-2">
                      <label className="text-xxs text-text-tertiary mb-1 block">Team Name</label>
                      <input
                        type="text"
                        value={teamName}
                        onChange={(e) => setTeamName(e.target.value)}
                        placeholder={skinName}
                        maxLength={40}
                        className="w-full bg-bg-tertiary border border-border-primary rounded px-2.5 py-1.5 text-xs text-text-primary placeholder-text-tertiary/50 focus:outline-none focus:border-cricket-accent"
                      />
                    </div>
                    <div>
                      <label className="text-xxs text-text-tertiary mb-1 block">Short</label>
                      <input
                        type="text"
                        value={shortName}
                        onChange={(e) => setShortName(e.target.value.toUpperCase().slice(0, 3))}
                        placeholder={skinShort}
                        maxLength={3}
                        className="w-full bg-bg-tertiary border border-border-primary rounded px-2.5 py-1.5 text-xs text-text-primary placeholder-text-tertiary/50 focus:outline-none focus:border-cricket-accent font-mono tracking-widest text-center"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-xxs text-text-tertiary mb-1 block">Coach</label>
                    <input
                      type="text"
                      value={coachName}
                      onChange={(e) => setCoachName(e.target.value)}
                      placeholder={skinCoach}
                      maxLength={50}
                      className="w-full bg-bg-tertiary border border-border-primary rounded px-2.5 py-1.5 text-xs text-text-primary placeholder-text-tertiary/50 focus:outline-none focus:border-cricket-accent"
                    />
                  </div>
                  <div>
                    <label className="text-xxs text-text-tertiary mb-1 block">Home Venue</label>
                    <input
                      type="text"
                      value={homeVenue}
                      onChange={(e) => setHomeVenue(e.target.value)}
                      placeholder={skinVenue}
                      maxLength={60}
                      className="w-full bg-bg-tertiary border border-border-primary rounded px-2.5 py-1.5 text-xs text-text-primary placeholder-text-tertiary/50 focus:outline-none focus:border-cricket-accent"
                    />
                  </div>
                </div>
              </div>

              <div className="flex-none border-t border-border-primary pt-3 space-y-2">
                <button
                  onClick={handleSave}
                  disabled={!selectedTeamId}
                  className="w-full btn-primary flex items-center justify-center gap-2 py-2"
                >
                  {saveStatus === 'saved' ? (
                    <><Check className="w-4 h-4" /> Saved!</>
                  ) : (
                    <><Save className="w-4 h-4" /> Save Changes</>
                  )}
                </button>

                {hasCustomization && (
                  <button
                    onClick={handleReset}
                    className="w-full flex items-center justify-center gap-2 py-1.5 rounded text-xs text-text-tertiary hover:text-text-primary border border-border-primary hover:border-border-secondary transition-colors"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Reset to Default
                  </button>
                )}

                {saveStatus === 'error' && (
                  <p className="text-xxs text-red-400 flex items-center justify-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    Save failed. Please try again.
                  </p>
                )}
              </div>

            </div>
          )}
        </div>

      </div>

      {showExport && (
        <SkinExportModal
          customClubs={customClubs}
          globalCosmetics={globalCosmetics}
          previewElementId="skin-preview-card"
          onClose={() => setShowExport(false)}
        />
      )}
    </div>
  );
};

function AssetRow({ label, hint, dataUrl, onUpload, onRemove, inputRef, accept }) {
  return (
    <div className="flex items-center gap-2 bg-bg-tertiary border border-border-primary rounded px-2 py-1.5">
      <div className="w-8 h-8 flex-shrink-0 rounded overflow-hidden bg-bg-primary border border-border-primary flex items-center justify-center">
        {dataUrl
          ? <img src={dataUrl} alt={label} className="w-full h-full object-cover" />
          : <ImageIcon className="w-4 h-4 text-text-tertiary opacity-50" />
        }
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xxs font-medium text-text-primary">{label}</p>
        <p className="text-[10px] text-text-tertiary leading-tight">{hint}</p>
      </div>
      <button
        onClick={() => inputRef.current?.click()}
        className="text-xxs text-text-secondary hover:text-text-primary flex items-center gap-1 px-1.5 py-0.5 rounded hover:bg-bg-secondary transition-colors"
      >
        <Upload className="w-3 h-3" />
        Upload
      </button>
      {dataUrl && (
        <button
          onClick={onRemove}
          className="text-text-tertiary hover:text-red-400 transition-colors"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
      <input ref={inputRef} type="file" accept={accept} className="hidden" onChange={onUpload} />
    </div>
  );
}

function GlobalAssetRow({ label, dataUrl, onUpload, onRemove, inputRef, accept }) {
  return (
    <div className="flex items-center gap-2 text-xxs">
      <div className="w-6 h-6 flex-shrink-0 rounded overflow-hidden bg-bg-primary border border-border-primary flex items-center justify-center">
        {dataUrl
          ? <img src={dataUrl} alt={label} className="w-full h-full object-cover" />
          : <ImageIcon className="w-3 h-3 text-text-tertiary opacity-50" />
        }
      </div>
      <span className="flex-1 truncate text-text-secondary">{label}</span>
      <button
        onClick={() => inputRef.current?.click()}
        className="text-text-secondary hover:text-text-primary"
      >
        <Upload className="w-3 h-3" />
      </button>
      {dataUrl && (
        <button onClick={onRemove} className="text-text-tertiary hover:text-red-400">
          <X className="w-3 h-3" />
        </button>
      )}
      <input ref={inputRef} type="file" accept={accept} className="hidden" onChange={onUpload} />
    </div>
  );
}

export default ClubEditorScreen;
