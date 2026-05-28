export type TryOnMode = 'glasses' | 'makeup' | 'clothing' | 'accessories';

export interface Landmark {
  x: number;
  y: number;
  z?: number;
}

export interface TryOnItem {
  id: string;
  name: string;
  category: TryOnMode;
  thumbnail: string;
  colors: string[];
}

export interface OverlayConfig {
  scale: number;
  offsetY: number;
  opacity: number;
  color: string;
  intensity: number;
}

export interface FaceDetectionState {
  detected: boolean;
  landmarks: Landmark[] | null;
  fps: number;
  confidence: number;
}

export interface AppState {
  mode: TryOnMode;
  selectedItemId: string | null;
  config: OverlayConfig;
  cameraActive: boolean;
  detection: FaceDetectionState;
  mobileSheet: boolean;
  setMode: (mode: TryOnMode) => void;
  setSelectedItem: (id: string) => void;
  setConfig: (config: Partial<OverlayConfig>) => void;
  resetConfig: () => void;
  setCameraActive: (active: boolean) => void;
  setDetection: (detection: Partial<FaceDetectionState>) => void;
  setMobileSheet: (open: boolean) => void;
}
