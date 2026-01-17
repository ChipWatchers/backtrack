/**
 * Owner: Person A
 * Responsibility: Math & Geometry for posture
 */

let calibratedRatio = null;
const SLOUCH_TOLERANCE = 0.15; // 15% deviation from baseline allowed

/**
 * Calculates a normalized score for "Neck Length".
 * Score = (Average Shoulder Y - Nose Y) / (Distance between Shoulders)
 * 
 * Why this works:
 * - If you move back/forth, both numerator and denominator scale equally -> Ratio stays constant.
 * - If you slouch, your head drops (numerator shrinks), but shoulder width stays roughly same -> Ratio drops.
 */
function calculatePostureRatio(landmarks) {
    const nose = landmarks[0];
    const leftShoulder = landmarks[11];
    const rightShoulder = landmarks[12];

    const shoulderY = (leftShoulder.y + rightShoulder.y) / 2;
    const neckLength = Math.abs(shoulderY - nose.y); // Vertical distance

    const shoulderDistX = leftShoulder.x - rightShoulder.x;
    const shoulderDistY = leftShoulder.y - rightShoulder.y;
    const shoulderWidth = Math.sqrt(shoulderDistX * shoulderDistX + shoulderDistY * shoulderDistY);

    if (shoulderWidth === 0) return 0; // Safety

    return neckLength / shoulderWidth;
}

export function calibrate(landmarks) {
    if (!landmarks) return;

    calibratedRatio = calculatePostureRatio(landmarks);

    console.log("Calibrated! Baseline Ratio:", calibratedRatio.toFixed(3));
}

export function getPostureState(landmarks) {
    if (!calibratedRatio || !landmarks) return "unknown";

    const currentRatio = calculatePostureRatio(landmarks);

    // If current ratio is significantly SMALLER than calibrated, 
    // it means neck length (numerator) has decreased relative to width.
    // e.g. Head drooping forward = slouch.

    if (currentRatio < calibratedRatio * (1 - SLOUCH_TOLERANCE)) {
        return "slouching";
    }

    return "upright";
}
