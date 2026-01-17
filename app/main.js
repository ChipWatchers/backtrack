/**
 * Owner: Both (Phase 0) -> Person A & B
 * Responsibility: Orchestration
 */
import { getVideoStream } from './webcam.js';
import { initPoseDetector, sendFrame } from './poseDetector.js';
import { getPostureState, calibrate } from './postureEngine.js';
import { processPostureState } from './triggerEngine.js';
import { API_URL } from './config.js';

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

        // Auto-calibrate check
        if (window.shouldCalibrateNextFrame) {
            calibrate(results.poseLandmarks);
            isCalibrated = true;
            window.shouldCalibrateNextFrame = false; // Reset flag
            console.log("Calibration complete!");
            if (window.onCalibrationComplete) window.onCalibrationComplete();
        }

        if (isCalibrated) {
            const state = getPostureState(results.poseLandmarks);

            processPostureState(state, () => {
                // TRIGGER HAPPENED
                console.log("⚠️ SLOUCH DETECTED!");

                // 1. Browser Notification
                if (Notification.permission === "granted") {
                    new Notification("⚠️ SLOUCH DETECTED!", {
                        body: "Sit up straight!",
                        silent: false
                    });
                } else {
                    alert("⚠️ SLOUCH DETECTED!");
                }

                // 2. Telegram Bot Trigger
                // Get userId from localStorage
                const userId = localStorage.getItem('postureSnitch_userId');
                fetch(`${API_URL}/trigger`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ userId: userId || null })
                })
                    .catch(e => console.error("Failed to trigger bot:", e));
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
        async function poseLoop() {
            await sendFrame(videoElement);
            requestAnimationFrame(poseLoop);
        }

        // Wait for video to be ready
        videoElement.onloadeddata = () => {
            console.log("Video loaded, starting pose loop...");
            poseLoop();
        };

        // Wire up Calibrate Button
        const calibrateBtn = document.getElementById('calibrateBtn');
        const statusText = document.getElementById('status');

        if (calibrateBtn) {
            calibrateBtn.addEventListener('click', () => {
                console.log("Calibration requested...");
                if (statusText) {
                    statusText.innerText = "Status: Calibrating... Sit up straight!";
                    statusText.style.color = "yellow";
                }
                window.shouldCalibrateNextFrame = true;
            });
        }

        window.onCalibrationComplete = () => {
            if (statusText) {
                statusText.innerText = "Status: Monitoring ✅";
                statusText.style.color = "#4CAF50";
            }
        };

    } catch (err) {
        console.error("Initialization failed:", err);
        alert("Failed to start app: " + err.message);
    }
}

// Poll for audio events (insults/replies) from the bot
async function pollAudioEvents() {
    try {
        const response = await fetch(`${API_URL}/audio-events`);
        if (response.ok) {
            const data = await response.json();
            if (data.events && data.events.length > 0) {
                console.log(`🔊 Received ${data.events.length} audio event(s)`);

                data.events.forEach(event => {
                    if (event.text) {
                        const utterance = new SpeechSynthesisUtterance(event.text);
                        // Optional: Adjust voice/rate/pitch here
                        window.speechSynthesis.speak(utterance);
                        console.log(`🗣️ Speaking: "${event.text}"`);
                    }
                });
            }
        }
    } catch (error) {
        // Silent fail on polling errors to avoid console spam
    }

    // Poll again in 2 seconds
    setTimeout(pollAudioEvents, 2000);
}

// Start the app
init();
pollAudioEvents();
