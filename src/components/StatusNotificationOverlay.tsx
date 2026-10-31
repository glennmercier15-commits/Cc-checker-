import React, { useState, useEffect } from 'react';
import { Sparkles, Bomb, Volume2, VolumeX, X, ChevronUp, ChevronDown, CheckCircle2, AlertOctagon, Terminal } from 'lucide-react';
import { VividLogEntry, playSynthesizedSound } from '../utils/vividImagery';

interface StatusNotificationOverlayProps {
  notifications: VividLogEntry[];
  onClear: () => void;
}

export const StatusNotificationOverlay: React.FC<StatusNotificationOverlayProps> = ({
  notifications,
  onClear,
}) => {
  const [isMinimized, setIsMinimized] = useState<boolean>(false);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => {
    return localStorage.getItem('stripe_sound_alerts') === 'true';
  });
  const [activeAnimation, setActiveAnimation] = useState<'firework' | 'bomb' | null>(null);

  const latest = notifications[0];

  // Trigger animations & sounds when a new notification arrives
  useEffect(() => {
    if (latest) {
      const type = latest.status === 'live' ? 'firework' : 'bomb';
      setActiveAnimation(type);
      if (soundEnabled) {
        playSynthesizedSound(type);
      }
      const timer = setTimeout(() => {
        setActiveAnimation(null);
      }, 2400);
      return () => clearTimeout(timer);
    }
  }, [latest?.id, latest?.status, soundEnabled]);

  const toggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    localStorage.setItem('stripe_sound_alerts', next ? 'true' : 'false');
  };

  if (notifications.length === 0) {
    return null;
  }

  const liveCount = notifications.filter((n) => n.status === 'live').length;
  const deadCount = notifications.filter((n) => n.status === 'dead').length;

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-md w-full sm:w-[420px] pointer-events-none transition-all duration-300">
      {/* High-Impact Visual FX Burst (Sparks / Shockwave) */}
      {activeAnimation === 'firework' && (
        <div className="absolute -top-12 right-12 flex items-center justify-center pointer-events-none animate-bounce">
          <div className="relative">
            <span className="text-4xl filter drop-shadow-[0_0_12px_rgba(52,211,153,0.9)]">🎆</span>
            <span className="absolute -top-2 -right-3 text-2xl animate-ping">✨</span>
            <span className="absolute -bottom-1 -left-3 text-2xl animate-pulse">🌟</span>
          </div>
        </div>
      )}

      {activeAnimation === 'bomb' && (
        <div className="absolute -top-12 right-12 flex items-center justify-center pointer-events-none animate-pulse">
          <div className="relative">
            <span className="text-4xl filter drop-shadow-[0_0_16px_rgba(239,68,68,0.95)]">💣</span>
            <span className="absolute -top-3 -right-2 text-2xl animate-ping">💥</span>
            <span className="absolute -bottom-2 -left-2 text-xl opacity-80">💨</span>
          </div>
        </div>
      )}

      {/* Main Persistent Card Container */}
      <div
        className={`pointer-events-auto rounded-2xl shadow-2xl backdrop-blur-xl border transition-all duration-300 overflow-hidden ${
          latest.status === 'live'
            ? 'bg-slate-950/95 border-emerald-500/50 shadow-emerald-950/40'
            : 'bg-slate-950/95 border-rose-500/50 shadow-rose-950/40'
        }`}
      >
        {/* Header Bar */}
        <div
          className={`px-4 py-2.5 flex items-center justify-between border-b ${
            latest.status === 'live'
              ? 'bg-emerald-950/50 border-emerald-800/40 text-emerald-200'
              : 'bg-rose-950/50 border-rose-800/40 text-rose-200'
          }`}
        >
          <div className="flex items-center gap-2 text-xs font-semibold">
            {latest.status === 'live' ? (
              <>
                <span className="text-base">🎆</span>
                <span>STRIPE API MONITOR: CARD LIVE</span>
              </>
            ) : (
              <>
                <span className="text-base">💣</span>
                <span>STRIPE API MONITOR: CARD DEAD</span>
              </>
            )}
          </div>

          <div className="flex items-center gap-2 text-xs">
            <button
              onClick={toggleSound}
              title={soundEnabled ? 'Mute alert sound' : 'Enable alert sound'}
              className="p-1 rounded-md hover:bg-white/10 transition-colors text-slate-300"
            >
              {soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5 text-slate-500" />}
            </button>
            <button
              onClick={() => setIsMinimized(!isMinimized)}
              className="p-1 rounded-md hover:bg-white/10 transition-colors text-slate-300"
              title={isMinimized ? 'Expand' : 'Collapse'}
            >
              {isMinimized ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
            <button
              onClick={onClear}
              className="p-1 rounded-md hover:bg-white/10 transition-colors text-slate-400 hover:text-white"
              title="Dismiss all"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        {!isMinimized && (
          <div className="p-4 space-y-3">
            {/* Technical Data Line */}
            <div className="bg-slate-900/90 border border-slate-800/90 rounded-lg p-2.5 font-mono text-[11px] leading-relaxed text-slate-200 flex items-start gap-2 select-all">
              <Terminal className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
              <span className="break-all">{latest.technicalData}</span>
            </div>

            {/* Vivid Imagery Sentence */}
            <div
              className={`p-3 rounded-xl border text-xs font-medium leading-relaxed ${
                latest.status === 'live'
                  ? 'bg-emerald-950/30 border-emerald-800/40 text-emerald-100'
                  : 'bg-rose-950/30 border-rose-800/40 text-rose-100'
              }`}
            >
              <p className="italic">{latest.vividImagery}</p>
            </div>

            {/* Batch / Ledger Mini Stats Footer */}
            <div className="flex items-center justify-between pt-1 border-t border-slate-900 text-[11px] text-slate-400">
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1 text-emerald-400 font-semibold">
                  🎆 {liveCount} Live
                </span>
                <span className="flex items-center gap-1 text-rose-400 font-semibold">
                  💣 {deadCount} Dead
                </span>
              </div>
              <span className="text-slate-500 font-mono">
                {notifications.length} total recorded
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
