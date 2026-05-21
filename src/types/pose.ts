/** MediaPipe Pose landmark indices */
export const POSE_LM = {
  NOSE:            0,
  LEFT_EYE:        2,
  RIGHT_EYE:       5,
  LEFT_EAR:        7,
  RIGHT_EAR:       8,
  LEFT_SHOULDER:   11,
  RIGHT_SHOULDER:  12,
  LEFT_ELBOW:      13,
  RIGHT_ELBOW:     14,
  LEFT_WRIST:      15,
  RIGHT_WRIST:     16,
  LEFT_HIP:        23,
  RIGHT_HIP:       24,
  LEFT_KNEE:       25,
  RIGHT_KNEE:      26,
  LEFT_ANKLE:      27,
  RIGHT_ANKLE:     28,
};

export interface PoseLandmark {
  x: number;
  y: number;
  z: number;
  visibility?: number;
}

export interface BodyGeometry {
  // Shoulders
  lShoulderX: number; lShoulderY: number;
  rShoulderX: number; rShoulderY: number;
  shoulderMidX: number; shoulderMidY: number;
  shoulderWidth: number;
  shoulderAngle: number;

  // Hips
  lHipX: number; lHipY: number;
  rHipX: number; rHipY: number;
  hipMidX: number; hipMidY: number;
  hipWidth: number;

  // Body measurements
  torsoHeight: number;
  bodyHeight: number;

  // Reliable flag
  valid: boolean;
}

export function extractBodyGeometry(
  poseLandmarks: PoseLandmark[],
  W: number,
  H: number
): BodyGeometry | null {
  const ls = poseLandmarks[POSE_LM.LEFT_SHOULDER];
  const rs = poseLandmarks[POSE_LM.RIGHT_SHOULDER];
  const lh = poseLandmarks[POSE_LM.LEFT_HIP];
  const rh = poseLandmarks[POSE_LM.RIGHT_HIP];
  const lk = poseLandmarks[POSE_LM.LEFT_KNEE];
  const rk = poseLandmarks[POSE_LM.RIGHT_KNEE];

  if (!ls || !rs || !lh || !rh) return null;

  const MIN_VIS = 0.4;
  if ((ls.visibility ?? 1) < MIN_VIS || (rs.visibility ?? 1) < MIN_VIS) return null;

  const lsx = ls.x * W, lsy = ls.y * H;
  const rsx = rs.x * W, rsy = rs.y * H;
  const lhx = lh.x * W, lhy = lh.y * H;
  const rhx = rh.x * W, rhy = rh.y * H;

  const smx = (lsx + rsx) / 2, smy = (lsy + rsy) / 2;
  const hmx = (lhx + rhx) / 2, hmy = (lhy + rhy) / 2;

  const kneeY = lk && rk ? ((lk.y + rk.y) / 2) * H : hmy + (hmy - smy) * 0.8;

  return {
    lShoulderX: lsx, lShoulderY: lsy,
    rShoulderX: rsx, rShoulderY: rsy,
    shoulderMidX: smx, shoulderMidY: smy,
    shoulderWidth: Math.hypot(rsx - lsx, rsy - lsy),
    shoulderAngle: Math.atan2(rsy - lsy, rsx - lsx),

    lHipX: lhx, lHipY: lhy,
    rHipX: rhx, rHipY: rhy,
    hipMidX: hmx, hipMidY: hmy,
    hipWidth: Math.hypot(rhx - lhx, rhy - lhy),

    torsoHeight: Math.hypot(hmx - smx, hmy - smy),
    bodyHeight: Math.abs(kneeY - smy) * 2,
    valid: true,
  };
}
