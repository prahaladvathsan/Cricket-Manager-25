/**
 * @file ClubEditorScreen.jsx
 * @description Pre-game club customization screen.
 * Allows uploading a badge and changing primary/secondary colors for any WPL team.
 * Data is stored outside game saves via CustomClubManager (cm25-custom-clubs IndexedDB key).
 */

import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Upload, RotateCcw, Save, Check, AlertCircle } from 'lucide-react';
import wplTeamsData from '../../data/teams/wpl-teams.json';
import { getTeamBadge } from '../../utils/assetHelpers';
import {
  saveCustomClub,
  getCustomClubs,
  deleteCustomClub,
  applyCustomClubToTeam,
  validateBadgeFile,
  fileToDataUrl
} from '../../utils/CustomClubManager';

const ClubEditorScreen = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [customClubs, setCustomClubs] = useState({});
  const [selectedTeamId, setSelectedTeamId] = useState(null);
  const [primaryColor, setPrimaryColor] = useState('#000000');
  const [secondaryColor, setSecondaryColor] = useState('#ffffff');
  const [badgeDataUrl, setBadgeDataUrl] = useState(null);
  const [saveStatus, setSaveStatus] = useState(null); // 'saved' | 'error' | null
  const [badgeError, setBadgeError] = useState(null);
  const [loading, setLoading] = useState(true);

  // Load existing customizations on mount
  useEffect(() => {
    getCustomClubs().then(clubs => {
      setCustomClubs(clubs);
      setLoading(false);
    });
  }, []);

  // Populate editor when a team is selected
  useEffect(() => {
    if (!selectedTeamId) return;

    const originalTeam = wplTeamsData.find(t => t.id === selectedTeamId);
    const custom = customClubs[selectedTeamId];

    setPrimaryColor(custom?.primaryColor || originalTeam?.colors?.primary || '#1a1a2e');
    setSecondaryColor(custom?.secondaryColor || originalTeam?.colors?.secondary || '#ffffff');
    setBadgeDataUrl(custom?.badgeDataUrl || null);
    setBadgeError(null);
    setSaveStatus(null);
  }, [selectedTeamId, customClubs]);

  const selectedTeam = wplTeamsData.find(t => t.id === selectedTeamId);
  const hasCustomization = !!customClubs[selectedTeamId];

  const handleBadgeUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validation = validateBadgeFile(file);
    if (!validation.valid) {
      setBadgeError(validation.error);
      return;
    }

    setBadgeError(null);
    const dataUrl = await fileToDataUrl(file);
    setBadgeDataUrl(dataUrl);
  };

  const handleSave = async () => {
    if (!selectedTeamId) return;

    try {
      await saveCustomClub({
        teamId: selectedTeamId,
        badgeDataUrl,
        primaryColor,
        secondaryColor
      });
      const updated = await getCustomClubs();
      setCustomClubs(updated);
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
    const updated = await getCustomClubs();
    setCustomClubs(updated);
    setSaveStatus(null);
  };

  const currentBadgeSrc = badgeDataUrl || getTeamBadge(selectedTeamId || '');

  return (
    <div className="min-h-screen bg-bg-primary text-text-primary flex flex-col">
      {/* Header */}
      <div className="border-b border-border-primary bg-bg-secondary px-6 py-4 flex items-center gap-4">
        <button
          onClick={() => navigate('/')}
          className="text-text-secondary hover:text-text-primary transition-colors flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Menu
        </button>
        <h1 className="text-lg font-semibold text-text-primary">Club Customization</h1>
        <span className="text-xs text-text-tertiary ml-auto">
          Changes apply to all new and existing games
        </span>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Left Panel — Team Selector */}
        <div className="w-72 border-r border-border-primary bg-bg-secondary overflow-y-auto">
          <div className="p-3 border-b border-border-primary">
            <p className="text-xs text-text-tertiary">Select a team to customize</p>
          </div>
          {loading ? (
            <div className="p-4 text-center text-text-tertiary text-sm">Loading...</div>
          ) : (
            <div className="p-2 space-y-1">
              {wplTeamsData.map(team => {
                const custom = customClubs[team.id];
                const isSelected = selectedTeamId === team.id;
                return (
                  <button
                    key={team.id}
                    onClick={() => setSelectedTeamId(team.id)}
                    className={`w-full flex items-center gap-3 p-2 rounded transition-colors text-left ${
                      isSelected ? 'bg-cricket-primary/20 border border-cricket-accent/50' : 'hover:bg-bg-tertiary border border-transparent'
                    }`}
                  >
                    {/* Mini badge preview */}
                    <div
                      className="w-8 h-8 rounded-full flex-shrink-0 overflow-hidden border-2"
                      style={{ borderColor: custom?.primaryColor || team.colors?.primary || '#333' }}
                    >
                      <img
                        src={custom?.badgeDataUrl || getTeamBadge(team.id)}
                        alt={team.name}
                        className="w-full h-full object-cover"
                        onError={(e) => { e.target.style.display = 'none'; }}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-xs font-medium truncate ${isSelected ? 'text-cricket-accent' : 'text-text-primary'}`}>
                        {team.name}
                      </p>
                      {custom && (
                        <p className="text-xxs text-text-tertiary">Customized</p>
                      )}
                    </div>
                    {/* Color dots */}
                    <div className="flex gap-1">
                      <div
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: custom?.primaryColor || team.colors?.primary }}
                      />
                      <div
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: custom?.secondaryColor || team.colors?.secondary }}
                      />
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Panel — Editor */}
        <div className="flex-1 p-6 overflow-y-auto">
          {!selectedTeamId ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center text-text-tertiary">
                <div className="w-16 h-16 bg-bg-tertiary rounded-full mx-auto mb-4 flex items-center justify-center">
                  <Upload className="w-8 h-8" />
                </div>
                <p className="text-sm">Select a team from the left to begin customizing</p>
              </div>
            </div>
          ) : (
            <div className="max-w-2xl space-y-6">
              {/* Team Title */}
              <div>
                <h2 className="text-xl font-bold text-text-primary">{selectedTeam?.name}</h2>
                <p className="text-sm text-text-tertiary">{selectedTeam?.shortName} · {selectedTeam?.homeVenue}</p>
              </div>

              {/* Preview Card */}
              <div
                className="rounded-xl p-6 flex items-center gap-6 border border-border-primary"
                style={{ background: `linear-gradient(135deg, ${primaryColor}22, ${secondaryColor}11)`, borderColor: primaryColor + '44' }}
              >
                {/* Badge Preview */}
                <div
                  className="w-24 h-24 rounded-full border-4 overflow-hidden flex-shrink-0 bg-bg-tertiary"
                  style={{ borderColor: primaryColor }}
                >
                  {badgeDataUrl ? (
                    <img src={badgeDataUrl} alt="Custom badge" className="w-full h-full object-cover" />
                  ) : (
                    <img
                      src={getTeamBadge(selectedTeamId)}
                      alt={selectedTeam?.name}
                      className="w-full h-full object-cover"
                      onError={(e) => { e.target.src = ''; }}
                    />
                  )}
                </div>

                {/* Team Info Preview */}
                <div>
                  <p className="text-2xl font-bold" style={{ color: primaryColor }}>
                    {selectedTeam?.name}
                  </p>
                  <p className="text-sm" style={{ color: secondaryColor }}>
                    {selectedTeam?.shortName} · {selectedTeam?.homeVenue}
                  </p>
                  <div className="flex gap-2 mt-2">
                    <span
                      className="w-4 h-4 rounded-full border border-white/20"
                      style={{ backgroundColor: primaryColor }}
                    />
                    <span
                      className="w-4 h-4 rounded-full border border-white/20"
                      style={{ backgroundColor: secondaryColor }}
                    />
                  </div>
                </div>
              </div>

              {/* Badge Upload */}
              <div>
                <label className="text-sm font-semibold text-text-primary mb-2 block">Team Badge</label>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="btn-secondary flex items-center gap-2 text-sm"
                  >
                    <Upload className="w-4 h-4" />
                    Upload Badge
                  </button>
                  {badgeDataUrl && (
                    <button
                      onClick={() => setBadgeDataUrl(null)}
                      className="text-xs text-text-tertiary hover:text-text-primary transition-colors"
                    >
                      Remove custom badge
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
                  <p className="mt-1 text-xs text-red-400 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {badgeError}
                  </p>
                )}
                <p className="mt-1 text-xxs text-text-tertiary">PNG, JPG, or SVG · Max 500KB</p>
              </div>

              {/* Color Pickers */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-semibold text-text-primary mb-2 block">Primary Color</label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      className="w-10 h-10 rounded cursor-pointer border border-border-primary bg-transparent"
                    />
                    <span className="text-sm text-text-secondary font-mono">{primaryColor}</span>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-semibold text-text-primary mb-2 block">Secondary Color</label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={secondaryColor}
                      onChange={(e) => setSecondaryColor(e.target.value)}
                      className="w-10 h-10 rounded cursor-pointer border border-border-primary bg-transparent"
                    />
                    <span className="text-sm text-text-secondary font-mono">{secondaryColor}</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3 pt-2">
                <button
                  onClick={handleSave}
                  className="btn-primary flex items-center gap-2"
                >
                  {saveStatus === 'saved' ? (
                    <>
                      <Check className="w-4 h-4" />
                      Saved!
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      Save Changes
                    </>
                  )}
                </button>

                {hasCustomization && (
                  <button
                    onClick={handleReset}
                    className="btn-secondary flex items-center gap-2 text-text-secondary"
                  >
                    <RotateCcw className="w-4 h-4" />
                    Reset to Default
                  </button>
                )}

                {saveStatus === 'error' && (
                  <p className="text-xs text-red-400 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    Save failed. Please try again.
                  </p>
                )}
              </div>

              <p className="text-xs text-text-tertiary">
                Customizations are stored separately from game saves and will appear in team selection and throughout the game.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ClubEditorScreen;
