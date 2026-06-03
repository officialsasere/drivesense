// components/navigation/Sidebar.tsx
'use client';
import { useAppStore } from '@/lib/store';
import { LayoutDashboard, Navigation, Map, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';

const NAV_ITEMS = [
  { id: 'dashboard' as const, label: 'Dashboard', icon: LayoutDashboard },
  { id: 'train'     as const, label: 'Training',  icon: Navigation        },
  { id: 'scenarios' as const, label: 'Scenarios', icon: Map               },
  { id: 'progress'  as const, label: 'Progress',  icon: TrendingUp        },
];

export function Sidebar() {
  const { activeTab, setActiveTab } = useAppStore();

  return (
    <aside className="hidden md:flex flex-col w-56 bg-ds-surface border-r border-ds-border shrink-0">
      {/* Logo */}
      <div className="px-5 py-6 border-b border-ds-border">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-ds-blue flex items-center justify-center glow-blue">
            <Navigation className="w-4 h-4 text-white" strokeWidth={2.5} />
          </div>
          <div>
            <p className="font-display text-sm font-bold text-white leading-none">DriveSense</p>
            <p className="text-[10px] text-ds-muted mt-0.5">Global Training</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-1">
        {NAV_ITEMS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={cn(
              'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-200',
              activeTab === id
                ? 'bg-ds-blue text-white font-medium shadow-lg shadow-blue-500/20'
                : 'text-ds-muted hover:text-ds-text hover:bg-ds-card'
            )}
          >
            <Icon className="w-4 h-4 shrink-0" />
            {label}
          </button>
        ))}
      </nav>

      {/* Version */}
      <div className="px-5 py-4 border-t border-ds-border">
        <p className="text-[10px] text-ds-muted">DriveSense v1.0 — PWA</p>
      </div>
    </aside>
  );
}
