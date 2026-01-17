# Posture Snitch

A clean, hackathon-ready posture corrector that alerts your friends when you slouch.

## 🚀 How to Run (Phase 0)

Since we are using modern ES Modules, you need a local web server to run this (opening `index.html` file directly won't work).

1. Open your terminal in this folder.
2. Run a simple server:
   ```bash
   npx serve .
   # OR
   python3 -m http.server
   ```
3. Open the URL shown (usually `http://localhost:3000` or `http://localhost:8000`).
4. Navigate to `/ui/index.html`.

## 🧪 Testing Person A's Feature (Posture Brain)

1. Allow camera access.
2. You should see the video feed with a red border.
3. Wait for the MediaPipe model to load (you might see landmarks drawn).
4. **Sit up straight** and click anywhere on the page to **CALIBRATE**.
   - Check the console logs: `Calibrated! Baseline Shoulder Y: ...`
5. **Slouch** nicely.
   - After 2 seconds, you should see an alert: `⚠️ SLOUCH DETECTED!`.
6. Sit up straight again to reset the trigger.

## 📁 Structure

See `app/` for the logic implemented by Person A:
- `app/webcam.js`: Camera handling
- `app/poseDetector.js`: MediaPipe wrapper
- `app/postureEngine.js`: Slouch math
- `app/triggerEngine.js`: Alert debouncing
