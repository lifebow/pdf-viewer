// Reading tints — ported from the design handoff. Each tint drives the whole
// UI via CSS custom properties set on <html>. Persisted in localStorage under
// the legacy `theme` key (old "dark"/"light" values are migrated on read).

export type TintId = 'cream' | 'sepia' | 'mist' | 'night';

export interface Tint {
  id: TintId;
  name: string;
  sw: string; // swatch color
  vars: Record<string, string>;
}

export const TINTS: Tint[] = [
  {
    id: 'cream', name: 'Kem', sw: '#F3E9D6',
    vars: { '--bg': '#EFE6D6', '--surface': '#FBF7EF', '--page': '#FBF6EC', '--ink': '#2A2521', '--muted': '#8A7F6E', '--accent': '#B5623A', '--border': '#E3D8C4', '--panel': '#F3EDDF' },
  },
  {
    id: 'sepia', name: 'Sepia', sw: '#E9C99B',
    vars: { '--bg': '#E7D8BE', '--surface': '#F4EAD5', '--page': '#F6ECD6', '--ink': '#3A2E1E', '--muted': '#8C7A5C', '--accent': '#A9683C', '--border': '#DBC9A8', '--panel': '#EFE2C8' },
  },
  {
    id: 'mist', name: 'Sương', sw: '#C7D6CB',
    vars: { '--bg': '#DDE3DD', '--surface': '#F1F4EF', '--page': '#F4F6F2', '--ink': '#25302A', '--muted': '#77857C', '--accent': '#4F8A6B', '--border': '#CBD5CB', '--panel': '#E7EDE6' },
  },
  {
    id: 'night', name: 'Đêm', sw: '#2C2723',
    vars: { '--bg': '#191613', '--surface': '#221E1A', '--page': '#262220', '--ink': '#E8E0D2', '--muted': '#9C9082', '--accent': '#D98A5E', '--border': '#332D27', '--panel': '#201C18' },
  },
];

export const HL_COLORS = ['#F2D06B', '#F0A88A', '#A8D5B5', '#9DBEE0'];

export function getTint(id: string | null): Tint {
  return TINTS.find((t) => t.id === id) || TINTS[0];
}

export function loadTintId(): TintId {
  const saved = typeof window !== 'undefined' ? localStorage.getItem('theme') : null;
  if (saved === 'dark') return 'night';
  if (saved === 'light') return 'cream';
  if (saved && TINTS.some((t) => t.id === saved)) return saved as TintId;
  if (typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches) return 'night';
  return 'cream';
}

export function applyTint(id: TintId): void {
  const tint = getTint(id);
  const root = document.documentElement;
  Object.entries(tint.vars).forEach(([k, v]) => root.style.setProperty(k, v));
  root.dataset.tint = id;
  localStorage.setItem('theme', id);
}
