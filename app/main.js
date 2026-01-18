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

/**
 * Track a slouch event by saving timestamp to localStorage
 */
function trackSlouch() {
    try {
        const timestamp = Date.now();
        const slouchesKey = 'postureSnitch_slouches';

        // Get existing slouches from localStorage
        const existingSlouchesJson = localStorage.getItem(slouchesKey);
        const slouches = existingSlouchesJson ? JSON.parse(existingSlouchesJson) : [];

        // Add new slouch timestamp
        slouches.push(timestamp);

        // Keep only last 7 days of data (to prevent localStorage from getting too large)
        const sevenDaysAgo = timestamp - (7 * 24 * 60 * 60 * 1000);
        const filteredSlouches = slouches.filter(ts => ts >= sevenDaysAgo);

        // Save back to localStorage
        localStorage.setItem(slouchesKey, JSON.stringify(filteredSlouches));

        console.log('📊 Slouch tracked at:', new Date(timestamp).toISOString());

        // Trigger graph update if function exists
        if (window.updateSlouchGraph) {
            window.updateSlouchGraph();
        }
    } catch (error) {
        console.error('❌ Failed to track slouch:', error.message);
    }
}

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

                // Track slouch event
                trackSlouch();

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
                // Get userId, userName, and selected personality from localStorage
                const userId = localStorage.getItem('postureSnitch_userId');
                const userName = localStorage.getItem('postureSnitch_userName');

                // Get selected personality - ALWAYS read from dropdown first, it's the source of truth
                let selectedPersonality = 'FRzaj7L4px15biN0RGSj'; // Default fallback
                const personalitySelector = document.getElementById('personalitySelector');

                if (personalitySelector) {
                    selectedPersonality = personalitySelector.value || selectedPersonality;
                    console.log('🎭 [MAIN.JS] Selected personality from dropdown:', selectedPersonality);
                } else {
                    selectedPersonality = localStorage.getItem('postureSnitch_selectedPersonality') || selectedPersonality;
                    console.log('🎭 [MAIN.JS] Dropdown not found, using localStorage:', selectedPersonality);
                }

                // Validate we have a valid voiceId
                const validVoiceIds = ['FRzaj7L4px15biN0RGSj', 'wJ5MX7uuKXZwFqGdWM4N', 'ljEOxtzNoGEa58anWyea', 'K8nDX2f6wjv6bCh5UeZi', 'nw6EIXCsQ89uJMjytYb8', 'gad8DmXGyu7hwftX9JqI', 'spZS54yMfsj80VHtUQFY', 'yqZhXcy5spYR7Hhv17QY'];
                if (!validVoiceIds.includes(selectedPersonality)) {
                    console.error('❌ [MAIN.JS] Invalid voiceId:', selectedPersonality, '- using default');
                    selectedPersonality = 'FRzaj7L4px15biN0RGSj';
                }

                const requestBody = {
                    userId: userId || null,
                    userName: userName || null,
                    voiceId: selectedPersonality  // ALWAYS send voiceId, never null
                };

                console.log('🎭 [MAIN.JS] Sending trigger request with body:', JSON.stringify(requestBody));

                fetch(`${API_URL}/trigger`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(requestBody)
                })
                    .then(response => {
                        console.log('✅ [MAIN.JS] Trigger request sent successfully');
                        return response.json();
                    })
                    .then(data => {
                        console.log('✅ [MAIN.JS] Trigger response:', data);
                    })
                    .catch(e => {
                        console.error("❌ [MAIN.JS] Failed to trigger bot:", e);
                    });
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

        // Function to check if name is entered and update button state
        function updateCalibrateButtonState() {
            if (!calibrateBtn) return;

            const userName = localStorage.getItem('postureSnitch_userName');
            const hasName = userName && userName.trim().length > 0;

            if (!hasName) {
                calibrateBtn.disabled = true;
                calibrateBtn.style.opacity = '0.5';
                calibrateBtn.style.cursor = 'not-allowed';
                if (statusText) {
                    statusText.innerText = "Status: Please enter your name first";
                    statusText.style.color = "#FF9800";
                }
            } else {
                calibrateBtn.disabled = false;
                calibrateBtn.style.opacity = '1';
                calibrateBtn.style.cursor = 'pointer';
                if (!isCalibrated && statusText) {
                    statusText.innerText = "Status: Ready to calibrate";
                    statusText.style.color = "#ccc";
                }
            }
        }

        // Check name on page load and when name changes
        updateCalibrateButtonState();
        // Listen for storage changes (when name is entered in welcome banner)
        window.addEventListener('storage', updateCalibrateButtonState);
        // Also check periodically (for same-tab changes)
        const nameCheckInterval = setInterval(updateCalibrateButtonState, 500);

        if (calibrateBtn) {
            calibrateBtn.addEventListener('click', () => {
                // Double-check name before calibrating
                const userName = localStorage.getItem('postureSnitch_userName');
                if (!userName || !userName.trim()) {
                    alert("Please enter your name in the welcome banner above before calibrating.");
                    return;
                }

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
            // Update button to green "Recalibrate"
            if (calibrateBtn) {
                calibrateBtn.textContent = "🔄 Recalibrate";
                calibrateBtn.style.backgroundColor = "#4CAF50";
                calibrateBtn.style.color = "#fff";
            }
            clearInterval(nameCheckInterval); // Stop checking name after calibration
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

                // Process events sequentially to avoid overlapping
                for (const event of data.events) {
                    if (event.text) {
                        try {
                            let played = false;

                            // Try ElevenLabs if voiceId is present
                            if (event.voiceId) {
                                console.log(`🗣️ Fetching ElevenLabs audio: "${event.text}" (${event.voiceId})`);
                                const ttsResponse = await fetch(`${API_URL}/tts`, {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ text: event.text, voiceId: event.voiceId })
                                });

                                if (ttsResponse.ok) {
                                    const blob = await ttsResponse.blob();
                                    const audioUrl = URL.createObjectURL(blob);
                                    const audio = new Audio(audioUrl);

                                    // wrapper to await playback? 
                                    // For now just play. To avoid overlap we'd need a complex queue. 
                                    // Just firing it is a good start.
                                    audio.play();
                                    console.log(`🔊 Playing ElevenLabs audio...`);
                                    played = true;
                                } else {
                                    console.warn("TTS Fetch failed, falling back");
                                }
                            }

                            if (!played) {
                                const utterance = new SpeechSynthesisUtterance(event.text);
                                window.speechSynthesis.speak(utterance);
                                console.log(`🗣️ Speaking (Default): "${event.text}"`);
                            }

                        } catch (e) {
                            console.error("Audio playback error:", e);
                            // Final fallback
                            const utterance = new SpeechSynthesisUtterance(event.text);
                            window.speechSynthesis.speak(utterance);
                        }
                    }
                }
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
