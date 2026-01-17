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

  // Check if running on macOS
  if (process.platform !== 'darwin') {
    console.log(`🔇 Server audio skipped (not macOS): "${text}"`);
    return;
  }

  try {
    // Escape special characters for shell command
    const escapedText = text.replace(/'/g, "'\"'\"'");
    const command = `say '${escapedText}'`;
    await execAsync(command);
    console.log(`🔊 Audio played: "${text}"`);
  } catch (error) {
    console.error('❌ Failed to play audio:', error.message);
  }
}

module.exports = {
  playAudio
};

