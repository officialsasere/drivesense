// components/training/ScenariosView.tsx
'use client';
import { useState } from 'react';
import { WORLD_DATA, DIFFICULTY_CONFIG, TYPE_CONFIG, type Route, type Country, type State } from '@/lib/world-data';
import { useAppStore } from '@/lib/store';
import { cn } from '@/lib/utils';
import { Clock, MapPin, Gauge, Play } from 'lucide-react';

type DiffFilter = 'all' | 'beginner' | 'intermediate' | 'advanced';
type TypeFilter = 'all' | 'urban' | 'highway' | 'rural' | 'roundabout' | 'motorway';

interface FlatRoute { route: Route; country: Country; state: State }

function getAllRoutes(): FlatRoute[] {
  const result: FlatRoute[] = [];
  for (const country of WORLD_DATA) {
    for (const state of country.states) {
      for (const route of state.routes) {
        result.push({ route, country, state });
      }
    }
  }
  return result;
}

export function ScenariosView() {
  const [diffFilter, setDiffFilter] = useState<DiffFilter>('all');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const { startSession, progress } = useAppStore();

  const all = getAllRoutes();
  const filtered = all.filter(({ route }) => {
    if (diffFilter !== 'all' && route.difficulty !== diffFilter) return false;
    if (typeFilter !== 'all' && route.type !== typeFilter) return false;
    return true;
  });

  return (
    <div className="p-4 md:p-6 space-y-5 animate-fade-in">
      <div>
        <h1 className="font-display text-2xl md:text-3xl font-bold text-white">Scenarios</h1>
        <p className="text-ds-muted text-sm mt-1">{all.length} routes available worldwide</p>
      </div>

      {/* Filters */}
      <div className="space-y-2">
        <FilterRow
          label="Difficulty"
          options={['all', 'beginner', 'intermediate', 'advanced']}
          value={diffFilter}
          onChange={(v) => setDiffFilter(v as DiffFilter)}
          renderLabel={(v) => v === 'all' ? 'All' : DIFFICULTY_CONFIG[v as keyof typeof DIFFICULTY_CONFIG]?.label ?? v}
        />
        <FilterRow
          label="Type"
          options={['all', 'urban', 'highway', 'motorway', 'roundabout', 'rural']}
          value={typeFilter}
          onChange={(v) => setTypeFilter(v as TypeFilter)}
          renderLabel={(v) => v === 'all' ? 'All' : (TYPE_CONFIG[v as keyof typeof TYPE_CONFIG]?.icon ?? '') + ' ' + v}
        />
      </div>

      {/* Route cards */}
      <div className="space-y-3">
        {filtered.length === 0 && (
          <div className="text-center py-12">
            <p className="text-ds-muted">No routes match your filters</p>
          </div>
        )}
        {filtered.map(({ route, country, state }) => {
          const diff      = DIFFICULTY_CONFIG[route.difficulty];
          const completed = progress.completedRoutes.includes(route.id);
          const best      = progress.bestScores[route.id];

          return (
            <div key={route.id} className="p-4 rounded-xl bg-ds-card border border-ds-border">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                    <span className="text-base">{country.flag}</span>
                    <span className="text-[10px] text-ds-muted">{state.name}</span>
                    {completed && <span className="text-[10px] px-1.5 py-0.5 bg-green-500/10 border border-green-500/20 text-ds-green rounded-full">✓ Done</span>}
                  </div>
                  <h3 className="font-medium text-white text-sm">{route.name}</h3>
                  <p className="text-ds-muted text-xs mt-0.5 line-clamp-1">{route.description}</p>
                </div>
                <div className="flex flex-col items-end gap-1.5 shrink-0">
                  <span className={cn('text-[10px] px-2 py-0.5 rounded-full border font-medium', diff.color, diff.bg, diff.border)}>
                    {diff.label}
                  </span>
                  {best !== undefined && (
                    <span className="text-[10px] text-ds-muted">Best: {best}%</span>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 text-xs text-ds-muted">
                  <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{route.durationMin}m</span>
                  <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{route.distanceKm}km</span>
                  <span className="flex items-center gap-1">
                    <Gauge className="w-3 h-3" />
                    {route.speedLimit === 999 ? 'No limit' : `${route.speedLimit} ${country.speedUnit}`}
                  </span>
                </div>
                <button
                  onClick={() => startSession(country, state, route)}
                  className="flex items-center gap-1.5 bg-ds-blue hover:bg-blue-500 text-white px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                >
                  <Play className="w-3 h-3 fill-current" />
                  Drive
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function FilterRow({
  label, options, value, onChange, renderLabel,
}: {
  label: string;
  options: string[];
  value: string;
  onChange: (v: string) => void;
  renderLabel: (v: string) => string;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-ds-muted w-16 shrink-0">{label}:</span>
      <div className="flex gap-1.5 flex-wrap">
        {options.map(opt => (
          <button
            key={opt}
            onClick={() => onChange(opt)}
            className={cn(
              'text-xs px-2.5 py-1 rounded-lg border transition-all duration-150 capitalize',
              value === opt
                ? 'bg-ds-blue border-ds-blue text-white'
                : 'bg-ds-card border-ds-border text-ds-muted hover:text-white hover:border-ds-blue/50'
            )}
          >
            {renderLabel(opt)}
          </button>
        ))}
      </div>
    </div>
  );
}
