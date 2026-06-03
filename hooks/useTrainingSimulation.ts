// hooks/useTrainingSimulation.ts
// Handles: timer tick, landmark instructions, lane/position scoring.
// Speed is now driven by the Three.js scene via onSpeedChange → store.updateSpeed.
'use client';
import { useEffect, useRef, useCallback } from 'react';
import { useAppStore } from '@/lib/store';

export function useTrainingSimulation() {
  const store = useAppStore();
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const simRef = useRef({ lastLaneCheck: 0, instructionIndex: 0 });

  const tick = useCallback(() => {
    const { session } = useAppStore.getState();
    if (!session.isActive || session.isPaused || !session.route) return;

    // 1. Timer + distance (distance driven by speed ref)
    store.tickTimer();

    // 2. Lane / position status (periodic random events — real GPS would replace this)
    simRef.current.lastLaneCheck++;
    if (simRef.current.lastLaneCheck >= 12) {
      simRef.current.lastLaneCheck = 0;
      const r = Math.random();
      store.updateLaneStatus(r > 0.93 ? 'violation' : r > 0.82 ? 'warning' : 'correct');
      store.updatePositionStatus(Math.random() > 0.84 ? 'fair' : 'good');
    }

    // 3. Landmark-based instructions
    const { landmarks, distanceKm, name } = session.route;
    const fraction    = session.distanceCoveredKm / distanceKm;
    const lmIdx       = Math.min(Math.floor(fraction * landmarks.length), landmarks.length - 1);

    if (lmIdx !== simRef.current.instructionIndex) {
      simRef.current.instructionIndex = lmIdx;
      const next = landmarks[lmIdx + 1];
      store.setInstruction(
        lmIdx === 0 ? `Starting on ${name}` : `Pass ${landmarks[lmIdx]}`,
        next ? `Next: ${next}` : 'Approaching destination',
      );
    }

    // 4. Completion check
    if (session.distanceCoveredKm >= distanceKm) {
      store.endSession(true);
    }
  }, [store]);

  useEffect(() => {
    const { session } = useAppStore.getState();
    if (session.isActive && !session.isPaused) {
      intervalRef.current = setInterval(tick, 1000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [store, tick]);

  // Re-subscribe when session active/paused state changes
  useEffect(() => {
    return useAppStore.subscribe((state) => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (state.session.isActive && !state.session.isPaused) {
        intervalRef.current = setInterval(tick, 1000);
      }
    });
  }, [tick]);

  return null;
}
