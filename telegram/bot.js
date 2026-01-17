const fs = require('fs');
const path = require('path');
const { processReplies } = require('./receiveReply.js');

// Load BOT_TOKEN from secrets.env
function loadSecrets() {
  const secretsPath = path.join(__dirname, '../config/secrets.env');
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
}

const { BOT_TOKEN } = loadSecrets();
const TELEGRAM_API_URL = `https://api.telegram.org/bot${BOT_TOKEN}`;

let lastUpdateId = 0;
let messagesReceived = 0;

/**
 * Check webhook status
 */
async function checkWebhookStatus() {
  try {
    const response = await fetch(`${TELEGRAM_API_URL}/getWebhookInfo`);
    const data = await response.json();
    if (data.ok && data.result.url) {
      return { hasWebhook: true, url: data.result.url };
    }
    return { hasWebhook: false };
  } catch (error) {
    return { hasWebhook: false };
  }
}

/**
 * Delete any existing webhook to allow polling
 */
async function deleteWebhook() {
  try {
    // First check if webhook exists
    const webhookStatus = await checkWebhookStatus();
    
    if (webhookStatus.hasWebhook) {
      console.log(`🔗 Found active webhook: ${webhookStatus.url}`);
      
      // Delete with drop_pending_updates to clear any pending webhook updates
      const response = await fetch(`${TELEGRAM_API_URL}/deleteWebhook?drop_pending_updates=true`);
      const data = await response.json();
      
      if (data.ok) {
        console.log('✅ Webhook deleted successfully');
      } else {
        console.warn('⚠️  Failed to delete webhook:', data);
      }
    } else {
      console.log('✅ No webhook found (ready for polling)');
    }
  } catch (error) {
    console.warn('⚠️  Error checking/deleting webhook:', error.message);
  }
}

/**
 * Poll Telegram for new updates
 * Uses getUpdates method with long polling
 */
async function pollUpdates() {
  try {
    const response = await fetch(`${TELEGRAM_API_URL}/getUpdates?offset=${lastUpdateId + 1}&timeout=10`);
    const data = await response.json();
    
    if (!data.ok) {
      // Handle 409 conflict silently - just wait and retry
      if (data.error_code === 409) {
        await new Promise(resolve => setTimeout(resolve, 3000));
        return;
      }
      // For other errors, log them
      console.error('Telegram API error:', data);
      return;
    }
    
    if (data.result && data.result.length > 0) {
      for (const update of data.result) {
        // Update the last processed update ID
        lastUpdateId = update.update_id;
        
        // Log incoming messages
        if (update.message) {
          messagesReceived++;
          const chatId = update.message.chat.id;
          const username = update.message.from.username || update.message.from.first_name || 'Unknown';
          const text = update.message.text || '(no text)';
          
          console.log(`[${new Date().toISOString()}] Message from @${username} (${chatId}): ${text}`);
        }
      }
      
      // Process replies through callback system
      processReplies(data.result);
    }
  } catch (error) {
    console.error('Error polling updates:', error.message);
  }
}

/**
 * Start the polling loop
 */
async function startPolling() {
  console.log('🤖 Starting Telegram bot...');
  
  // Delete any existing webhook to allow polling
  await deleteWebhook();
  
  console.log('📡 Polling for messages...');
  console.log('💬 Send "hi" to your bot to test!');
  
  // Poll immediately, then continue polling
  pollUpdates();
  
  // Poll every 2 seconds (reduced from 1s to be less aggressive)
  setInterval(pollUpdates, 2000);
}

// Start polling if this file is run directly
if (require.main === module) {
  startPolling();
}

module.exports = {
  startPolling,
  pollUpdates,
  BOT_TOKEN,
  TELEGRAM_API_URL
};

