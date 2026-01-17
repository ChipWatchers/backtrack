/**
 * Generate an AI insult about posture using Gemini API
 */

async function generatePostureInsult() {
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

  const { GEMINI_API_KEY } = loadSecrets();

  if (!GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY not found in config/secrets.env');
  }

  const prompt = `Generate a short, funny, creative insult (1-2 sentences max) about someone having bad posture and needing to sit up straight. Make it playful and humorous, not mean. The insult should be direct and entertaining.`;

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

    console.log(`🤖 AI generated insult: ${insult}`);
    return insult;
  } catch (error) {
    console.error('❌ Failed to generate insult:', error.message);
    // Fallback insult if API fails
    return "Hey! Your posture looks like a question mark. Sit up straight!";
  }
}

module.exports = {
  generatePostureInsult
};

