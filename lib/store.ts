// lib/store.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Country, State, Route } from './world-data';

export interface SessionStats {
  routeId: string;
  routeName: string;
  date: string;
  durationSec: number;
  avgSpeedKmh: number;
  maxSpeedKmh: number;
  score: number; // 0-100
  laneViolations: number;
  speedViolations: number;
  completed: boolean;
}

export interface UserProgress {
  totalSessions: number;
  totalDistanceKm: number;
  totalDrivingMin: number;
  bestScores: Record<string, number>;
  completedRoutes: string[];
  sessions: SessionStats[];
}

interface TrainingSession {
  country: Country | null;
  state: State | null;
  route: Route | null;
  isActive: boolean;
  isPaused: boolean;
  startedAt: number | null;
  elapsedSec: number;
  currentSpeedKmh: number;
  targetSpeedKmh: number;
  laneStatus: 'correct' | 'warning' | 'violation';
  positionStatus: 'good' | 'fair' | 'poor';
  currentInstruction: string;
  nextInstruction: string;
  distanceCoveredKm: number;
  laneViolations: number;
  speedViolations: number;
}

interface AppState {
  // Selection
  selectedCountryId: string | null;
  selectedStateId: string | null;
  selectedRouteId: string | null;

  // Training session
  session: TrainingSession;

  // User progress (persisted)
  progress: UserProgress;

  // UI
  sidebarOpen: boolean;
  activeTab: 'dashboard' | 'train' | 'scenarios' | 'progress';

  // Actions
  setCountry: (id: string | null) => void;
  setState: (id: string | null) => void;
  setRoute: (id: string | null) => void;
  startSession: (country: Country, state: State, route: Route) => void;
  pauseSession: () => void;
  resumeSession: () => void;
  endSession: (completed: boolean) => void;
  updateSpeed: (speed: number) => void;
  updateLaneStatus: (status: TrainingSession['laneStatus']) => void;
  updatePositionStatus: (status: TrainingSession['positionStatus']) => void;
  setInstruction: (current: string, next: string) => void;
  tickTimer: () => void;
  setSidebarOpen: (open: boolean) => void;
  setActiveTab: (tab: AppState['activeTab']) => void;
}

const DEFAULT_SESSION: TrainingSession = {
  country: null,
  state: null,
  route: null,
  isActive: false,
  isPaused: false,
  startedAt: null,
  elapsedSec: 0,
  currentSpeedKmh: 0,
  targetSpeedKmh: 0,
  laneStatus: 'correct',
  positionStatus: 'good',
  currentInstruction: '',
  nextInstruction: '',
  distanceCoveredKm: 0,
  laneViolations: 0,
  speedViolations: 0,
};

const DEFAULT_PROGRESS: UserProgress = {
  totalSessions: 0,
  totalDistanceKm: 0,
  totalDrivingMin: 0,
  bestScores: {},
  completedRoutes: [],
  sessions: [],
};

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      selectedCountryId: null,
      selectedStateId: null,
      selectedRouteId: null,
      session: DEFAULT_SESSION,
      progress: DEFAULT_PROGRESS,
      sidebarOpen: false,
      activeTab: 'dashboard',

      setCountry: (id) => set({ selectedCountryId: id, selectedStateId: null, selectedRouteId: null }),
      setState:   (id) => set({ selectedStateId: id, selectedRouteId: null }),
      setRoute:   (id) => set({ selectedRouteId: id }),

      startSession: (country, state, route) => set({
        session: {
          ...DEFAULT_SESSION,
          country,
          state,
          route,
          isActive: true,
          startedAt: Date.now(),
          targetSpeedKmh: route.speedLimit * 0.85,
          currentInstruction: `Start on ${route.name}`,
          nextInstruction: route.landmarks[0] ? `Head toward ${route.landmarks[0]}` : '',
        },
      }),

      pauseSession: () => set(s => ({ session: { ...s.session, isPaused: true } })),
      resumeSession: () => set(s => ({ session: { ...s.session, isPaused: false } })),

      endSession: (completed) => {
        const { session, progress } = get();
        if (!session.route) return;

        const score = Math.max(0, 100
          - session.laneViolations * 10
          - session.speedViolations * 5
          + (completed ? 20 : 0)
        );

        const newSession: SessionStats = {
          routeId: session.route.id,
          routeName: session.route.name,
          date: new Date().toISOString(),
          durationSec: session.elapsedSec,
          avgSpeedKmh: session.currentSpeedKmh,
          maxSpeedKmh: session.currentSpeedKmh,
          score: Math.min(100, score),
          laneViolations: session.laneViolations,
          speedViolations: session.speedViolations,
          completed,
        };

        const bestScores = { ...progress.bestScores };
        if (!bestScores[session.route.id] || score > bestScores[session.route.id]) {
          bestScores[session.route.id] = score;
        }

        const completedRoutes = completed && !progress.completedRoutes.includes(session.route.id)
          ? [...progress.completedRoutes, session.route.id]
          : progress.completedRoutes;

        set({
          session: DEFAULT_SESSION,
          progress: {
            totalSessions: progress.totalSessions + 1,
            totalDistanceKm: progress.totalDistanceKm + session.distanceCoveredKm,
            totalDrivingMin: progress.totalDrivingMin + Math.floor(session.elapsedSec / 60),
            bestScores,
            completedRoutes,
            sessions: [newSession, ...progress.sessions].slice(0, 50),
          },
        });
      },

      updateSpeed: (speed) => set(s => ({ session: { ...s.session, currentSpeedKmh: speed } })),
      updateLaneStatus: (status) => set(s => ({ session: { ...s.session, laneStatus: status } })),
      updatePositionStatus: (status) => set(s => ({ session: { ...s.session, positionStatus: status } })),
      setInstruction: (current, next) => set(s => ({
        session: { ...s.session, currentInstruction: current, nextInstruction: next },
      })),

      tickTimer: () => set(s => {
        if (!s.session.isActive || s.session.isPaused) return s;
        const newElapsed = s.session.elapsedSec + 1;
        const speed = s.session.currentSpeedKmh;
        const distAdded = speed / 3600; // km per second
        return {
          session: {
            ...s.session,
            elapsedSec: newElapsed,
            distanceCoveredKm: s.session.distanceCoveredKm + distAdded,
          },
        };
      }),

      setSidebarOpen: (open) => set({ sidebarOpen: open }),
      setActiveTab: (tab) => set({ activeTab: tab }),
    }),
    {
      name: 'drivesense-storage',
      partialize: (state) => ({ progress: state.progress }),
    }
  )
);
