// components/training/TrainView.tsx
'use client';
import { useState } from 'react';
import { useAppStore } from '@/lib/store';
import { WORLD_DATA, DIFFICULTY_CONFIG, TYPE_CONFIG, type Country, type State, type Route } from '@/lib/world-data';
import { cn } from '@/lib/utils';
import { ChevronRight, ChevronLeft, Play, Clock, MapPin, Gauge, AlertTriangle } from 'lucide-react';

type Step = 'country' | 'state' | 'route' | 'preview';

export function TrainView() {
  const [step, setStep] = useState<Step>('country');
  const [country, setCountry] = useState<Country | null>(null);
  const [state, setState] = useState<State | null>(null);
  const [route, setRoute] = useState<Route | null>(null);
  const { startSession } = useAppStore();

  const handleCountry = (c: Country) => { setCountry(c); setState(null); setRoute(null); setStep('state'); };
  const handleState   = (s: State)   => { setState(s);   setRoute(null); setStep('route'); };
  const handleRoute   = (r: Route)   => { setRoute(r);   setStep('preview'); };

  const handleBack = () => {
    if (step === 'state')   { setStep('country'); }
    if (step === 'route')   { setStep('state'); }
    if (step === 'preview') { setStep('route'); }
  };

  const handleStart = () => {
    if (country && state && route) startSession(country, state, route);
  };

  return (
    <div className="p-4 md:p-6 animate-fade-in">
      {/* Header + breadcrumb */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          {step !== 'country' && (
            <button onClick={handleBack} className="text-ds-muted hover:text-white transition-colors">
              <ChevronLeft className="w-5 h-5" />
            </button>
          )}
          <h1 className="font-display text-2xl font-bold text-white">Start Training</h1>
        </div>
        {/* Breadcrumb */}
        <div className="flex items-center gap-1 text-xs text-ds-muted mt-1 flex-wrap">
          <span className={country ? 'text-ds-blue' : 'text-ds-muted'}>
            {country ? country.flag + ' ' + country.name : 'Country'}
          </span>
          {country && <><ChevronRight className="w-3 h-3" />
          <span className={state ? 'text-ds-blue' : 'text-ds-muted'}>{state?.name ?? 'State'}</span></>}
          {state && <><ChevronRight className="w-3 h-3" />
          <span className={route ? 'text-ds-blue' : 'text-ds-muted'}>{route?.name ?? 'Route'}</span></>}
        </div>
      </div>

      {/* Step: Country */}
      {step === 'country' && (
        <div>
          <p className="text-ds-muted text-sm mb-4">Select your country to see available training routes</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {WORLD_DATA.map(c => (
              <button
                key={c.id}
                onClick={() => handleCountry(c)}
                className="flex items-center gap-3 p-4 rounded-xl bg-ds-card border border-ds-border hover:border-ds-blue/50 hover:bg-ds-blue/5 transition-all duration-200 text-left group"
              >
                <span className="text-3xl">{c.flag}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-white text-sm">{c.name}</p>
                  <p className="text-ds-muted text-xs mt-0.5">
                    {c.states.length} states · {c.states.reduce((a, s) => a + s.routes.length, 0)} routes ·{' '}
                    Drives on {c.trafficSide}
                  </p>
                </div>
                <ChevronRight className="w-4 h-4 text-ds-muted group-hover:text-ds-blue transition-colors shrink-0" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Step: State */}
      {step === 'state' && country && (
        <div>
          <p className="text-ds-muted text-sm mb-4">Choose a state or region in {country.name}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {country.states.map(s => (
              <button
                key={s.id}
                onClick={() => handleState(s)}
                className="flex items-center gap-3 p-4 rounded-xl bg-ds-card border border-ds-border hover:border-ds-blue/50 hover:bg-ds-blue/5 transition-all duration-200 text-left group"
              >
                <div className="w-10 h-10 rounded-lg bg-ds-blue/10 border border-ds-blue/20 flex items-center justify-center shrink-0">
                  <MapPin className="w-5 h-5 text-ds-blue" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-white text-sm">{s.name}</p>
                  <p className="text-ds-muted text-xs mt-0.5">{s.routes.length} routes available</p>
                </div>
                <ChevronRight className="w-4 h-4 text-ds-muted group-hover:text-ds-blue transition-colors shrink-0" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Step: Route */}
      {step === 'route' && state && (
        <div>
          <p className="text-ds-muted text-sm mb-4">Choose a route in {state.name}</p>
          <div className="space-y-3">
            {state.routes.map(r => {
              const diff = DIFFICULTY_CONFIG[r.difficulty];
              const type = TYPE_CONFIG[r.type];
              return (
                <button
                  key={r.id}
                  onClick={() => handleRoute(r)}
                  className="w-full p-4 rounded-xl bg-ds-card border border-ds-border hover:border-ds-blue/50 hover:bg-ds-blue/5 transition-all duration-200 text-left group"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="text-sm">{type.icon}</span>
                        <p className="font-medium text-white text-sm">{r.name}</p>
                      </div>
                      <p className="text-ds-muted text-xs mb-3 line-clamp-2">{r.description}</p>
                      <div className="flex items-center gap-3 flex-wrap">
                        <div className="flex items-center gap-1 text-xs text-ds-muted">
                          <Clock className="w-3 h-3" />
                          {r.durationMin} min
                        </div>
                        <div className="flex items-center gap-1 text-xs text-ds-muted">
                          <Gauge className="w-3 h-3" />
                          {r.speedLimit === 999 ? 'No limit' : `${r.speedLimit} ${country?.speedUnit ?? 'kmh'}`}
                        </div>
                        <div className="flex items-center gap-1 text-xs text-ds-muted">
                          <MapPin className="w-3 h-3" />
                          {r.distanceKm} km
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2 shrink-0">
                      <span className={cn('text-xs px-2 py-0.5 rounded-full border font-medium', diff.color, diff.bg, diff.border)}>
                        {diff.label}
                      </span>
                      <ChevronRight className="w-4 h-4 text-ds-muted group-hover:text-ds-blue transition-colors" />
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Step: Preview */}
      {step === 'preview' && route && country && state && (
        <div className="space-y-4">
          <div className="rounded-2xl overflow-hidden bg-ds-card border border-ds-border">
            {/* Map placeholder */}
            <div className="relative h-40 bg-gradient-to-br from-slate-800 to-slate-900 overflow-hidden">
              <MapPlaceholder />
              <div className="absolute top-3 left-3 glass rounded-lg px-3 py-1.5">
                <p className="text-white text-xs font-medium">{country.flag} {route.name}</p>
              </div>
              <div className="absolute top-3 right-3 glass rounded-lg px-2 py-1">
                <p className="text-ds-blue text-xs font-mono">
                  {route.coordinates.lat.toFixed(3)}, {route.coordinates.lng.toFixed(3)}
                </p>
              </div>
            </div>

            {/* Route details */}
            <div className="p-4 space-y-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-lg">{TYPE_CONFIG[route.type].icon}</span>
                  <h2 className="font-display text-lg font-bold text-white">{route.name}</h2>
                </div>
                <p className="text-ds-muted text-sm">{route.description}</p>
              </div>

              {/* Stats row */}
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: 'Distance', value: `${route.distanceKm} km` },
                  { label: 'Est. Time', value: `${route.durationMin} min` },
                  { label: 'Speed Limit', value: route.speedLimit === 999 ? 'Unlimited' : `${route.speedLimit} ${country.speedUnit}` },
                ].map(({ label, value }) => (
                  <div key={label} className="text-center p-2 rounded-lg bg-ds-bg">
                    <p className="text-white text-sm font-semibold">{value}</p>
                    <p className="text-ds-muted text-[10px] mt-0.5">{label}</p>
                  </div>
                ))}
              </div>

              {/* Landmarks */}
              <div>
                <p className="text-xs text-ds-muted font-medium mb-2 uppercase tracking-wider">Key Landmarks</p>
                <div className="flex flex-wrap gap-1.5">
                  {route.landmarks.map((lm, i) => (
                    <span key={i} className="text-xs px-2 py-1 rounded-lg bg-ds-bg border border-ds-border text-ds-muted">
                      {lm}
                    </span>
                  ))}
                </div>
              </div>

              {/* Traffic side note */}
              {route.trafficSide === 'left' && (
                <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                  <AlertTriangle className="w-4 h-4 text-ds-amber shrink-0 mt-0.5" />
                  <p className="text-xs text-ds-amber">This route drives on the LEFT side of the road</p>
                </div>
              )}
            </div>
          </div>

          {/* Start button */}
          <button
            onClick={handleStart}
            className="w-full flex items-center justify-center gap-3 bg-ds-green hover:bg-green-400 text-black font-bold py-4 rounded-2xl text-base transition-all duration-200 glow-green"
          >
            <Play className="w-5 h-5 fill-current" />
            Start Training Session
          </button>
        </div>
      )}
    </div>
  );
}

// Animated map placeholder (real implementation would use maplibre-gl)
function MapPlaceholder() {
  return (
    <svg
      className="absolute inset-0 w-full h-full opacity-30"
      viewBox="0 0 400 160"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Road grid */}
      {[20, 60, 100, 140].map(y => (
        <line key={y} x1="0" y1={y} x2="400" y2={y} stroke="#3B82F6" strokeWidth="0.5" />
      ))}
      {[40, 80, 120, 160, 200, 240, 280, 320, 360].map(x => (
        <line key={x} x1={x} y1="0" x2={x} y2="160" stroke="#3B82F6" strokeWidth="0.5" />
      ))}
      {/* Main road */}
      <path d="M 0 80 Q 100 40 200 80 Q 300 120 400 80" stroke="#06B6D4" strokeWidth="4" fill="none" />
      {/* Location pin */}
      <circle cx="200" cy="80" r="6" fill="#3B82F6" />
      <circle cx="200" cy="80" r="10" fill="#3B82F6" fillOpacity="0.3" />
    </svg>
  );
}
