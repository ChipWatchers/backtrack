const { playAudio } = require('../app/audioPlayer.js');

// Store reply callbacks
let replyCallbacks = [];

/**
 * Register a callback to be called when a reply is received
 * @param {Function} callback - Function that receives (text, chatId, message) parameters
 */
function onReply(callback) {
  if (typeof callback !== 'function') {
    throw new Error('onReply requires a function callback');
  }
  replyCallbacks.push(callback);
  console.log('📥 Reply listener registered');
}

/**
 * Process messages and trigger reply callbacks
 * This should be called from bot.js's polling loop
 * @param {Array} updates - Array of update objects from Telegram
 */
function processReplies(updates) {
  if (!updates || updates.length === 0) return;

  for (const update of updates) {
    // Check if this is a message (reply)
    if (update.message) {
      const chatId = update.message.chat.id;
      const text = update.message.text || '';
      const username = update.message.from.username || update.message.from.first_name || 'Unknown';

      // Trigger all registered callbacks if there's text
      if (replyCallbacks.length > 0 && text.trim()) {
        replyCallbacks.forEach(callback => {
          try {
            callback(text, chatId, update.message);
          } catch (error) {
            console.error('❌ Error in reply callback:', error.message);
          }
        });
      }
      
      // Automatically play audio for reply messages
      if (text.trim()) {
        playAudio(text).catch(error => {
          console.error('❌ Error playing audio for reply:', error.message);
        });
      }
    }
  }
}

module.exports = {
  onReply,
  processReplies
};

