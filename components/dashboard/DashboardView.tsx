// components/dashboard/DashboardView.tsx
'use client';
import { useAppStore } from '@/lib/store';
import { WORLD_DATA } from '@/lib/world-data';
import { formatTime, scoreToGrade } from '@/lib/utils';
import { Navigation, Clock, Route, Trophy, ChevronRight, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

export function DashboardView() {
  const { progress, setActiveTab } = useAppStore();
  const totalCountries = WORLD_DATA.length;
  const totalRoutes = WORLD_DATA.reduce((a, c) => a + c.states.reduce((b, s) => b + s.routes.length, 0), 0);

  const recentSessions = progress.sessions.slice(0, 3);
  const avgScore = recentSessions.length
    ? Math.round(recentSessions.reduce((a, s) => a + s.score, 0) / recentSessions.length)
    : 0;

  return (
    <div className="p-4 md:p-6 space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="font-display text-2xl md:text-3xl font-bold text-white">Dashboard</h1>
        <p className="text-ds-muted text-sm mt-1">Track your driving progress worldwide</p>
      </div>

      {/* Hero CTA */}
      <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-ds-blue/20 via-ds-card to-ds-cyan/10 border border-ds-blue/30 p-5">
        <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-ds-blue/10 blur-2xl" />
        <div className="relative">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-lg bg-ds-blue/20 border border-ds-blue/40 flex items-center justify-center">
              <Zap className="w-4 h-4 text-ds-blue" />
            </div>
            <span className="text-ds-blue text-sm font-medium">Ready to drive?</span>
          </div>
          <h2 className="font-display text-xl font-bold text-white mb-1">Start a Training Session</h2>
          <p className="text-ds-muted text-sm mb-4">
            Choose from {totalRoutes} routes across {totalCountries} countries
          </p>
          <button
            onClick={() => setActiveTab('train')}
            className="flex items-center gap-2 bg-ds-blue hover:bg-blue-500 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 glow-blue"
          >
            <Navigation className="w-4 h-4" />
            Choose a Route
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard
          label="Sessions"
          value={progress.totalSessions.toString()}
          icon={<Navigation className="w-4 h-4" />}
          color="blue"
        />
        <StatCard
          label="Drive Time"
          value={formatTime(progress.totalDrivingMin * 60)}
          icon={<Clock className="w-4 h-4" />}
          color="cyan"
        />
        <StatCard
          label="Routes Done"
          value={`${progress.completedRoutes.length}/${totalRoutes}`}
          icon={<Route className="w-4 h-4" />}
          color="green"
        />
        <StatCard
          label="Avg Score"
          value={avgScore > 0 ? `${avgScore}%` : '—'}
          icon={<Trophy className="w-4 h-4" />}
          color="amber"
        />
      </div>

      {/* Recent sessions */}
      {recentSessions.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-display text-lg font-bold text-white">Recent Sessions</h2>
            <button
              onClick={() => setActiveTab('progress')}
              className="text-ds-blue text-xs hover:underline"
            >
              View all
            </button>
          </div>
          <div className="space-y-2">
            {recentSessions.map((s, i) => {
              const { grade, color } = scoreToGrade(s.score);
              return (
                <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-ds-card border border-ds-border">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-white truncate">{s.routeName}</p>
                    <p className="text-xs text-ds-muted mt-0.5">
                      {formatTime(s.durationSec)} · {new Date(s.date).toLocaleDateString()}
                    </p>
                  </div>
                  <div className={cn('font-display font-bold text-lg ml-3', color)}>{grade}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* World routes preview */}
      <div>
        <h2 className="font-display text-lg font-bold text-white mb-3">Available Countries</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
          {WORLD_DATA.map(country => (
            <button
              key={country.id}
              onClick={() => setActiveTab('train')}
              className="flex items-center gap-2 p-3 rounded-xl bg-ds-card border border-ds-border hover:border-ds-blue/50 transition-colors text-left"
            >
              <span className="text-xl">{country.flag}</span>
              <div className="min-w-0">
                <p className="text-xs font-medium text-white truncate">{country.name}</p>
                <p className="text-[10px] text-ds-muted">
                  {country.states.reduce((a, s) => a + s.routes.length, 0)} routes
                </p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function StatCard({
  label, value, icon, color,
}: {
  label: string; value: string; icon: React.ReactNode;
  color: 'blue' | 'cyan' | 'green' | 'amber';
}) {
  const colorMap = {
    blue:  { text: 'text-ds-blue',  bg: 'bg-blue-500/10',  border: 'border-blue-500/20'  },
    cyan:  { text: 'text-ds-cyan',  bg: 'bg-cyan-500/10',  border: 'border-cyan-500/20'  },
    green: { text: 'text-ds-green', bg: 'bg-green-500/10', border: 'border-green-500/20' },
    amber: { text: 'text-ds-amber', bg: 'bg-amber-500/10', border: 'border-amber-500/20' },
  }[color];

  return (
    <div className={cn('p-4 rounded-xl border', colorMap.bg, colorMap.border)}>
      <div className={cn('mb-2', colorMap.text)}>{icon}</div>
      <p className="font-display text-xl font-bold text-white">{value}</p>
      <p className="text-xs text-ds-muted mt-0.5">{label}</p>
    </div>
  );
}
