// components/training/ActiveSession.tsx
'use client';
import { useEffect, useRef, useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { useAppStore } from '@/lib/store';
import { useTrainingSimulation } from '@/hooks/useTrainingSimulation';
import { formatTime, formatSpeed, getProgressPercent } from '@/lib/utils';
import { Speedometer } from './Speedometer';
import type { DriveSceneHandle } from './ThreeDriveScene';
import { cn } from '@/lib/utils';
import {
  Pause, Play, StopCircle, Navigation, AlertTriangle,
  ChevronRight, ChevronLeft, ArrowUp, ArrowDown,
} from 'lucide-react';

// Dynamically import Three.js scene — no SSR
const ThreeDriveScene = dynamic(
  () => import('./ThreeDriveScene').then(m => ({ default: m.ThreeDriveScene })),
  { ssr: false, loading: () => <SceneFallback /> },
);

export function ActiveSession() {
  useTrainingSimulation();
  const { session, pauseSession, resumeSession, endSession, updateSpeed } = useAppStore();
  const [showEndConfirm, setShowEndConfirm] = useState(false);
  const driveRef = useRef<DriveSceneHandle | null>(null);

  const route   = session.route!;
  const country = session.country!;

  const progress     = getProgressPercent(session.distanceCoveredKm, route.distanceKm);
  const speedDisplay = formatSpeed(session.currentSpeedKmh, country.speedUnit);
  const limitDisplay = formatSpeed(route.speedLimit, country.speedUnit);
  const isOverSpeed  = route.speedLimit < 999 && session.currentSpeedKmh > route.speedLimit * 1.05;

  const laneColor = { correct: 'text-ds-green', warning: 'text-ds-amber', violation: 'text-ds-red' }[session.laneStatus];
  const posColor  = { good: 'text-ds-green',    fair: 'text-ds-amber',    poor: 'text-ds-red'      }[session.positionStatus];

  // Speed bridge: three.js → zustand
  const handleSpeedChange = useCallback((kmh: number) => {
    updateSpeed(kmh);
  }, [updateSpeed]);

  // ── Touch steering (joystick on the road view) ───────────────────────────
  const touchRef = useRef({ active: false, startX: 0, startY: 0 });

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    touchRef.current = { active: true, startX: e.clientX, startY: e.clientY };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, []);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!touchRef.current.active || !driveRef.current) return;
    const dx = e.clientX - touchRef.current.startX;
    const dy = e.clientY - touchRef.current.startY;
    const steer = Math.max(-1, Math.min(1, dx / 100));
    const accel = Math.max(-1, Math.min(1, -dy / 80)); // swipe up = throttle
    driveRef.current.setSteer(steer);
    if (accel > 0.1) driveRef.current.setThrottle(accel);
    else if (accel < -0.1) driveRef.current.setBrake(-accel);
    else { driveRef.current.setThrottle(0); driveRef.current.setBrake(0); }
  }, []);

  const onPointerUp = useCallback(() => {
    touchRef.current.active = false;
    if (!driveRef.current) return;
    driveRef.current.setSteer(0);
    driveRef.current.setThrottle(0);
    driveRef.current.setBrake(0);
  }, []);

  // On-screen button handlers
  const holdSteer = useCallback((dir: -1 | 0 | 1) => {
    driveRef.current?.setSteer(dir);
  }, []);
  const holdThrottle = useCallback((v: number) => {
    if (v > 0) driveRef.current?.setThrottle(v);
    else       driveRef.current?.setBrake(-v);
  }, []);

  return (
    <div className="fixed inset-0 z-50 bg-ds-bg flex flex-col overflow-hidden select-none">

      {/* ── TOP BAR ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-ds-surface border-b border-ds-border shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-2 h-2 rounded-full bg-ds-green animate-pulse shrink-0" />
          <span className="text-white text-sm font-medium truncate">{route.name}</span>
          <span className="text-ds-muted text-xs hidden sm:inline">· {country.flag} {session.state?.name}</span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="font-mono text-ds-cyan text-sm tabular-nums">{formatTime(session.elapsedSec)}</span>
          <button
            onClick={() => session.isPaused ? resumeSession() : pauseSession()}
            className="p-2 rounded-lg bg-ds-card border border-ds-border active:scale-95 transition-all"
          >
            {session.isPaused
              ? <Play  className="w-4 h-4 text-ds-green" />
              : <Pause className="w-4 h-4 text-ds-muted" />}
          </button>
          <button
            onClick={() => setShowEndConfirm(true)}
            className="p-2 rounded-lg bg-red-500/10 border border-red-500/30 active:scale-95 transition-all"
          >
            <StopCircle className="w-4 h-4 text-ds-red" />
          </button>
        </div>
      </div>

      {/* ── NAV INSTRUCTION ─────────────────────────────────────────────────── */}
      <div className="mx-3 mt-2 px-3 py-2 rounded-xl bg-ds-surface/90 border border-ds-border backdrop-blur-sm shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-ds-blue flex items-center justify-center shrink-0">
            <Navigation className="w-3.5 h-3.5 text-white" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-white text-sm font-semibold truncate leading-tight">{session.currentInstruction}</p>
            {session.nextInstruction && (
              <p className="text-ds-muted text-[11px] truncate mt-0.5 flex items-center gap-0.5">
                <ChevronRight className="w-3 h-3 shrink-0" />{session.nextInstruction}
              </p>
            )}
          </div>
          {/* Speed limit badge */}
          <div className={cn(
            'w-11 h-11 rounded-full border-[3px] flex items-center justify-center font-display font-bold text-xs shrink-0',
            isOverSpeed ? 'border-ds-red text-ds-red bg-red-500/20 animate-pulse' : 'border-white text-white bg-black/50',
          )}>
            {route.speedLimit === 999 ? '∞' : limitDisplay.value}
          </div>
        </div>
      </div>

      {/* ── 3D DRIVE VIEW ───────────────────────────────────────────────────── */}
      <div
        className="flex-1 relative overflow-hidden mx-3 mt-2 rounded-2xl bg-ds-card border border-ds-border min-h-0 cursor-grab active:cursor-grabbing"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
        style={{ touchAction: 'none' }}
      >
        <ThreeDriveScene
          speedKmh={session.currentSpeedKmh}
          isPaused={session.isPaused}
          routeType={route.type}
          trafficSide={route.trafficSide}
          laneStatus={session.laneStatus}
          onSpeedChange={handleSpeedChange}
          sceneRef={driveRef}
        />

        {/* Speed-over warning overlay */}
        {isOverSpeed && !session.isPaused && (
          <div className="absolute top-3 right-3 flex items-center gap-1.5 glass rounded-lg px-2.5 py-1.5 border border-red-500/40 animate-pulse pointer-events-none">
            <AlertTriangle className="w-3.5 h-3.5 text-ds-red" />
            <span className="text-ds-red text-xs font-bold">SPEED!</span>
          </div>
        )}

        {/* Pause overlay */}
        {session.isPaused && (
          <div className="absolute inset-0 bg-black/65 flex items-center justify-center rounded-2xl backdrop-blur-sm">
            <div className="text-center">
              <Pause className="w-10 h-10 text-white mx-auto mb-2 opacity-80" />
              <p className="text-white font-display font-bold text-xl tracking-wider">PAUSED</p>
              <button
                onClick={resumeSession}
                className="mt-4 flex items-center gap-2 bg-ds-green text-black font-bold px-6 py-2.5 rounded-xl mx-auto active:scale-95 transition-transform"
              >
                <Play className="w-4 h-4 fill-current" /> Resume
              </button>
            </div>
          </div>
        )}

        {/* Touch hint — fades after 3s on first load */}
        <TouchHint />

        {/* On-screen steering controls (visible on mobile) */}
        <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between pointer-events-none md:hidden">
          {/* Left / Right steering */}
          <div className="flex gap-2 pointer-events-auto">
            <ControlBtn
              onStart={() => holdSteer(-1)} onEnd={() => holdSteer(0)}
              className="w-14 h-14 rounded-full"
            >
              <ChevronLeft className="w-6 h-6 text-white" />
            </ControlBtn>
            <ControlBtn
              onStart={() => holdSteer(1)} onEnd={() => holdSteer(0)}
              className="w-14 h-14 rounded-full"
            >
              <ChevronRight className="w-6 h-6 text-white" />
            </ControlBtn>
          </div>

          {/* Throttle / Brake */}
          <div className="flex flex-col gap-2 pointer-events-auto">
            <ControlBtn
              onStart={() => holdThrottle(1)} onEnd={() => holdThrottle(0)}
              className="w-14 h-14 rounded-full bg-green-500/20 border-green-500/50"
            >
              <ArrowUp className="w-5 h-5 text-ds-green" />
            </ControlBtn>
            <ControlBtn
              onStart={() => holdThrottle(-1)} onEnd={() => holdThrottle(0)}
              className="w-14 h-14 rounded-full bg-red-500/20 border-red-500/50"
            >
              <ArrowDown className="w-5 h-5 text-ds-red" />
            </ControlBtn>
          </div>
        </div>
      </div>

      {/* ── INSTRUMENT CLUSTER ──────────────────────────────────────────────── */}
      <div className="px-3 mt-2 mb-1 grid grid-cols-4 gap-2 shrink-0">
        {/* Speedometer */}
        <div className="col-span-1 bg-ds-card border border-ds-border rounded-xl flex flex-col items-center justify-center py-2 px-1">
          <Speedometer
            value={speedDisplay.value}
            max={route.speedLimit === 999 ? 220 : Math.round(limitDisplay.value * 1.45)}
            unit={speedDisplay.unit}
            isOver={isOverSpeed}
          />
        </div>

        {/* Mini map */}
        <div className="col-span-1 bg-ds-card border border-ds-border rounded-xl flex flex-col items-center justify-center p-2">
          <MiniMap routeType={route.type} progress={progress} />
          <p className="text-[10px] text-ds-muted mt-0.5 font-mono tabular-nums">{progress.toFixed(0)}%</p>
        </div>

        {/* Lane */}
        <div className="col-span-1 bg-ds-card border border-ds-border rounded-xl flex flex-col items-center justify-center p-2 gap-0.5">
          <LaneIcon />
          <p className="text-[10px] text-ds-muted">Lane</p>
          <p className={cn('text-[10px] font-semibold capitalize', laneColor)}>{session.laneStatus}</p>
        </div>

        {/* Position */}
        <div className="col-span-1 bg-ds-card border border-ds-border rounded-xl flex flex-col items-center justify-center p-2 gap-0.5">
          <CarPositionIcon status={session.positionStatus} />
          <p className="text-[10px] text-ds-muted">Position</p>
          <p className={cn('text-[10px] font-semibold capitalize', posColor)}>{session.positionStatus}</p>
        </div>
      </div>

      {/* ── PROGRESS BAR ────────────────────────────────────────────────────── */}
      <div className="px-3 pb-3 shrink-0">
        <div className="flex items-center justify-between text-[10px] text-ds-muted mb-1">
          <span>{session.distanceCoveredKm.toFixed(2)} km</span>
          <span>{route.distanceKm} km total</span>
        </div>
        <div className="h-1.5 bg-ds-border rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-ds-blue to-ds-cyan rounded-full transition-all duration-700"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* ── END CONFIRM MODAL ───────────────────────────────────────────────── */}
      {showEndConfirm && (
        <div className="absolute inset-0 bg-black/70 flex items-end sm:items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-ds-surface border border-ds-border rounded-2xl p-5 animate-slide-up">
            <h3 className="font-display text-lg font-bold text-white mb-1">End Session?</h3>
            <p className="text-ds-muted text-sm mb-5">
              {session.distanceCoveredKm.toFixed(2)} km covered · {formatTime(session.elapsedSec)} elapsed
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowEndConfirm(false)}
                className="flex-1 py-3 rounded-xl border border-ds-border text-ds-muted hover:text-white transition-colors text-sm font-medium"
              >
                Keep Going
              </button>
              <button
                onClick={() => endSession(false)}
                className="flex-1 py-3 rounded-xl bg-red-500/15 border border-red-500/40 text-ds-red font-bold text-sm active:scale-95 transition-all"
              >
                End Session
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function SceneFallback() {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-ds-card rounded-2xl">
      <p className="text-ds-muted text-sm animate-pulse">Loading 3D scene…</p>
    </div>
  );
}

function TouchHint() {
  const [visible, setVisible] = useState(true);
  useEffect(() => { const t = setTimeout(() => setVisible(false), 3500); return () => clearTimeout(t); }, []);
  if (!visible) return null;
  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
      <div className="glass rounded-xl px-4 py-2.5 border border-white/10 text-center animate-fade-in">
        <p className="text-white/70 text-xs">Drag to steer · Swipe up/down to accelerate/brake</p>
        <p className="text-white/40 text-[10px] mt-0.5 hidden md:block">Or use Arrow Keys / WASD</p>
      </div>
    </div>
  );
}

function ControlBtn({
  children, onStart, onEnd, className = '',
}: {
  children: React.ReactNode;
  onStart: () => void;
  onEnd: () => void;
  className?: string;
}) {
  return (
    <button
      className={cn(
        'flex items-center justify-center glass border border-white/20 active:scale-90 transition-transform',
        className,
      )}
      onPointerDown={(e) => { e.stopPropagation(); onStart(); }}
      onPointerUp={(e)   => { e.stopPropagation(); onEnd(); }}
      onPointerLeave={onEnd}
    >
      {children}
    </button>
  );
}

function MiniMap({ routeType, progress }: { routeType: string; progress: number }) {
  if (routeType === 'roundabout') {
    const angle = (progress / 100) * 360 - 90;
    const cx = 25, cy = 25, r = 17;
    return (
      <svg viewBox="0 0 50 50" className="w-10 h-10">
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#1E2A3E" strokeWidth="2.5" strokeDasharray="3 2" />
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#3B82F6" strokeWidth="2.5"
          strokeDasharray={`${((progress / 100) * 2 * Math.PI * r).toFixed(1)} 200`}
          transform={`rotate(-90 ${cx} ${cy})`} />
        <circle cx={cx} cy={cy} r={5.5} fill="#111827" stroke="#3B82F6" strokeWidth="1.5" />
        <circle
          cx={cx + r * Math.cos(angle * Math.PI / 180)}
          cy={cy + r * Math.sin(angle * Math.PI / 180)}
          r="3" fill="#22C55E"
        />
      </svg>
    );
  }
  const dotX = 5 + (progress / 100) * 40;
  const dotY = 15 - Math.sin((progress / 100) * Math.PI) * 7;
  return (
    <svg viewBox="0 0 50 30" className="w-12 h-8">
      <path d="M5 15 Q25 5 45 15" stroke="#1E2A3E" strokeWidth="3.5" fill="none" strokeLinecap="round" />
      <path d="M5 15 Q25 5 45 15" stroke="#3B82F6" strokeWidth="3.5" fill="none" strokeLinecap="round"
        strokeDasharray={`${progress * 0.4} 50`} />
      <circle cx={dotX} cy={dotY} r="3" fill="#22C55E" />
    </svg>
  );
}

function LaneIcon() {
  return (
    <svg viewBox="0 0 30 32" className="w-7 h-7">
      <line x1="8"  y1="2" x2="5"  y2="30" stroke="#1E2A3E" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="22" y1="2" x2="25" y2="30" stroke="#1E2A3E" strokeWidth="2.5" strokeLinecap="round" />
      {[4, 12, 20].map(y => (
        <line key={y} x1="15" y1={y} x2="15" y2={y + 5} stroke="#2E3E56" strokeWidth="1.5" strokeLinecap="round" />
      ))}
      <rect x="11" y="19" width="8" height="11" rx="2" fill="#22C55E" />
      <rect x="12" y="20" width="6" height="4"  rx="1" fill="#0A0E1A" />
    </svg>
  );
}

function CarPositionIcon({ status }: { status: string }) {
  const col = status === 'good' ? '#22C55E' : status === 'fair' ? '#F59E0B' : '#EF4444';
  return (
    <svg viewBox="0 0 30 32" className="w-7 h-7">
      <line x1="4"  y1="2" x2="4"  y2="30" stroke="#1E2A3E" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="26" y1="2" x2="26" y2="30" stroke="#1E2A3E" strokeWidth="2.5" strokeLinecap="round" />
      <rect x="11" y="10" width="8" height="13" rx="2" fill={col} />
      <rect x="12" y="11" width="6" height="5"  rx="1" fill="#0A0E1A" />
    </svg>
  );
}
