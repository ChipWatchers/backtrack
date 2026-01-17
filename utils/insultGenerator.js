/**
 * Generate an AI insult about posture using Gemini API with personality-specific voices
 */

const { getVoiceById, getAllVoices } = require('../config/voices.js');

async function generatePostureInsult(voiceId = null) {
  const fs = require('fs');
  const path = require('path');

  // Load GEMINI_API_KEY from secrets.env
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

  let secrets = {};
  try {
    secrets = loadSecrets();
  } catch (e) { /* ignore if file missing on railway */ }

  const GEMINI_API_KEY = process.env.GEMINI_API_KEY || secrets.GEMINI_API_KEY;

  if (!GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY not found in config/secrets.env');
  }

  // CRITICAL: voiceId MUST be provided - no random selection!
  console.log(`🎭 [INSULT_GENERATOR] Received voiceId parameter:`, voiceId);
  
  let voice;
  if (voiceId) {
    voice = getVoiceById(voiceId);
    if (!voice) {
      console.error(`❌ [INSULT_GENERATOR] Voice ID ${voiceId} not found in voices config!`);
      // Fallback to first voice (Malay Barber) if invalid ID provided
      const allVoices = getAllVoices();
      voice = allVoices[0];
      console.error(`⚠️  [INSULT_GENERATOR] Falling back to default voice: ${voice.name} (${voice.id})`);
    } else {
      console.log(`✅ [INSULT_GENERATOR] Using SELECTED personality: ${voice.name} (${voice.id})`);
    }
  } else {
    // No voiceId provided - this should NEVER happen now
    console.error(`❌ [INSULT_GENERATOR] NO voiceId provided! This should not happen.`);
    const allVoices = getAllVoices();
    voice = allVoices[0]; // Default to first voice (Malay Barber)
    console.error(`❌ [INSULT_GENERATOR] Using default voice due to missing voiceId: ${voice.name} (${voice.id})`);
  }

  // Use personality-specific prompt
  const prompt = voice.prompt;

  try {
    // Use v1 API with gemini-2.5-flash (confirmed available from API)
    // Model format: models/gemini-2.5-flash
    const url = `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: prompt
          }]
        }]
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(`Gemini API error: ${data.error?.message || 'Unknown error'}`);
    }

    const insult = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

    if (!insult) {
      throw new Error('No insult generated from Gemini API');
    }

    console.log(`🤖 AI generated insult (${voice.name}): ${insult}`);

    // Return both the insult text and the voice ID
    return {
      text: insult,
      voiceId: voice.id,
      voiceName: voice.name
    };
  } catch (error) {
    console.error('❌ Failed to generate insult:', error.message);
    // Fallback insult if API fails - use default voice or say command
    return {
      text: "Hey! Your posture looks like a question mark. Sit up straight!",
      voiceId: null, // null will trigger say command fallback
      voiceName: 'Fallback'
    };
  }
}

module.exports = {
  generatePostureInsult
};

