const { BOT_TOKEN, TELEGRAM_API_URL } = require('./config.js');

/**
 * Send an alert message to a specific chat
 * @param {number|string} chatId - The Telegram chat ID to send the message to
 * @param {string} text - The message text to send
 * @param {Object} replyMarkup - Optional inline keyboard or reply markup
 * @returns {Promise<Object>} The response from Telegram API
 */
async function sendAlert(chatId, text, replyMarkup = null) {
  try {
    const payload = {
      chat_id: chatId,
      text: text,
    };

    // Add reply markup if provided
    if (replyMarkup) {
      payload.reply_markup = replyMarkup;
    }

    const response = await fetch(`${TELEGRAM_API_URL}/sendMessage`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!data.ok) {
      throw new Error(`Telegram API error: ${data.description || 'Unknown error'}`);
    }

    console.log(`✅ Alert sent to ${chatId}: ${text}`);
    return data;
  } catch (error) {
    console.error('❌ Failed to send alert:', error.message);
    throw error;
  }
}

module.exports = {
  sendAlert
};

