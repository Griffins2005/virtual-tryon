import { create } from 'zustand';
import type { AppState, TryOnMode, OverlayConfig } from '../types';
import { getItemsByMode } from '../assets/catalog';

const STORAGE_KEY = 'virtual-tryon-state';

function loadInitialState() {
  const defaultState = {
    mode: 'glasses' as TryOnMode,
    selectedItemId: 'wayfarer',
    config: { scale: 1.0, offsetY: 0, opacity: 0.9, color: '#1a1a2e', intensity: 0.7 },
  };

  if (typeof window === 'undefined') return defaultState;

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState;

    const parsed = JSON.parse(raw) as Partial<{ mode: TryOnMode; selectedItemId: string; config: OverlayConfig }>;
    const mode = parsed.mode ?? defaultState.mode;
    const candidate = typeof parsed.selectedItemId === 'string' ? parsed.selectedItemId : null;
    const itemValid = candidate && getItemsByMode(mode).some((item) => item.id === candidate);
    const selectedItemId = itemValid ? candidate : getDefaultItem(mode);
    const config = parsed.config ?? defaultState.config;

    return {
      mode,
      selectedItemId,
      config,
    };
  } catch {
    return defaultState;
  }
}

function persistAppState(mode: TryOnMode, selectedItemId: string | null, config: OverlayConfig) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ mode, selectedItemId, config }));
  } catch {
    // Ignore storage errors.
  }
}

const initialState = loadInitialState();

export const useStore = create<AppState>((set) => ({
  mode: initialState.mode,
  selectedItemId: initialState.selectedItemId,
  config: initialState.config,
  cameraActive: false,
  detection: { detected: false, landmarks: null, fps: 0, confidence: 0 },
  setMode: (mode: TryOnMode) =>
    set((state) => {
      const nextState = {
        mode,
        selectedItemId: getDefaultItem(mode),
        config: { ...state.config, color: getDefaultColor(mode) },
      };
      persistAppState(nextState.mode, nextState.selectedItemId, nextState.config);
      return nextState;
    }),
  setSelectedItem: (id: string) =>
    set((state) => {
      persistAppState(state.mode, id, state.config);
      return { selectedItemId: id };
    }),
  setConfig: (partial: Partial<OverlayConfig>) =>
    set((state) => {
      const config = { ...state.config, ...partial };
      persistAppState(state.mode, state.selectedItemId, config);
      return { config };
    }),
  resetConfig: () =>
    set((state) => {
      const config = { scale: 1.0, offsetY: 0, opacity: 0.9, color: getDefaultColor(state.mode), intensity: 0.7 };
      persistAppState(state.mode, state.selectedItemId, config);
      return { config };
    }),
  setCameraActive: (cameraActive: boolean) => set({ cameraActive }),
  setDetection: (partial) =>
    set((state) => ({ detection: { ...state.detection, ...partial } })),
}));

function getDefaultItem(mode: TryOnMode): string {
  return { glasses: 'wayfarer', makeup: 'classic-lip', clothing: 'tshirt', accessories: 'watch' }[mode];
}
function getDefaultColor(mode: TryOnMode): string {
  return { glasses: '#1a1a2e', makeup: '#c0392b', clothing: '#2c3e50', accessories: '#d4af37' }[mode];
}
