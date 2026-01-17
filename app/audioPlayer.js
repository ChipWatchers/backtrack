const { exec } = require('child_process');
const { promisify } = require('util');
const fs = require('fs');
const path = require('path');
const os = require('os');

const execAsync = promisify(exec);

/**
 * Load secrets from config/secrets.env
 */
function loadSecrets() {
  const secretsPath = path.join(__dirname, '../config/secrets.env');
  try {
    const secretsContent = fs.readFileSync(secretsPath, 'utf8');
    const secrets = {};

    secretsContent.split('\n').forEach(line => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const [key, ...valueParts] = trimmed.split('=');
        if (key && valueParts.length > 0) {
          secrets[key.trim()] = valueParts.join('=').trim();
        }
      }
    });

    return secrets;
  } catch (error) {
    throw new Error('Failed to load secrets.env: ' + error.message);
  }
}

/**
 * Generate audio stream (Buffer) from ElevenLabs API
 * @param {string} text - The text to speak
 * @param {string} voiceId - ElevenLabs voice ID
 * @returns {Promise<Buffer>} - Audio buffer
 */
async function generateAudioStream(text, voiceId) {
  if (!text || typeof text !== 'string' || !text.trim()) {
    throw new Error('Empty or invalid text provided');
  }

  if (!voiceId) {
    throw new Error('Voice ID is required for ElevenLabs generation');
  }

  const secrets = loadSecrets();
  const ELEVENLABS_API_KEY = secrets.ELEVENLABS_API_KEY;

  if (!ELEVENLABS_API_KEY) {
    throw new Error('ELEVENLABS_API_KEY not found in secrets');
  }

  // Call ElevenLabs API
  const url = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Accept': 'audio/mpeg',
      'Content-Type': 'application/json',
      'xi-api-key': ELEVENLABS_API_KEY
    },
    body: JSON.stringify({
      text: text,
      model_id: 'eleven_multilingual_v2',
      voice_settings: {
        stability: 0.5,
        similarity_boost: 0.75
      }
    })
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(`ElevenLabs API error: ${errorData.detail?.message || response.statusText || 'Unknown error'}`);
  }

  // Get audio buffer
  const audioBuffer = await response.arrayBuffer();
  return Buffer.from(audioBuffer);
}

/**
 * Play text as audio using ElevenLabs API or macOS 'say' command as fallback
 * @param {string} text - The text to speak
 * @param {string} voiceId - Optional ElevenLabs voice ID. If provided, uses ElevenLabs API, otherwise falls back to 'say' command
 * @returns {Promise<void>}
 */
async function playAudio(text, voiceId = null) {
  if (!text || typeof text !== 'string' || !text.trim()) {
    console.warn('⚠️  playAudio: Empty or invalid text provided');
    return;
  }

  // Check if running on macOS - SKIP audio on Linux/Server environments
  if (process.platform !== 'darwin') {
    console.log(`🔇 Server audio skipped (not macOS): "${text}"`);
    return;
  }

  // If voiceId is provided, use ElevenLabs API
  if (voiceId) {
    try {
      const buffer = await generateAudioStream(text, voiceId);

      // Save to temporary file
      const tempDir = os.tmpdir();
      const tempFile = path.join(tempDir, `posture-snitch-${Date.now()}.mp3`);

      fs.writeFileSync(tempFile, buffer);

      // Play using afplay (macOS) or ffplay/other player
      try {
        await execAsync(`afplay "${tempFile}"`);
        console.log(`🔊 ElevenLabs audio played with voice ${voiceId}: "${text}"`);
      } catch (playError) {
        console.error('❌ Failed to play audio file:', playError.message);
      } finally {
        // Clean up temp file after a delay to allow playback to start
        setTimeout(() => {
          try {
            if (fs.existsSync(tempFile)) {
              fs.unlinkSync(tempFile);
            }
          } catch (cleanupError) {
            // Ignore cleanup errors
          }
        }, 1000);
      }

    } catch (error) {
      console.error('❌ ElevenLabs API failed, falling back to say command:', error.message);
      // Fallback to say command
      return await playAudioWithSay(text);
    }
  } else {
    // No voiceId provided, use say command
    return await playAudioWithSay(text);
  }
}

/**
 * Play text as audio using macOS 'say' command (fallback)
 * @param {string} text - The text to speak
 * @returns {Promise<void>}
 */
async function playAudioWithSay(text) {
  try {
    // Escape special characters for shell command
    const escapedText = text.replace(/'/g, "'\"'\"'");

    // Use macOS 'say' command
    const command = `say '${escapedText}'`;

    // Execute asynchronously (non-blocking)
    await execAsync(command);
    console.log(`🔊 Audio played (say command): "${text}"`);
  } catch (error) {
    console.error('❌ Failed to play audio with say command:', error.message);
    // Don't throw - audio failure shouldn't break the app
  }
}

module.exports = {
  playAudio,
  playAudioWithSay,
  generateAudioStream
};
playAudio
};
