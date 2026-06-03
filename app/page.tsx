// app/page.tsx
'use client';
import { useAppStore } from '@/lib/store';
import { Sidebar } from '@/components/navigation/Sidebar';
import { BottomNav } from '@/components/navigation/BottomNav';
import { DashboardView } from '@/components/dashboard/DashboardView';
import { TrainView } from '@/components/training/TrainView';
import { ScenariosView } from '@/components/training/ScenariosView';
import { ProgressView } from '@/components/dashboard/ProgressView';
import { ActiveSession } from '@/components/training/ActiveSession';

export default function Home() {
  const { activeTab, session } = useAppStore();

  // Full-screen training session
  if (session.isActive) {
    return <ActiveSession />;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-ds-bg">
      {/* Sidebar — hidden on mobile, visible md+ */}
      <Sidebar />

      {/* Main content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <div className="flex-1 overflow-y-auto pb-20 md:pb-0">
          {activeTab === 'dashboard'  && <DashboardView />}
          {activeTab === 'train'      && <TrainView />}
          {activeTab === 'scenarios'  && <ScenariosView />}
          {activeTab === 'progress'   && <ProgressView />}
        </div>

        {/* Bottom nav — mobile only */}
        <BottomNav />
      </main>
    </div>
  );
}
