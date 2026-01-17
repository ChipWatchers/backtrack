const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

/**
 * Play text as audio using macOS 'say' command
 * @param {string} text - The text to speak
 * @returns {Promise<void>}
 */
async function playAudio(text) {
  if (!text || typeof text !== 'string' || !text.trim()) {
    console.warn('⚠️  playAudio: Empty or invalid text provided');
    return;
  }

  try {
    // Escape special characters for shell command
    // Replace single quotes with escaped version and wrap in single quotes
    const escapedText = text.replace(/'/g, "'\"'\"'");
    
    // Use macOS 'say' command
    const command = `say '${escapedText}'`;
    
    // Execute asynchronously (non-blocking)
    await execAsync(command);
    console.log(`🔊 Audio played: "${text}"`);
  } catch (error) {
    console.error('❌ Failed to play audio:', error.message);
    // Don't throw - audio failure shouldn't break the app
  }
}

module.exports = {
  playAudio
};

