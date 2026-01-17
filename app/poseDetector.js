/**
 * Owner: Person A
 * Responsibility: Run MediaPipe Pose model
 */

let pose;

export async function initPoseDetector(onResultsCallback) {
    if (!window.Pose) {
        throw new Error("MediaPipe Pose library not found. Check index.html script tags.");
    }

    pose = new window.Pose({
        locateFile: (file) => {
            return `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`;
        }
    });

    pose.setOptions({
        modelComplexity: 1,
        smoothLandmarks: true,
        enableSegmentation: false,
        smoothSegmentation: false,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5
    });

    pose.onResults(onResultsCallback);

    console.log("Pose Detector initialized");
    return pose;
}

export async function sendFrame(videoElement) {
    if (!pose) {
        console.warn("Pose detector not initialized");
        return;
    }
    await pose.send({ image: videoElement });
}
