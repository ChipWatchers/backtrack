const { playAudio } = require('../app/audioPlayer.js');

// Function to check if there's an active alert session (set by bot.js)
let hasActiveAlertSessionCheck = null;

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
 * Set the function to check for active alert session
 * Called by bot.js to avoid circular dependency
 */
function setActiveAlertSessionCheck(checkFn) {
  hasActiveAlertSessionCheck = checkFn;
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
      
      // Don't auto-play individual replies if there's an active alert session
      // (they will be collated and played together instead)
      const hasActiveSession = hasActiveAlertSessionCheck ? hasActiveAlertSessionCheck() : false;
      if (text.trim() && !hasActiveSession) {
        // Only auto-play if there's no active alert session
        playAudio(text).catch(error => {
          console.error('❌ Error playing audio for reply:', error.message);
        });
      }
      // If there's an active alert session, replies will be handled by bot.js collation
    }
  }
}

module.exports = {
  onReply,
  processReplies,
  setActiveAlertSessionCheck
};

