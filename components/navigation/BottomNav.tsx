// components/navigation/BottomNav.tsx
'use client';
import { useAppStore } from '@/lib/store';
import { LayoutDashboard, Navigation, Map, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';

const NAV_ITEMS = [
  { id: 'dashboard' as const, label: 'Home',      icon: LayoutDashboard },
  { id: 'train'     as const, label: 'Train',     icon: Navigation       },
  { id: 'scenarios' as const, label: 'Routes',    icon: Map              },
  { id: 'progress'  as const, label: 'Progress',  icon: TrendingUp       },
];

export function BottomNav() {
  const { activeTab, setActiveTab } = useAppStore();

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-ds-surface border-t border-ds-border safe-bottom">
      <div className="flex">
        {NAV_ITEMS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={cn(
              'flex-1 flex flex-col items-center gap-1 py-3 px-1 transition-colors duration-200',
              activeTab === id ? 'text-ds-blue' : 'text-ds-muted'
            )}
          >
            <Icon className="w-5 h-5" />
            <span className="text-[10px] font-medium">{label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
}
