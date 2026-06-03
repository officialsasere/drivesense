// components/dashboard/ProgressView.tsx
'use client';
import { useAppStore } from '@/lib/store';
import { formatTime, scoreToGrade } from '@/lib/utils';
import { WORLD_DATA } from '@/lib/world-data';
import { Trophy, TrendingUp, Clock, Route, Star, BarChart2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export function ProgressView() {
  const { progress } = useAppStore();

  const totalRoutes = WORLD_DATA.reduce((a, c) => a + c.states.reduce((b, s) => b + s.routes.length, 0), 0);
  const completionPct = totalRoutes > 0 ? Math.round((progress.completedRoutes.length / totalRoutes) * 100) : 0;

  const allScores = Object.values(progress.bestScores);
  const avgBestScore = allScores.length
    ? Math.round(allScores.reduce((a, b) => a + b, 0) / allScores.length)
    : 0;

  return (
    <div className="p-4 md:p-6 space-y-6 animate-fade-in">
      <div>
        <h1 className="font-display text-2xl md:text-3xl font-bold text-white">Your Progress</h1>
        <p className="text-ds-muted text-sm mt-1">Track your driving journey</p>
      </div>

      {/* Overall completion */}
      <div className="p-5 rounded-2xl bg-ds-card border border-ds-border">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-ds-muted text-xs uppercase tracking-wider">Overall Completion</p>
            <p className="font-display text-3xl font-bold text-white mt-1">{completionPct}%</p>
          </div>
          <div className="w-16 h-16 relative">
            <svg viewBox="0 0 60 60" className="w-full h-full -rotate-90">
              <circle cx="30" cy="30" r="24" fill="none" stroke="#1E2A3E" strokeWidth="6" />
              <circle
                cx="30" cy="30" r="24" fill="none" stroke="#3B82F6" strokeWidth="6"
                strokeLinecap="round"
                strokeDasharray={`${(completionPct / 100) * 151} 151`}
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <Route className="w-5 h-5 text-ds-blue" />
            </div>
          </div>
        </div>
        <div className="h-2 bg-ds-border rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-ds-blue to-ds-cyan rounded-full transition-all duration-700"
            style={{ width: `${completionPct}%` }}
          />
        </div>
        <p className="text-xs text-ds-muted mt-2">{progress.completedRoutes.length} of {totalRoutes} routes completed</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { icon: Trophy,   label: 'Best Avg Score',  value: avgBestScore > 0 ? `${avgBestScore}%` : '—', color: 'amber' },
          { icon: TrendingUp, label: 'Total Sessions', value: progress.totalSessions.toString(), color: 'blue' },
          { icon: Clock,    label: 'Drive Time',       value: formatTime(progress.totalDrivingMin * 60), color: 'cyan' },
          { icon: Star,     label: 'Routes Aced',      value: Object.values(progress.bestScores).filter(s => s >= 90).length.toString(), color: 'green' },
        ].map(({ icon: Icon, label, value, color }) => (
          <div key={label} className={cn(
            'p-4 rounded-xl border',
            color === 'amber' ? 'bg-amber-500/10 border-amber-500/20' :
            color === 'blue'  ? 'bg-blue-500/10  border-blue-500/20'  :
            color === 'cyan'  ? 'bg-cyan-500/10  border-cyan-500/20'  :
            'bg-green-500/10 border-green-500/20'
          )}>
            <Icon className={cn('w-4 h-4 mb-2',
              color === 'amber' ? 'text-ds-amber' :
              color === 'blue'  ? 'text-ds-blue'  :
              color === 'cyan'  ? 'text-ds-cyan'  :
              'text-ds-green'
            )} />
            <p className="font-display text-xl font-bold text-white">{value}</p>
            <p className="text-xs text-ds-muted mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Session history */}
      {progress.sessions.length > 0 ? (
        <div>
          <h2 className="font-display text-lg font-bold text-white mb-3">Session History</h2>
          <div className="space-y-2">
            {progress.sessions.map((session, i) => {
              const { grade, color } = scoreToGrade(session.score);
              return (
                <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-ds-card border border-ds-border">
                  <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center font-display font-bold text-sm shrink-0', color,
                    session.score >= 80 ? 'bg-green-500/10' : session.score >= 60 ? 'bg-amber-500/10' : 'bg-red-500/10'
                  )}>
                    {grade}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{session.routeName}</p>
                    <p className="text-[10px] text-ds-muted mt-0.5">
                      {formatTime(session.durationSec)} · {new Date(session.date).toLocaleDateString()}
                      {session.completed ? ' · Completed' : ' · Ended early'}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-semibold text-white">{session.score}%</p>
                    {(session.laneViolations > 0 || session.speedViolations > 0) && (
                      <p className="text-[10px] text-ds-red">
                        {session.laneViolations + session.speedViolations} violations
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="text-center py-12">
          <BarChart2 className="w-10 h-10 text-ds-muted mx-auto mb-3" />
          <p className="text-ds-muted text-sm">Complete your first training session to see progress here</p>
        </div>
      )}
    </div>
  );
}
