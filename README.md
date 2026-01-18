# Backtrack

**Backtrack** is a computer-vision powered posture corrector that adds a lighthearted twist to the arduous task of sitting up straight.

## 🔗 Live Demo

**Try it out here:** [backtrack-ten.vercel.app](https://backtrack-ten.vercel.app)

## 💡 Inspiration

We've all been there—studying for long hours, glued to our screens, only to realize hours later that our backs are aching because we've been slouching the entire time. We wanted to solve this problem, but we didn't want another boring health app that nags you.

We wanted to make fixing your posture **fun**.

Instead of gentle reminders, **Backtrack** uses a "Savage AI" personality to roast you when you slouch. It keeps things entertaining and motivates you to sit up straight just to avoid the next burn!

## 🛠️ How It Works

Backtrack uses your webcam and advanced Computer Vision (MediaPipe) to track your posture in real-time—completely locally correctly in your browser.

1.  **Calibration**: It learns your "good" posture.
2.  **Detection**: If you slouch for too long, it detects it.
3.  **The Twist**:
    *   **Guardian Friends (via Telegram)**: You can invite friends to be your "Guardians". They get added via our **Telegram Bot**.
    *   **The 15-Second Rule**: When you slouch, your friends get a **Telegram alert**. If one replies within 15 seconds, their message plays (in a funny accent!).
    *   **AI Roast**: If no one saves you... the AI steps in and delivers a savage, personalized roast.

## 📁 Project Structure

The project is organized into modular components:

*   **`app/`**: Core Application Logic
    *   `main.js`: Orchestrates the entire app flow.
    *   `postureEngine.js`: The math brains—calculates neck/shoulder ratios to detect slouching.
    *   `poseDetector.js`: Wrapper around MediaPipe Pose for tracking landmarks.
    *   `webcam.js`: Handles video stream access.
    *   `audioPlayer.js`: Handles text-to-speech playback for roasts.

*   **`ui/`**: Frontend Interface
    *   `index.html`: The main dashboard (Film roll design).
    *   `styles.css`: Styling for the retro/dark aesthetic.
    *   `ui.js`: Handles UI interactions (onboarding, friends list, settings).

*   **`telegram/`**: Bot Integration
    *   `bot.js`: The Telegram bot that messaging your friends and handles their replies.

## 🚀 How to Run Locally

1.  **Install Dependencies**:
    ```bash
    npm install
    ```
2.  **Start the Server**:
    ```bash
    npx serve .
    ```
3.  **Open in Browser**:
    Navigate to `http://localhost:3000/ui/`
