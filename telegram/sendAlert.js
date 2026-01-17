const { BOT_TOKEN, TELEGRAM_API_URL } = require('./bot.js');

/**
 * Send an alert message to a specific chat
 * @param {number|string} chatId - The Telegram chat ID to send the message to
 * @param {string} text - The message text to send
 * @returns {Promise<Object>} The response from Telegram API
 */
async function sendAlert(chatId, text) {
  try {
    const response = await fetch(`${TELEGRAM_API_URL}/sendMessage`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: chatId,
        text: text,
      }),
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

