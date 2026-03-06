/**
 * @file ClubEditorScreen.jsx
 * @description Pre-game club customization screen.
 * 3-column layout: team selector | live preview | editor controls.
 * Everything fits in one viewport — no scrolling.
 */

import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Upload, RotateCcw, Save, Check, AlertCircle, Pencil, X } from 'lucide-react';
import wplTeamsData from '../../data/teams/wpl-teams.json';
import { getTeamBadge } from '../../utils/assetHelpers';
import {
  saveCustomClub,
  getCustomClubs,
  deleteCustomClub,
  validateBadgeFile,
  fileToDataUrl
} from '../../utils/CustomClubManager';

const ClubEditorScreen = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [customClubs, setCustomClubs] = useState({});
  const [selectedTeamId, setSelectedTeamId] = useState(null);
  const [primaryColor, setPrimaryColor] = useState('#1a1a2e');
  const [secondaryColor, setSecondaryColor] = useState('#ffffff');
  const [badgeDataUrl, setBadgeDataUrl] = useState(null);
  const [teamName, setTeamName] = useState('');
  const [shortName, setShortName] = useState('');
  const [coachName, setCoachName] = useState('');
  const [homeVenue, setHomeVenue] = useState('');
  const [saveStatus, setSaveStatus] = useState(null); // 'saved' | 'error' | null
  const [badgeError, setBadgeError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getCustomClubs().then(clubs => {
      setCustomClubs(clubs);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (!selectedTeamId) return;
    const originalTeam = wplTeamsData.find(t => t.id === selectedTeamId);
    const custom = customClubs[selectedTeamId];
    setPrimaryColor(custom?.primaryColor || originalTeam?.colors?.primary || '#1a1a2e');
    setSecondaryColor(custom?.secondaryColor || originalTeam?.colors?.secondary || '#ffffff');
    setBadgeDataUrl(custom?.badgeDataUrl || null);
    setTeamName(custom?.teamName || '');
    setShortName(custom?.shortName || '');
    setCoachName(custom?.coachName || '');
    setHomeVenue(custom?.homeVenue || '');
    setBadgeError(null);
    setSaveStatus(null);
  }, [selectedTeamId, customClubs]);

  const selectedTeam = wplTeamsData.find(t => t.id === selectedTeamId);
  const hasCustomization = !!customClubs[selectedTeamId];

  const displayName = teamName || selectedTeam?.name || '';
  const displayShort = shortName || selectedTeam?.shortName || '';
  const displayCoach = coachName || selectedTeam?.coachName || '';
  const displayVenue = homeVenue || selectedTeam?.homeVenue || '';
  const displayBadge = badgeDataUrl || getTeamBadge(selectedTeamId || '');

  const handleBadgeUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const validation = validateBadgeFile(file);
    if (!validation.valid) { setBadgeError(validation.error); return; }
    setBadgeError(null);
    setBadgeDataUrl(await fileToDataUrl(file));
  };

  const handleSave = async () => {
    if (!selectedTeamId) return;
    try {
      await saveCustomClub({
        teamId: selectedTeamId,
        badgeDataUrl,
        primaryColor,
        secondaryColor,
        teamName: teamName.trim() || null,
        shortName: shortName.trim().toUpperCase().slice(0, 3) || null,
        coachName: coachName.trim() || null,
        homeVenue: homeVenue.trim() || null,
      });
      setCustomClubs(await getCustomClubs());
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
    setSaveStatus(null);
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
        <span className="text-xs text-text-tertiary ml-auto">
          Customizations persist across all game saves
        </span>
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
              const isSelected = selectedTeamId === team.id;
              const pri = custom?.primaryColor || team.colors?.primary;
              const sec = custom?.secondaryColor || team.colors?.secondary;
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
                  {/* Tiny kit swatch */}
                  <div
                    className="w-7 h-7 rounded-full flex-shrink-0 overflow-hidden border-2"
                    style={{ borderColor: pri }}
                  >
                    <img
                      src={custom?.badgeDataUrl || getTeamBadge(team.id)}
                      alt=""
                      className="w-full h-full object-cover"
                      onError={(e) => { e.target.style.display = 'none'; }}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs font-medium truncate leading-tight ${isSelected ? 'text-cricket-accent' : 'text-text-primary'}`}>
                      {custom?.teamName || team.name}
                    </p>
                    <p className="text-xxs text-text-tertiary">{custom?.shortName || team.shortName}</p>
                  </div>
                  {/* Color pip pair */}
                  <div className="flex flex-col gap-0.5 flex-shrink-0">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: pri }} />
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: sec }} />
                  </div>
                </button>
              );
            })}
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
            /* Kit Card */
            <div className="relative w-72 rounded-2xl overflow-hidden shadow-2xl border border-white/10" style={{ height: '460px' }}>

              {/* Banner — diagonal split */}
              <div className="absolute inset-0">
                <div
                  className="absolute inset-0"
                  style={{
                    background: `linear-gradient(145deg, ${primaryColor} 55%, ${secondaryColor} 55%)`
                  }}
                />
                {/* Subtle texture lines */}
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

              {/* Short name badge — top left */}
              <div
                className="absolute top-4 left-4 px-2.5 py-1 rounded font-bold text-xs tracking-widest"
                style={{ backgroundColor: secondaryColor + 'cc', color: primaryColor }}
              >
                {displayShort}
              </div>

              {/* Customized pill — top right */}
              {hasCustomization && (
                <div className="absolute top-4 right-4 px-2 py-0.5 rounded-full bg-black/40 text-xxs text-white/70 border border-white/20">
                  Customized
                </div>
              )}

              {/* Badge — centered, prominent */}
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

              {/* Bottom info panel */}
              <div
                className="absolute bottom-0 left-0 right-0 px-5 py-5"
                style={{ background: `linear-gradient(to top, ${primaryColor}f0 60%, transparent)` }}
              >
                {/* Team name */}
                <p
                  className="text-2xl font-black tracking-tight leading-tight"
                  style={{ color: secondaryColor }}
                >
                  {displayName}
                </p>

                {/* Venue */}
                <p className="text-xs mt-1 font-medium" style={{ color: secondaryColor + 'aa' }}>
                  {displayVenue}
                </p>

                {/* Coach */}
                <p className="text-xs mt-0.5" style={{ color: secondaryColor + '77' }}>
                  Coach: {displayCoach}
                </p>

                {/* Color swatches strip */}
                <div className="flex items-center gap-2 mt-3">
                  <div
                    className="h-3 flex-1 rounded-full border border-white/20"
                    style={{ backgroundColor: primaryColor }}
                  />
                  <div
                    className="h-3 flex-1 rounded-full border border-white/20"
                    style={{ backgroundColor: secondaryColor }}
                  />
                </div>

                {/* Perk chip */}
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
            <div className="flex-1 flex flex-col overflow-hidden p-4 gap-4">

              {/* ── Colors ── */}
              <div>
                <p className="text-xs font-semibold text-text-tertiary uppercase tracking-wider mb-2">Kit Colors</p>
                <div className="grid grid-cols-2 gap-2">
                  {/* Primary */}
                  <div
                    className="relative rounded-lg overflow-hidden cursor-pointer group border-2 border-transparent hover:border-cricket-accent/50 transition-colors"
                    style={{ backgroundColor: primaryColor, height: '72px' }}
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

                  {/* Secondary */}
                  <div
                    className="relative rounded-lg overflow-hidden cursor-pointer group border-2 border-transparent hover:border-cricket-accent/50 transition-colors"
                    style={{ backgroundColor: secondaryColor, height: '72px' }}
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
                <p className="text-xxs text-text-tertiary mt-1.5">Click a swatch to change color</p>
              </div>

              {/* ── Badge ── */}
              <div>
                <p className="text-xs font-semibold text-text-tertiary uppercase tracking-wider mb-2">Badge</p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-bg-tertiary border border-border-primary text-xs text-text-primary hover:border-cricket-accent/50 transition-colors"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    Upload
                  </button>
                  {badgeDataUrl && (
                    <button
                      onClick={() => setBadgeDataUrl(null)}
                      className="flex items-center gap-1 text-xs text-text-tertiary hover:text-text-primary transition-colors"
                    >
                      <X className="w-3 h-3" />
                      Remove
                    </button>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/jpg,image/svg+xml"
                    className="hidden"
                    onChange={handleBadgeUpload}
                  />
                </div>
                {badgeError && (
                  <p className="mt-1 text-xxs text-red-400 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {badgeError}
                  </p>
                )}
                {!badgeError && <p className="mt-1 text-xxs text-text-tertiary">PNG, JPG, or SVG · Max 500KB</p>}
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
                        placeholder={selectedTeam?.name}
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
                        placeholder={selectedTeam?.shortName}
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
                      placeholder={selectedTeam?.coachName}
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
                      placeholder={selectedTeam?.homeVenue}
                      maxLength={60}
                      className="w-full bg-bg-tertiary border border-border-primary rounded px-2.5 py-1.5 text-xs text-text-primary placeholder-text-tertiary/50 focus:outline-none focus:border-cricket-accent"
                    />
                  </div>
                </div>
              </div>

              {/* ── Actions ── */}
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
    </div>
  );
};

export default ClubEditorScreen;
