const fs = require('fs');
const path = require('path');
const { processReplies, setActiveAlertSessionCheck } = require('./receiveReply.js');
const http = require('http');
const { sendAlert } = require('./sendAlert.js');
const { BOT_TOKEN, TELEGRAM_API_URL } = require('./config.js');
const { generatePostureInsult } = require('../utils/insultGenerator.js');
const { playAudio } = require('../app/audioPlayer.js');

let lastUpdateId = 0;
let messagesReceived = 0;

// Track active alert session (one per trigger)
let activeAlertSession = null; // { timerId, responses: Map<chatId, {name, text}>, enabledFriends: [] }

// Track contacts who have messaged the bot (for auto-detection)
const detectedContacts = new Map(); // chatId -> { chatId, username, firstName }

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
          
          // Track contact for auto-detection
          detectedContacts.set(chatId, {
            chatId: chatId,
            username: update.message.from.username || null,
            firstName: update.message.from.first_name || 'Unknown',
            lastName: update.message.from.last_name || null
          });
          
          // Auto-add friend when they message /start or start
          const normalizedText = text.toLowerCase().trim();
          if (normalizedText === '/start' || normalizedText === 'start' || normalizedText === 'hi' || normalizedText === 'hello') {
            autoAddFriend(chatId, update.message.from);
          }
        }
      }

      // Process replies through callback system
      processReplies(data.result);
      
      // Check if any replies are for the active alert session
      if (activeAlertSession) {
        for (const update of data.result) {
          if (update.message) {
            const chatId = update.message.chat.id;
            const text = update.message.text || '';
            
            // Check if this is a reply from one of the enabled friends
            const friend = activeAlertSession.enabledFriends.find(f => f.chatId === chatId);
            
            if (text.trim() && friend && !activeAlertSession.responses.has(chatId)) {
              // Store the response
              const friendName = friend.name;
              activeAlertSession.responses.set(chatId, {
                name: friendName,
                text: text.trim()
              });
              
              console.log(`📨 Reply received from ${friendName} (${chatId}): ${text}`);
              
              // Mark that a friend replied - this prevents AI insult from playing
              activeAlertSession.aiInsultCancelled = true;
              
              // If any friend replied, cancel the AI insult timer immediately
              if (activeAlertSession.timerId) {
                clearTimeout(activeAlertSession.timerId);
                activeAlertSession.timerId = null;
                console.log(`✅ AI insult cancelled - friend replied within 15s`);
              }
              
              // Wait 3 more seconds to collect other responses, then collate all
              // Clear any existing collection timer first
              if (activeAlertSession.collectionTimerId) {
                clearTimeout(activeAlertSession.collectionTimerId);
              }
              
              activeAlertSession.collectionTimerId = setTimeout(() => {
                processFriendResponses(activeAlertSession);
                activeAlertSession = null;
              }, 3000); // Wait 3 more seconds for other friends to reply
            }
          }
        }
      }
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

  // Set the active alert session check function in receiveReply.js
  // This avoids circular dependency
  setActiveAlertSessionCheck(() => activeAlertSession !== null);

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
  startHttpServer();
}

/**
 * ------------------------------------------------------------------
 * HTTP SERVER FOR BROWSER COMMUNICATION
 * ------------------------------------------------------------------
 */



function loadFriends(userId) {
  // If no userId provided, use default friends.json (backwards compatibility)
  const friendsPath = userId 
    ? path.join(__dirname, `../config/friends_${userId}.json`)
    : path.join(__dirname, '../config/friends.json');
  
  try {
    if (!fs.existsSync(friendsPath)) {
      // File doesn't exist yet - return empty array
      return [];
    }
    const friendsData = fs.readFileSync(friendsPath, 'utf8');
    const config = JSON.parse(friendsData);
    return config.friends || [];
  } catch (error) {
    // If file doesn't exist, return empty array
    if (error.code === 'ENOENT') {
      return [];
    }
    console.error('❌ Failed to load friends file:', error.message);
    return [];
  }
}

function saveFriends(friends, userId) {
  // If no userId provided, use default friends.json (backwards compatibility)
  const friendsPath = userId 
    ? path.join(__dirname, `../config/friends_${userId}.json`)
    : path.join(__dirname, '../config/friends.json');
  
  try {
    const config = { friends: friends };
    fs.writeFileSync(friendsPath, JSON.stringify(config, null, 2), 'utf8');
    return true;
  } catch (error) {
    console.error('❌ Failed to save friends file:', error.message);
    return false;
  }
}

/**
 * Auto-add friend when they message /start or start
 * Note: In multi-user mode, auto-add uses default friends.json (no userId)
 * Users should add friends via UI for proper per-user isolation
 */
function autoAddFriend(chatId, from) {
  // Use default friends.json (no userId) for auto-add
  // This maintains backwards compatibility but means auto-add doesn't support per-user storage
  // For proper multi-user support, users should add friends via UI
  const friends = loadFriends(null);
  
  // Check if friend already exists
  const existingFriend = friends.find(f => f.chatId === chatId || f.chatId === parseInt(chatId));
  
  if (existingFriend) {
    console.log(`✅ Friend ${existingFriend.name} (${chatId}) already in list`);
    return;
  }
  
  // Generate friend name
  const name = from.first_name + (from.last_name ? ` ${from.last_name}` : '') || 
               from.username ? `@${from.username}` : 
               'Unknown';
  
  // Add new friend
  friends.push({
    chatId: parseInt(chatId),
    name: name,
    enabled: true
  });
  
  if (saveFriends(friends, null)) {
    console.log(`✅ Auto-added friend: ${name} (${chatId}) - they messaged /start`);
    console.log(`⚠️  Note: Auto-add uses default friends.json. For per-user storage, add friends via UI.`);
  } else {
    console.error(`❌ Failed to auto-add friend ${chatId}`);
  }
}

/**
 * Process and play collated friend responses
 */
async function processFriendResponses(session) {
  if (!session || session.responses.size === 0) {
    return; // No responses to process
  }

  const responses = Array.from(session.responses.values());
  
  // Format responses: "Nasif says: this is this, Roy says: this this this"
  // This format ensures the name is pronounced first, then "says:", then the message
  const formattedResponses = responses.map(r => `${r.name} says ${r.text}`).join(', ');
  
  console.log(`📝 Collated responses: ${formattedResponses}`);
  
  // Play the collated responses as audio
  try {
    await playAudio(formattedResponses);
    console.log(`🔊 Played collated responses from ${responses.length} friend(s)`);
  } catch (error) {
    console.error(`❌ Failed to play collated responses:`, error.message);
  }
}

function startHttpServer() {
  const PORT = 3001;
  const url = require('url');

  const server = http.createServer(async (req, res) => {
    // Handle CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS, DELETE, PATCH');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
      res.writeHead(200);
      res.end();
      return;
    }

    const parsedUrl = url.parse(req.url, true);
    const pathname = parsedUrl.pathname;

    // GET /friends - Get current friends list
    if (pathname === '/friends' && req.method === 'GET') {
      const userId = parsedUrl.query.userId || null;
      const friends = loadFriends(userId);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ friends }));
      return;
    }

    // GET /contacts - Get detected contacts who messaged the bot
    if (pathname === '/contacts' && req.method === 'GET') {
      const contacts = Array.from(detectedContacts.values());
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ contacts }));
      return;
    }

    // POST /friends - Add new friend
    if (pathname === '/friends' && req.method === 'POST') {
      let body = '';
      req.on('data', chunk => { body += chunk.toString(); });
      req.on('end', async () => {
        try {
          const { userId, chatId, name } = JSON.parse(body);
          
          if (!chatId || !name) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'chatId and name are required' }));
            return;
          }

          const friends = loadFriends(userId || null);
          
          // Check if friend already exists
          if (friends.find(f => f.chatId === parseInt(chatId) || f.chatId === chatId)) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Friend already exists' }));
            return;
          }

          // Add new friend
          friends.push({
            chatId: parseInt(chatId),
            name: name,
            enabled: true
          });

          if (saveFriends(friends, userId || null)) {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true, friends }));
          } else {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Failed to save friends' }));
          }
        } catch (error) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: error.message }));
        }
      });
      return;
    }

    // DELETE /friends/:chatId - Remove friend
    if (pathname.startsWith('/friends/') && req.method === 'DELETE') {
      const chatId = parseInt(pathname.split('/')[2]);
      const userId = parsedUrl.query.userId || null;
      
      if (!chatId) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid chatId' }));
        return;
      }

      const friends = loadFriends(userId);
      const filteredFriends = friends.filter(f => f.chatId !== chatId);

      if (friends.length === filteredFriends.length) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Friend not found' }));
        return;
      }

      if (saveFriends(filteredFriends, userId)) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, friends: filteredFriends }));
      } else {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Failed to save friends' }));
      }
      return;
    }

    // PATCH /friends/:chatId/toggle - Toggle friend enabled/disabled
    if (pathname.match(/^\/friends\/(\d+)\/toggle$/) && req.method === 'PATCH') {
      const chatId = parseInt(pathname.split('/')[2]);
      const userId = parsedUrl.query.userId || null;
      
      if (!chatId) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid chatId' }));
        return;
      }

      const friends = loadFriends(userId);
      const friend = friends.find(f => f.chatId === chatId);

      if (!friend) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Friend not found' }));
        return;
      }

      // Toggle enabled status
      friend.enabled = !friend.enabled;

      if (saveFriends(friends, userId)) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, friend }));
      } else {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Failed to save friends' }));
      }
      return;
    }

    if (req.url === '/trigger' && req.method === 'POST') {
      console.log("🔥 Received Trigger from Browser!");

      // Extract userId from request body if provided
      let userId = null;
      let body = '';
      
      await new Promise((resolve) => {
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', () => {
          try {
            if (body) {
              const parsedBody = JSON.parse(body);
              userId = parsedBody.userId || null;
            }
          } catch (e) {
            // Body might be empty or not JSON - that's okay
          }
          resolve();
        });
      });

      const friends = loadFriends(userId);
      const enabledFriends = friends.filter(f => f.enabled !== false);
      console.log(`📋 Sending alerts to ${enabledFriends.length} enabled friend(s) out of ${friends.length} total friend(s)`);
      
      const alertMessage = '🚨 Posture Alert: You are slouching! Sit up straight!';

      // Cancel any existing alert session
      if (activeAlertSession && activeAlertSession.timerId) {
        clearTimeout(activeAlertSession.timerId);
      }

      // Create new alert session
      activeAlertSession = {
        timerId: null,
        collectionTimerId: null, // Timer for collecting responses
        responses: new Map(), // chatId -> {name, text}
        enabledFriends: enabledFriends,
        aiInsultCancelled: false // Flag to prevent AI insult if any friend replies
      };

      // Send to enabled friends only
      for (const friend of enabledFriends) {
        try {
          await sendAlert(friend.chatId, alertMessage);
          console.log(`✅ Alert sent to ${friend.name} (${friend.chatId})`);
        } catch (e) {
          console.error(`❌ Failed to send to ${friend.name}:`, e.message);
        }
      }

      // Start single 15-second timeout timer for all friends
      // If no one replies, generate insult and play audio
      // Store session reference to check in callback
      const sessionRef = activeAlertSession;
      
      activeAlertSession.timerId = setTimeout(async () => {
        // Check if ANY friend replied - if so, DO NOT play AI insult
        // Use the stored session reference to avoid stale closure issues
        if (!sessionRef || sessionRef.aiInsultCancelled || sessionRef.responses.size > 0) {
          // Friend replied within 15s - AI insult is cancelled
          console.log(`✅ AI insult prevented - friend(s) replied within 15s`);
          // Clear session if it's still the active one
          if (activeAlertSession === sessionRef) {
            activeAlertSession = null;
          }
          return;
        }
        
        // Double-check: if activeAlertSession changed, don't play
        if (activeAlertSession !== sessionRef) {
          console.log(`✅ AI insult prevented - new alert session started`);
          return;
        }
        
        // No replies received from anyone - generate AI insult and play it
        console.log(`⏰ No replies from any friends within 15s, generating insult...`);
        
        try {
          const insult = await generatePostureInsult();
          
          // Final check before playing
          if (activeAlertSession !== sessionRef || sessionRef.aiInsultCancelled || sessionRef.responses.size > 0) {
            console.log(`✅ AI insult prevented - friend replied just before playing`);
            return;
          }
          
          // Play the insult as audio
          await playAudio(insult);
          
          console.log(`🔊 Played fallback insult: "${insult}"`);
        } catch (error) {
          console.error(`❌ Failed to generate/play insult:`, error.message);
        }
        
        // Clear alert session only if it's still the same one
        if (activeAlertSession === sessionRef) {
          activeAlertSession = null;
        }
      }, 15000); // 15 seconds

      console.log(`⏱️  Started 15s timeout timer for all ${enabledFriends.length} friend(s)`);

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true }));
    } else {
      res.writeHead(404);
      res.end();
    }
  });

  server.listen(PORT, () => {
    console.log(`🌐 HTTP Server listening on http://localhost:${PORT}`);
  });
}


/**
 * Check if there's an active alert session
 * Used by receiveReply.js to prevent individual audio playback
 */
function hasActiveAlertSession() {
  return activeAlertSession !== null;
}

module.exports = {
  startPolling,
  pollUpdates,
  hasActiveAlertSession
};

