import { create } from 'zustand';

const STORAGE_KEY = 'virtual-tryon-history';

export interface Snapshot {
  id: string;
  dataUrl: string;
  mode: string;
  item: string;
  timestamp: number;
}

interface HistoryState {
  snapshots: Snapshot[];
  addSnapshot: (s: Snapshot) => void;
  removeSnapshot: (id: string) => void;
  clear: () => void;
}

function loadSnapshots(): Snapshot[] {
  if (typeof window === 'undefined') return [];
  try {
    const value = window.localStorage.getItem(STORAGE_KEY);
    return value ? (JSON.parse(value) as Snapshot[]) : [];
  } catch {
    return [];
  }
}

function persistSnapshots(snapshots: Snapshot[]) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshots));
  } catch {
    // Ignore storage errors.
  }
}

export const useHistory = create<HistoryState>((set) => ({
  snapshots: loadSnapshots(),
  addSnapshot: (s) =>
    set((state) => {
      const snapshots = [s, ...state.snapshots].slice(0, 12);
      persistSnapshots(snapshots);
      return { snapshots };
    }),
  removeSnapshot: (id) =>
    set((state) => {
      const snapshots = state.snapshots.filter((s) => s.id !== id);
      persistSnapshots(snapshots);
      return { snapshots };
    }),
  clear: () => {
    persistSnapshots([]);
    return { snapshots: [] };
  },
}));
