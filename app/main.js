/**
 * Owner: Both (Phase 0) -> Person A & B
 * Responsibility: Orchestration
 */
import { getVideoStream } from './webcam.js';
import { initPoseDetector, sendFrame } from './poseDetector.js';
import { getPostureState, calibrate } from './postureEngine.js';
import { processPostureState } from './triggerEngine.js';

// Simple state to track if we have calibrated
let isCalibrated = false;

async function onPoseResults(results) {
    const canvas = document.getElementById('output_canvas');
    const ctx = canvas.getContext('2d');

    // clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw landmarks (optional, for debug)
    if (results.poseLandmarks) {
        if (window.drawConnectors && window.drawLandmarks) {
            window.drawConnectors(ctx, results.poseLandmarks, window.POSE_CONNECTIONS, { color: '#00FF00', lineWidth: 4 });
            window.drawLandmarks(ctx, results.poseLandmarks, { color: '#FF0000', lineWidth: 2 });
        }

        // Auto-calibrate on first detection for hackathon speed? 
        // Or wait for a button? Let's auto-calibrate after 3 seconds or just immediately for now.
        if (window.shouldCalibrateNextFrame) {
            calibrate(results.poseLandmarks);
            isCalibrated = true;
            window.shouldCalibrateNextFrame = false; // Reset flag
            console.log("Calibration complete!");
            if (window.onCalibrationComplete) window.onCalibrationComplete();
        }

        if (isCalibrated) {
            const state = getPostureState(results.poseLandmarks);
            // console.log("State:", state); // noisy

            processPostureState(state, () => {
                // TRIGGER HAPPENED
                console.log("⚠️ SLOUCH DETECTED!");

                if (Notification.permission === "granted") {
                    const n = new Notification("⚠️ SLOUCH DETECTED!", {
                        body: "Sit up straight!",
                        silent: false // Try to make sound if possible (browser dependent)
                    });
                } else {
                    // Fallback
                    alert("⚠️ SLOUCH DETECTED!");
                }
            });
        }
    }
}

async function init() {
    console.log("Initializing Posture Snitch...");

    // Request Notification permission
    if (Notification.permission !== "granted") {
        Notification.requestPermission();
    }

    try {
        const videoElement = document.getElementById('webcam');
        if (!videoElement) {
            throw new Error("Video element not found in UI");
        }

        // 1. Start Webcam
        const stream = await getVideoStream();
        videoElement.srcObject = stream;
        console.log("Webcam started successfully.");

        // 2. Init Pose
        await initPoseDetector(onPoseResults);

        // 3. Start Loop
        // We need to feed frames to pose detector
        // Using requestAnimationFrame loop
        async function poseLoop() {
            await sendFrame(videoElement);
            requestAnimationFrame(poseLoop);
        }

        // Wait for video to be ready
        videoElement.onloadeddata = () => {
            console.log("Video loaded, starting pose loop...");
            poseLoop();
        };

        // Expose calibrate function to window for debug
        window.doCalibrate = () => {
            console.log("Calibrating in 3 seconds...");
            setTimeout(() => {
                // We need the latest landmarks... 
                // This is a bit dirty because we don't store them globally. 
                // Let's make onPoseResults calibration smarter.
                isCalibrated = false; // Next frame will calibrate
                alert("Calibrated!");
            }, 3000);
        };

        // Wire up Calibrate Button
        const calibrateBtn = document.getElementById('calibrateBtn');
        const statusText = document.getElementById('status');

        calibrateBtn.addEventListener('click', () => {
            console.log("Calibration requested...");
            statusText.innerText = "Status: Calibrating... Sit up straight!";
            statusText.style.color = "yellow";

            // Trigger next frame calibration
            window.shouldCalibrateNextFrame = true;
        });

        // Listen for calibration completion event (we can emit this or just use a callback, 
        // but since we are in main.js, we can patch the onPoseResults logic to update UI)
        window.onCalibrationComplete = () => {
            statusText.innerText = "Status: Posture Locked & Monitoring ✅";
            statusText.style.color = "#4CAF50";
        };

    } catch (err) {
        console.error("Initialization failed:", err);
        alert("Failed to start app: " + err.message);
    }
}

// Start the app
init();
