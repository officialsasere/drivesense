// lib/utils.ts
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function formatDistance(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)}m`;
  return `${km.toFixed(1)}km`;
}

export function formatSpeed(kmh: number, unit: 'kmh' | 'mph'): { value: number; unit: string } {
  if (unit === 'mph') {
    return { value: Math.round(kmh * 0.621371), unit: 'MPH' };
  }
  return { value: Math.round(kmh), unit: 'km/h' };
}

export function scoreToGrade(score: number): { grade: string; color: string } {
  if (score >= 90) return { grade: 'A+', color: 'text-ds-green' };
  if (score >= 80) return { grade: 'A',  color: 'text-ds-green' };
  if (score >= 70) return { grade: 'B',  color: 'text-ds-cyan'  };
  if (score >= 60) return { grade: 'C',  color: 'text-ds-amber' };
  if (score >= 50) return { grade: 'D',  color: 'text-orange-400' };
  return { grade: 'F', color: 'text-ds-red' };
}

export function getProgressPercent(covered: number, total: number): number {
  if (total === 0) return 0;
  return Math.min(100, (covered / total) * 100);
}
