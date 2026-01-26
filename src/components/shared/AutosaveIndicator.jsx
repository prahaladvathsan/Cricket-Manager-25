/**
 * @file AutosaveIndicator.jsx
 * @description Global autosave indicator that shows when saves are happening
 *
 * Listens for 'autosave' custom events from SaveGameManager and displays
 * a subtle toast notification in the corner of the screen.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Save, Check } from 'lucide-react';

const AutosaveIndicator = () => {
  const [status, setStatus] = useState('idle'); // 'idle' | 'saving' | 'saved'
  const [label, setLabel] = useState('');

  const handleAutosave = useCallback((event) => {
    const { label: saveLabel } = event.detail || {};
    setLabel(saveLabel || 'Game saved');
    setStatus('saving');

    // After brief "saving" state, show "saved"
    setTimeout(() => {
      setStatus('saved');
      // Hide after showing "saved" for 2 seconds
      setTimeout(() => {
        setStatus('idle');
      }, 2000);
    }, 500);
  }, []);

  useEffect(() => {
    window.addEventListener('autosave', handleAutosave);
    return () => window.removeEventListener('autosave', handleAutosave);
  }, [handleAutosave]);

  if (status === 'idle') return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className={`
        flex items-center gap-2 px-4 py-2 rounded-lg shadow-lg backdrop-blur-sm
        border transition-all duration-300
        ${status === 'saving'
          ? 'bg-cricket-accent/20 border-cricket-accent/40 text-cricket-accent'
          : 'bg-green-500/20 border-green-500/40 text-green-400'
        }
      `}>
        {status === 'saving' ? (
          <>
            <Save className="w-4 h-4 animate-pulse" />
            <span className="text-sm font-medium">Autosaving...</span>
          </>
        ) : (
          <>
            <Check className="w-4 h-4" />
            <span className="text-sm font-medium">Autosaved</span>
          </>
        )}
      </div>
    </div>
  );
};

export default AutosaveIndicator;
