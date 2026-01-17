/**
 * Owner: Person A
 * Responsibility: Math & Geometry for posture
 */

let calibratedShoulderY = null;
let calibratedNoseY = null;
const SLOUCH_THRESHOLD = 0.05; // 5% of screen height variance? Tweak this.

export function calibrate(landmarks) {
    if (!landmarks) return;

    // Landmarks: 11 (left shoulder), 12 (right shoulder), 0 (nose)
    const leftShoulder = landmarks[11];
    const rightShoulder = landmarks[12];
    const nose = landmarks[0];

    calibratedShoulderY = (leftShoulder.y + rightShoulder.y) / 2;
    calibratedNoseY = nose.y;

    console.log("Calibrated! Baseline Shoulder Y:", calibratedShoulderY);
}

export function getPostureState(landmarks) {
    if (!calibratedShoulderY || !landmarks) return "unknown";

    const leftShoulder = landmarks[11];
    const rightShoulder = landmarks[12];
    const currentShoulderY = (leftShoulder.y + rightShoulder.y) / 2;

    // In computer vision (usually), Y increases downwards.
    // So if currentShoulderY is GREATER than calibratedShoulderY + threshold, they moved DOWN (slouched/sunk).

    if (currentShoulderY > calibratedShoulderY + SLOUCH_THRESHOLD) {
        return "slouching";
    }

    return "upright";
}
