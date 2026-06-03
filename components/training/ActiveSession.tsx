// components/training/ActiveSession.tsx
// Layout exactly mirrors the reference image:
// [Left sidebar nav] [Big 3D drive view] [Right scenario panel]
// [Bottom HUD: minimap | speed | lane | position | instructor]
'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { useAppStore } from '@/lib/store';
import { useTrainingSimulation } from '@/hooks/useTrainingSimulation';
import { formatTime, formatSpeed, getProgressPercent } from '@/lib/utils';
import type { DriveSceneHandle } from './ThreeDriveScene';
import {
  Pause, Play, StopCircle, Navigation, User,
  ChevronLeft, ChevronRight, ArrowUp, ArrowDown,
} from 'lucide-react';

const ThreeDriveScene = dynamic(
  () => import('./ThreeDriveScene').then(m => ({ default: m.ThreeDriveScene })),
  {
    ssr: false,
    loading: () => (
      <div className="absolute inset-0 flex items-center justify-center bg-[#0d1520]">
        <p className="text-blue-400 text-sm animate-pulse tracking-wider">Loading road scene…</p>
      </div>
    ),
  },
);

export function ActiveSession() {
  useTrainingSimulation();
  const { session, pauseSession, resumeSession, endSession, updateSpeed } = useAppStore();
  const [showEnd, setShowEnd] = useState(false);
  const driveRef = useRef<DriveSceneHandle | null>(null);

  const route   = session.route!;
  const country = session.country!;
  const progress    = getProgressPercent(session.distanceCoveredKm, route.distanceKm);
  const speedD      = formatSpeed(session.currentSpeedKmh, country.speedUnit);
  const limitD      = formatSpeed(route.speedLimit, country.speedUnit);
  const isOver      = route.speedLimit < 999 && session.currentSpeedKmh > route.speedLimit * 1.05;
  const laneCol     = session.laneStatus === 'correct' ? '#22c55e' : session.laneStatus === 'warning' ? '#f59e0b' : '#ef4444';
  const posCol      = session.positionStatus === 'good' ? '#22c55e' : session.positionStatus === 'fair' ? '#f59e0b' : '#ef4444';

  const handleSpeedChange = useCallback((kmh: number) => updateSpeed(kmh), [updateSpeed]);

  // Touch joystick on drive view
  const touchRef = useRef({ active: false, sx: 0, sy: 0 });
  const onPD = useCallback((e: React.PointerEvent) => {
    touchRef.current = { active: true, sx: e.clientX, sy: e.clientY };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, []);
  const onPM = useCallback((e: React.PointerEvent) => {
    if (!touchRef.current.active || !driveRef.current) return;
    const steer = Math.max(-1, Math.min(1, (e.clientX - touchRef.current.sx) / 100));
    const accel = Math.max(-1, Math.min(1, -(e.clientY - touchRef.current.sy) / 80));
    driveRef.current.setSteer(steer);
    if (accel > 0.1)       { driveRef.current.setThrottle(accel); driveRef.current.setBrake(0); }
    else if (accel < -0.1) { driveRef.current.setBrake(-accel);   driveRef.current.setThrottle(0); }
    else                   { driveRef.current.setThrottle(0);      driveRef.current.setBrake(0); }
  }, []);
  const onPU = useCallback(() => {
    touchRef.current.active = false;
    driveRef.current?.setSteer(0);
    driveRef.current?.setThrottle(0);
    driveRef.current?.setBrake(0);
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-50 overflow-hidden select-none flex flex-col" style={{ background: '#0a0e1a' }}>

      {/* ══ THIN TOP BAR — route name + timer + controls ═════════════════════ */}
      <div className="shrink-0 flex items-center justify-between px-4 py-2"
        style={{ background: '#0d1120', borderBottom: '1px solid #1a2540' }}>
        {/* Live dot + name */}
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="relative flex h-2.5 w-2.5 shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-400" />
          </span>
          <span className="text-white text-sm font-semibold truncate">{route.name}</span>
          <span className="text-[#4a6080] text-xs hidden sm:inline">· {country.flag} {session.state?.name}</span>
        </div>
        {/* Timer */}
        <span className="font-mono text-[#06b6d4] text-base tabular-nums tracking-widest">
          {formatTime(session.elapsedSec)}
        </span>
        {/* Buttons */}
        <div className="flex items-center gap-1.5">
          <button onClick={() => session.isPaused ? resumeSession() : pauseSession()}
            className="p-1.5 rounded-lg transition-all active:scale-95"
            style={{ background: '#161d2e', border: '1px solid #1e2a3e' }}>
            {session.isPaused
              ? <Play  className="w-4 h-4 text-emerald-400" />
              : <Pause className="w-4 h-4 text-[#64748b]"   />}
          </button>
          <button onClick={() => setShowEnd(true)}
            className="p-1.5 rounded-lg transition-all active:scale-95"
            style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)' }}>
            <StopCircle className="w-4 h-4 text-red-400" />
          </button>
        </div>
      </div>

      {/* ══ MAIN ROW: [drive view] + [right panel] ═══════════════════════════ */}
      <div className="flex-1 flex min-h-0 gap-0">

        {/* ── CENTRE: nav banner + 3D scene ──────────────────────────────────── */}
        <div className="flex-1 flex flex-col min-h-0 min-w-0 p-2.5 gap-2">

          {/* Nav instruction — matches image top dark banner with yellow text */}
          <div className="shrink-0 rounded-xl flex items-center gap-3 px-4 py-3"
            style={{ background: 'rgba(8,14,30,0.92)', border: '1px solid #1a2540' }}>
            {/* Speed limit circle — top-left of banner like image */}
            <div
              className="w-11 h-11 rounded-full flex items-center justify-center font-bold text-sm shrink-0 transition-all"
              style={{
                border: isOver ? '3.5px solid #ef4444' : '3.5px solid #ffffff',
                color:  isOver ? '#ef4444' : '#ffffff',
                background: isOver ? 'rgba(239,68,68,0.15)' : 'rgba(0,0,0,0.55)',
                boxShadow: isOver ? '0 0 12px rgba(239,68,68,0.4)' : 'none',
              }}>
              {route.speedLimit === 999 ? '∞' : limitD.value}
            </div>
            {/* Instruction text */}
            <div className="flex-1 text-center min-w-0">
              <p className="text-white font-bold text-base leading-tight">
                {session.currentInstruction}
              </p>
              {session.nextInstruction && (
                <p className="text-[#f59e0b] text-sm font-semibold mt-0.5 truncate">
                  {session.nextInstruction}
                </p>
              )}
            </div>
            {/* Nav icon */}
            <div className="w-8 h-8 rounded-lg bg-[#3b82f6] flex items-center justify-center shrink-0">
              <Navigation className="w-4 h-4 text-white" />
            </div>
          </div>

          {/* ── 3D DRIVE VIEW — takes the biggest chunk ─────────────────────── */}
          <div
            className="flex-1 relative rounded-2xl overflow-hidden min-h-0 cursor-grab active:cursor-grabbing"
            style={{ border: '1px solid #1a2540', touchAction: 'none' }}
            onPointerDown={onPD}
            onPointerMove={onPM}
            onPointerUp={onPU}
            onPointerLeave={onPU}
          >
            <ThreeDriveScene
              speedKmh={session.currentSpeedKmh}
              isPaused={session.isPaused}
              routeType={route.type}
              trafficSide={route.trafficSide}
              laneStatus={session.laneStatus}
              routeCoords={route.coordinates}
              onSpeedChange={handleSpeedChange}
              sceneRef={driveRef}
            />

            {/* Red border pulse when over speed */}
            {isOver && !session.isPaused && (
              <div className="absolute inset-0 pointer-events-none rounded-2xl animate-pulse"
                style={{ boxShadow: 'inset 0 0 50px rgba(239,68,68,0.4)' }} />
            )}

            {/* Pause overlay */}
            {session.isPaused && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 rounded-2xl"
                style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)' }}>
                <Pause className="w-12 h-12 text-white opacity-80" />
                <p className="text-white font-bold text-2xl tracking-widest">PAUSED</p>
                <button onClick={resumeSession}
                  className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-black font-bold px-7 py-3 rounded-xl transition-colors active:scale-95">
                  <Play className="w-4 h-4 fill-current" /> Resume
                </button>
              </div>
            )}

            {/* Touch hint */}
            <FadeHint />

            {/* Mobile on-screen controls */}
            <div className="absolute bottom-3 inset-x-3 flex items-end justify-between pointer-events-none lg:hidden">
              <div className="flex gap-2 pointer-events-auto">
                <HoldBtn onStart={() => driveRef.current?.setSteer(-1)} onEnd={() => driveRef.current?.setSteer(0)}>
                  <ChevronLeft className="w-6 h-6 text-white" />
                </HoldBtn>
                <HoldBtn onStart={() => driveRef.current?.setSteer(1)} onEnd={() => driveRef.current?.setSteer(0)}>
                  <ChevronRight className="w-6 h-6 text-white" />
                </HoldBtn>
              </div>
              <div className="flex flex-col gap-2 pointer-events-auto">
                <HoldBtn
                  onStart={() => driveRef.current?.setThrottle(1)}
                  onEnd={() => driveRef.current?.setThrottle(0)}
                  color="green">
                  <ArrowUp className="w-5 h-5 text-emerald-400" />
                </HoldBtn>
                <HoldBtn
                  onStart={() => driveRef.current?.setBrake(1)}
                  onEnd={() => driveRef.current?.setBrake(0)}
                  color="red">
                  <ArrowDown className="w-5 h-5 text-red-400" />
                </HoldBtn>
              </div>
            </div>
          </div>

          {/* ══ BOTTOM HUD — exactly like image: minimap | speed | lane | pos | instructor ══ */}
          <div className="shrink-0 grid grid-cols-5 gap-2" style={{ height: '108px' }}>

            {/* 1. Mini route map */}
            <div className="rounded-xl flex flex-col items-center justify-center gap-1 p-2"
              style={{ background: '#0d1520', border: '1px solid #1a2540' }}>
              <SpiralMap routeType={route.type} progress={progress}
                landmark={route.landmarks[Math.min(
                  Math.floor(progress / (100 / Math.max(route.landmarks.length, 1))),
                  route.landmarks.length - 1
                )]} />
            </div>

            {/* 2. Speed dial */}
            <div className="rounded-xl flex flex-col items-center justify-center"
              style={{ background: '#0d1520', border: '1px solid #1a2540' }}>
              <SpeedDial value={speedD.value} max={route.speedLimit === 999 ? 220 : Math.round(limitD.value * 1.5)} isOver={isOver} unit={speedD.unit} />
              <p className="text-[10px] text-[#4a6080] mt-0.5">Speed</p>
            </div>

            {/* 3. Lane */}
            <div className="rounded-xl flex flex-col items-center justify-center gap-1"
              style={{ background: '#0d1520', border: '1px solid #1a2540' }}>
              <LaneSVG color={laneCol} />
              <p className="text-[10px] text-[#4a6080]">Lane</p>
              <p className="text-xs font-bold capitalize" style={{ color: laneCol }}>{session.laneStatus}</p>
            </div>

            {/* 4. Position */}
            <div className="rounded-xl flex flex-col items-center justify-center gap-1"
              style={{ background: '#0d1520', border: '1px solid #1a2540' }}>
              <PositionSVG color={posCol} />
              <p className="text-[10px] text-[#4a6080]">Position</p>
              <p className="text-xs font-bold capitalize" style={{ color: posCol }}>{session.positionStatus}</p>
            </div>

            {/* 5. Instructor */}
            <div className="rounded-xl flex flex-col items-center justify-center gap-1.5"
              style={{ background: '#0d1520', border: '1px solid #1a2540' }}>
              <div className="w-10 h-10 rounded-full flex items-center justify-center"
                style={{ border: '2px solid #22c55e', background: 'rgba(34,197,94,0.1)' }}>
                <User className="w-5 h-5 text-emerald-400" />
              </div>
              <p className="text-[10px] text-white font-medium">Instructor</p>
              <p className="text-[10px] font-bold text-emerald-400">Connected</p>
            </div>
          </div>
        </div>

        {/* ── RIGHT SIDEBAR — scenario info, exactly like image ──────────────── */}
        <div className="hidden lg:flex flex-col w-[260px] shrink-0 p-5 gap-4 overflow-y-auto"
          style={{ background: '#0d1120', borderLeft: '1px solid #1a2540' }}>

          {/* Scenario label + title */}
          <div>
            <p className="text-[#3b82f6] text-xs font-semibold uppercase tracking-widest mb-2">Scenario</p>
            <h2 className="text-white font-bold text-xl leading-snug">{route.name}</h2>
          </div>

          <p className="text-[#6b84a0] text-sm leading-relaxed">{route.description}</p>

          <div style={{ height: '1px', background: '#1a2540' }} />

          {/* Objective */}
          <div>
            <p className="text-[#3b82f6] text-xs font-semibold uppercase tracking-widest mb-3">Objective</p>
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
                style={{ border: '2px solid #f59e0b', background: 'rgba(245,158,11,0.1)' }}>
                <Navigation className="w-4 h-4 text-[#f59e0b]" />
              </div>
              <div className="min-w-0">
                <p className="text-[#8da0b8] text-sm leading-snug">{session.currentInstruction}</p>
                {session.nextInstruction && (
                  <p className="text-[#f59e0b] text-sm font-semibold mt-1 leading-snug">{session.nextInstruction}</p>
                )}
              </div>
            </div>
          </div>

          <div style={{ height: '1px', background: '#1a2540' }} />

          {/* Live stats */}
          <div className="space-y-2.5">
            {[
              { label: 'Speed',    val: `${speedD.value} ${speedD.unit}`, col: isOver ? '#ef4444' : '#22c55e' },
              { label: 'Distance', val: `${session.distanceCoveredKm.toFixed(2)} / ${route.distanceKm} km`, col: '#06b6d4' },
              { label: 'Time',     val: formatTime(session.elapsedSec), col: '#8da0b8' },
            ].map(({ label, val, col }) => (
              <div key={label} className="flex items-center justify-between">
                <span className="text-[#4a6080] text-xs">{label}</span>
                <span className="text-sm font-semibold" style={{ color: col }}>{val}</span>
              </div>
            ))}
          </div>

          {/* Progress bar */}
          <div>
            <div className="flex justify-between text-[10px] text-[#4a6080] mb-1.5">
              <span>Progress</span><span>{progress.toFixed(0)}%</span>
            </div>
            <div className="h-1.5 rounded-full overflow-hidden" style={{ background: '#1a2540' }}>
              <div className="h-full rounded-full transition-all duration-700"
                style={{ width: `${progress}%`, background: 'linear-gradient(90deg,#3b82f6,#06b6d4)' }} />
            </div>
          </div>

          <div className="mt-auto pt-2">
            <button onClick={() => setShowEnd(true)}
              className="w-full py-2.5 rounded-xl text-sm font-semibold text-red-400 transition-all active:scale-95"
              style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)' }}>
              End Session
            </button>
          </div>
        </div>
      </div>

      {/* ══ END CONFIRM MODAL ════════════════════════════════════════════════ */}
      {showEnd && (
        <div className="absolute inset-0 flex items-end sm:items-center justify-center z-50 p-4"
          style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}>
          <div className="w-full max-w-sm rounded-2xl p-6"
            style={{ background: '#111827', border: '1px solid #1e2a3e' }}>
            <h3 className="text-white font-bold text-lg mb-1">End Session?</h3>
            <p className="text-[#64748b] text-sm mb-5">
              {session.distanceCoveredKm.toFixed(2)} km · {formatTime(session.elapsedSec)}
            </p>
            <div className="flex gap-3">
              <button onClick={() => setShowEnd(false)}
                className="flex-1 py-3 rounded-xl text-[#64748b] text-sm font-medium transition-colors hover:text-white"
                style={{ border: '1px solid #1e2a3e' }}>
                Keep Going
              </button>
              <button onClick={() => endSession(false)}
                className="flex-1 py-3 rounded-xl text-red-400 font-bold text-sm active:scale-95 transition-all"
                style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.35)' }}>
                End
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function FadeHint() {
  const [v, setV] = useState(true);
  useEffect(() => { const t = setTimeout(() => setV(false), 4000); return () => clearTimeout(t); }, []);
  if (!v) return null;
  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
      <div className="rounded-xl px-4 py-2.5 text-center"
        style={{ background: 'rgba(0,0,0,0.6)', border: '1px solid rgba(255,255,255,0.08)', backdropFilter: 'blur(6px)' }}>
        <p className="text-white/70 text-xs">Drag to steer · Swipe ↑↓ for throttle/brake</p>
        <p className="text-white/40 text-[10px] mt-0.5">Arrow keys / WASD on desktop</p>
      </div>
    </div>
  );
}

function HoldBtn({ children, onStart, onEnd, color }: {
  children: React.ReactNode; onStart: () => void; onEnd: () => void; color?: 'green' | 'red';
}) {
  return (
    <button
      className="w-14 h-14 rounded-full flex items-center justify-center active:scale-90 transition-transform"
      style={{
        background: color === 'green' ? 'rgba(34,197,94,0.2)' : color === 'red' ? 'rgba(239,68,68,0.2)' : 'rgba(0,0,0,0.5)',
        border: `1px solid ${color === 'green' ? 'rgba(34,197,94,0.4)' : color === 'red' ? 'rgba(239,68,68,0.4)' : 'rgba(255,255,255,0.2)'}`,
      }}
      onPointerDown={(e) => { e.stopPropagation(); onStart(); }}
      onPointerUp={(e)   => { e.stopPropagation(); onEnd();   }}
      onPointerLeave={onEnd}
    >{children}</button>
  );
}

// Spiral roundabout minimap — matches image exactly
function SpiralMap({ routeType, progress, landmark }: { routeType: string; progress: number; landmark?: string }) {
  if (routeType === 'roundabout') {
    const cx = 38, cy = 38;
    const rings = [10, 16, 22, 28];
    const angle = (progress / 100) * 360 - 90;
    return (
      <div className="flex flex-col items-center gap-1 w-full">
        <svg viewBox="0 0 76 76" className="w-16 h-16">
          {/* Spiral rings */}
          {rings.map(r => (
            <circle key={r} cx={cx} cy={cy} r={r} fill="none" stroke="#1a3050" strokeWidth="1.4" strokeDasharray="2.5 2" />
          ))}
          {/* Active progress on outer ring */}
          <circle cx={cx} cy={cy} r={28} fill="none" stroke="#3b82f6" strokeWidth="2.2"
            strokeDasharray={`${(progress / 100) * 175.9} 175.9`}
            transform={`rotate(-90 ${cx} ${cy})`} />
          {/* Exit arrows — 4 compass points */}
          {[0, 90, 180, 270].map(deg => {
            const rad = (deg - 90) * Math.PI / 180;
            const x1 = cx + 28 * Math.cos(rad), y1 = cy + 28 * Math.sin(rad);
            const x2 = cx + 36 * Math.cos(rad), y2 = cy + 36 * Math.sin(rad);
            return (
              <g key={deg}>
                <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="#f59e0b" strokeWidth="1.5" strokeLinecap="round" />
                <polygon
                  points={`${x2},${y2} ${x2 - 2 * Math.sin(rad) - 2 * Math.cos(rad)},${y2 + 2 * Math.cos(rad) - 2 * Math.sin(rad)} ${x2 + 2 * Math.sin(rad) - 2 * Math.cos(rad)},${y2 - 2 * Math.cos(rad) - 2 * Math.sin(rad)}`}
                  fill="#f59e0b" />
              </g>
            );
          })}
          {/* Car dot */}
          <circle
            cx={cx + 28 * Math.cos(angle * Math.PI / 180)}
            cy={cy + 28 * Math.sin(angle * Math.PI / 180)}
            r="3.5" fill="#f59e0b" />
          {/* Centre */}
          <circle cx={cx} cy={cy} r="5" fill="#0d1520" stroke="#3b82f6" strokeWidth="1.5" />
        </svg>
        {landmark && (
          <div className="text-center px-1">
            <p className="text-[9px] text-[#f59e0b] font-semibold leading-tight truncate w-full">{landmark}</p>
          </div>
        )}
      </div>
    );
  }
  // Highway / urban path
  const dx = (progress / 100) * 56, dy = -Math.sin((progress / 100) * Math.PI) * 8;
  return (
    <div className="flex flex-col items-center gap-1 w-full">
      <svg viewBox="0 0 76 50" className="w-16 h-12">
        <path d="M8 30 Q38 8 68 30" stroke="#1a3050" strokeWidth="4" fill="none" strokeLinecap="round" />
        <path d="M8 30 Q38 8 68 30" stroke="#3b82f6" strokeWidth="4" fill="none" strokeLinecap="round"
          strokeDasharray={`${(progress / 100) * 72} 80`} />
        <circle cx={8 + dx} cy={30 + dy} r="4" fill="#f59e0b" />
      </svg>
      {landmark && (
        <p className="text-[9px] text-[#f59e0b] font-semibold leading-tight truncate px-1 text-center w-full">{landmark}</p>
      )}
    </div>
  );
}

// Analogue speed dial matching image
function SpeedDial({ value, max, isOver, unit }: { value: number; max: number; isOver: boolean; unit: string }) {
  const pct   = Math.min(1, value / max);
  const color = isOver ? '#ef4444' : '#3b82f6';
  const cx = 46, cy = 46, r = 34;
  const toRad = (d: number) => (d - 90) * Math.PI / 180;
  const arc = (s: number, e: number) => {
    const sr = toRad(s), er = toRad(e), lg = e - s > 180 ? 1 : 0;
    return `M${cx + r * Math.cos(sr)},${cy + r * Math.sin(sr)} A${r},${r} 0 ${lg} 1 ${cx + r * Math.cos(er)},${cy + r * Math.sin(er)}`;
  };
  const needleRad = toRad(-130 + pct * 260);
  const ticks = Array.from({ length: 9 }, (_, i) => {
    const a = toRad(-130 + i * 32.5);
    return { x1: cx + 26 * Math.cos(a), y1: cy + 26 * Math.sin(a), x2: cx + 33 * Math.cos(a), y2: cy + 33 * Math.sin(a) };
  });
  return (
    <svg viewBox="0 0 92 82" className="w-20 h-[72px]">
      {/* Track zones */}
      <path d={arc(-130, -10)} fill="none" stroke="#0d2010" strokeWidth="6" strokeLinecap="round" />
      <path d={arc(-10,   60)} fill="none" stroke="#2a200a" strokeWidth="6" strokeLinecap="round" />
      <path d={arc(60,   130)} fill="none" stroke="#2a0808" strokeWidth="6" strokeLinecap="round" />
      {/* Active arc */}
      {pct > 0 && <path d={arc(-130, -130 + pct * 260)} fill="none" stroke={color} strokeWidth="6" strokeLinecap="round" />}
      {/* Ticks */}
      {ticks.map((t, i) => <line key={i} x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2} stroke="#223344" strokeWidth="1.5" />)}
      {/* Needle */}
      <line x1={cx} y1={cy} x2={cx + 26 * Math.cos(needleRad)} y2={cy + 26 * Math.sin(needleRad)} stroke={color} strokeWidth="2.5" strokeLinecap="round" />
      <circle cx={cx} cy={cy} r="4" fill={color} />
      <circle cx={cx} cy={cy} r="2" fill="#0a0e1a" />
      {/* Value */}
      <text x={cx} y={cy + 14} textAnchor="middle" fill="white" fontSize="17" fontWeight="700" fontFamily="monospace">{value}</text>
    </svg>
  );
}

// Lane diagram with directional arrow like image
function LaneSVG({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 44 52" className="w-9 h-11">
      {/* Road edges */}
      <line x1="8"  y1="4" x2="5"  y2="48" stroke="#1a2e48" strokeWidth="3" strokeLinecap="round" />
      <line x1="36" y1="4" x2="39" y2="48" stroke="#1a2e48" strokeWidth="3" strokeLinecap="round" />
      {/* Centre dashes */}
      {[6,14,22,30].map(y => <line key={y} x1="22" y1={y} x2="22" y2={y+5} stroke="#1a2e48" strokeWidth="2" strokeLinecap="round" />)}
      {/* Arrow pointing up */}
      <path d="M22 8 L17 16 L20 16 L20 26 L24 26 L24 16 L27 16 Z" fill={color} opacity="0.9" />
      {/* Car */}
      <rect x="16" y="30" width="12" height="18" rx="3" fill={color} />
      <rect x="17.5" y="31.5" width="9" height="6" rx="1.5" fill="#0a0e1a" opacity="0.7" />
      {/* Wheels */}
      <rect x="14" y="33" width="2.5" height="5" rx="1" fill="#111" />
      <rect x="27.5" y="33" width="2.5" height="5" rx="1" fill="#111" />
      <rect x="14" y="42" width="2.5" height="5" rx="1" fill="#111" />
      <rect x="27.5" y="42" width="2.5" height="5" rx="1" fill="#111" />
    </svg>
  );
}

// Position diagram — top-down car between lane lines like image
function PositionSVG({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 48 52" className="w-9 h-11">
      {/* Road edges */}
      <line x1="4"  y1="4" x2="4"  y2="48" stroke="#1a2e48" strokeWidth="3" strokeLinecap="round" />
      <line x1="44" y1="4" x2="44" y2="48" stroke="#1a2e48" strokeWidth="3" strokeLinecap="round" />
      {/* Dashes — centre */}
      {[6,14,22,30,38].map(y => <line key={y} x1="24" y1={y} x2="24" y2={y+5} stroke="#1a2e48" strokeWidth="1.5" strokeLinecap="round" />)}
      {/* Car — centred */}
      <rect x="18" y="16" width="12" height="22" rx="3" fill={color} />
      <rect x="19.5" y="17.5" width="9" height="7" rx="1.5" fill="#0a0e1a" opacity="0.7" />
      {/* Wheels */}
      <rect x="15"  y="19" width="3" height="6" rx="1" fill="#111" />
      <rect x="30"  y="19" width="3" height="6" rx="1" fill="#111" />
      <rect x="15"  y="31" width="3" height="6" rx="1" fill="#111" />
      <rect x="30"  y="31" width="3" height="6" rx="1" fill="#111" />
    </svg>
  );
}