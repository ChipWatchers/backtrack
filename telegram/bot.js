const fs = require('fs');
const path = require('path');
const { processReplies, setActiveAlertSessionCheck } = require('./receiveReply.js');
const http = require('http');
const { sendAlert } = require('./sendAlert.js');
const { BOT_TOKEN, TELEGRAM_API_URL } = require('./config.js');
const { generatePostureInsult } = require('../utils/insultGenerator.js');
const { playAudio } = require('../app/audioPlayer.js');
const { getAllVoices } = require('../config/voices.js');

let lastUpdateId = 0;
let messagesReceived = 0;

// Track active alert session (one per trigger)
let activeAlertSession = null; // { timerId, responses: Map<chatId, {name, text, voiceId}>, enabledFriends: [], guardianPersonalities: Map<chatId, voiceId> }

// Audio Event Queue for Client Polling
const audioQueue = [];

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
 * Generate inline keyboard with personality selection buttons
 * @returns {Object} Inline keyboard markup for Telegram
 */
function generatePersonalityKeyboard() {
  const voices = getAllVoices();
  const buttons = [];

  // Create buttons in rows of 2
  for (let i = 0; i < voices.length; i += 2) {
    const row = [];
    row.push({
      text: voices[i].name,
      callback_data: `personality_${voices[i].id}`
    });
    if (i + 1 < voices.length) {
      row.push({
        text: voices[i + 1].name,
        callback_data: `personality_${voices[i + 1].id}`
      });
    }
    buttons.push(row);
  }

  // Add "Generate AI Roast" button on a separate row
  buttons.push([
    {
      text: '🎭 Generate AI Roast',
      callback_data: 'generate_ai_roast'
    }
  ]);

  return {
    inline_keyboard: buttons
  };
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

        // Handle callback queries (button clicks)
        if (update.callback_query) {
          const callbackQuery = update.callback_query;
          const chatId = callbackQuery.message.chat.id;
          const data = callbackQuery.data;
          const from = callbackQuery.from;

          // Handle personality selection
          if (data && data.startsWith('personality_')) {
            const voiceId = data.replace('personality_', '');

            // Find the voice name
            const voices = getAllVoices();
            const selectedVoice = voices.find(v => v.id === voiceId);
            const voiceName = selectedVoice ? selectedVoice.name : 'Unknown';

            // Check if this is from an enabled friend in the active alert session
            if (activeAlertSession) {
              const friend = activeAlertSession.enabledFriends.find(f => f.chatId === chatId);

              if (friend) {
                // Store guardian's personality selection per guardian (Map: chatId -> voiceId)
                if (!activeAlertSession.guardianPersonalities) {
                  activeAlertSession.guardianPersonalities = new Map();
                }
                activeAlertSession.guardianPersonalities.set(chatId, voiceId);
                console.log(`🎭 Guardian ${friend.name} (${chatId}) selected personality: ${voiceName} (${voiceId})`);

                // Answer the callback query (removes loading state)
                try {
                  await fetch(`${TELEGRAM_API_URL}/answerCallbackQuery`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      callback_query_id: callbackQuery.id,
                      text: `✅ ${voiceName} selected!`,
                      show_alert: false
                    })
                  });

                  // Edit the message to show selection (optional)
                  await fetch(`${TELEGRAM_API_URL}/editMessageText`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      chat_id: chatId,
                      message_id: callbackQuery.message.message_id,
                      text: callbackQuery.message.text + `\n\n✅ ${friend.name} selected: ${voiceName}`,
                      reply_markup: callbackQuery.message.reply_markup // Keep buttons
                    })
                  });
                } catch (error) {
                  console.error('❌ Error answering callback query:', error.message);
                }
              } else {
                // Not a friend - ignore
                await fetch(`${TELEGRAM_API_URL}/answerCallbackQuery`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    callback_query_id: callbackQuery.id,
                    text: 'You are not authorized to select personality',
                    show_alert: true
                  })
                });
              }
            } else {
              // No active alert session
              await fetch(`${TELEGRAM_API_URL}/answerCallbackQuery`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  callback_query_id: callbackQuery.id,
                  text: 'No active slouch alert',
                  show_alert: true
                })
              });
            }
          }

          // Handle "Generate AI Roast" button click
          if (data === 'generate_ai_roast') {
            // Check if this is from an enabled friend in the active alert session
            if (activeAlertSession) {
              const friend = activeAlertSession.enabledFriends.find(f => f.chatId === chatId);

              if (friend) {
                // Answer callback query immediately (show loading)
                try {
                  await fetch(`${TELEGRAM_API_URL}/answerCallbackQuery`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      callback_query_id: callbackQuery.id,
                      text: 'Generating AI roast...',
                      show_alert: false
                    })
                  });
                } catch (error) {
                  console.error('❌ Error answering callback query:', error.message);
                }

                // Determine which personality to use: guardian's selection or user's default
                const guardianVoiceId = activeAlertSession.guardianPersonalities?.get(chatId) || null;
                const voiceIdToUse = guardianVoiceId || activeAlertSession.voiceId || 'FRzaj7L4px15biN0RGSj';
                const personalitySource = guardianVoiceId ? 'guardian-selected' : 'user-default';

                console.log(`🎭 Guardian ${friend.name} (${chatId}) generating AI roast with ${personalitySource} personality: ${voiceIdToUse}`);

                // Generate AI insult
                try {
                  const insultResult = await generatePostureInsult(voiceIdToUse);
                  const generatedText = insultResult.text;

                  console.log(`🤖 Generated AI roast for ${friend.name}: "${generatedText}"`);

                  // Simulate guardian reply by adding to activeAlertSession.responses with voiceId
                  if (!activeAlertSession.responses.has(chatId)) {
                    activeAlertSession.responses.set(chatId, {
                      name: friend.name,
                      text: generatedText,
                      voiceId: voiceIdToUse // Store voiceId so we can play it with that voice
                    });

                    // Mark that a friend replied - this prevents AI insult from playing
                    activeAlertSession.aiInsultCancelled = true;

                    console.log(`✅ AI roast added as ${friend.name}'s reply`);

                    // Cancel the AI insult timer if it exists
                    if (activeAlertSession.timerId) {
                      clearTimeout(activeAlertSession.timerId);
                      activeAlertSession.timerId = null;
                      console.log(`⏰ Cancelled timeout AI insult - guardian generated roast instead`);
                    }

                    // Start collection timer to gather more responses if needed
                    if (!activeAlertSession.collectionTimerId && activeAlertSession.enabledFriends.length > 1) {
                      activeAlertSession.collectionTimerId = setTimeout(async () => {
                        await processFriendResponses(activeAlertSession);
                        if (activeAlertSession === activeAlertSession) {
                          activeAlertSession = null;
                        }
                      }, 3000); // Wait 3 more seconds for other friends to reply
                      console.log(`⏱️  Started 3s collection timer for other friends`);
                    } else if (activeAlertSession.enabledFriends.length === 1) {
                      // Only one friend - play immediately
                      await processFriendResponses(activeAlertSession);
                      activeAlertSession = null;
                    }

                    // Send confirmation message to guardian
                    try {
                      await sendAlert(chatId, `✅ AI Roast generated and sent!\n\n"${generatedText}"`);
                    } catch (error) {
                      console.error('❌ Failed to send confirmation to guardian:', error.message);
                    }
                  } else {
                    console.log(`⚠️  ${friend.name} already replied - not adding generated roast`);
                    await sendAlert(chatId, '⚠️ You already sent a message. The generated roast was not added.');
                  }
                } catch (error) {
                  console.error(`❌ Failed to generate AI roast for ${friend.name}:`, error.message);
                  try {
                    await sendAlert(chatId, `❌ Failed to generate AI roast: ${error.message}`);
                  } catch (sendError) {
                    console.error('❌ Failed to send error message to guardian:', sendError.message);
                  }
                }
              } else {
                // Not a friend - ignore
                await fetch(`${TELEGRAM_API_URL}/answerCallbackQuery`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    callback_query_id: callbackQuery.id,
                    text: 'You are not authorized to generate roasts',
                    show_alert: true
                  })
                });
              }
            } else {
              // No active alert session
              await fetch(`${TELEGRAM_API_URL}/answerCallbackQuery`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  callback_query_id: callbackQuery.id,
                  text: 'No active slouch alert',
                  show_alert: true
                })
              });
            }
          }

          continue; // Skip to next update
        }

        // Log incoming messages
        if (update.message) {
          messagesReceived++;
          const chatId = update.message.chat.id;
          const username = update.message.from.username || update.message.from.first_name || 'Unknown';
          const text = update.message.text || '(no text)';

          console.log(`[${new Date().toISOString()}] Message from @${username} (${chatId}): ${text}`);

          // Handle /start command with optional parameter
          const normalizedText = text.toLowerCase().trim();
          if (normalizedText.startsWith('/start') || normalizedText === 'start') {
            // Extract userId parameter from /start command
            // Format: /start USER_A_ID or /start USER_A_ID (Telegram sends it as part of text)
            let userId = null;

            if (normalizedText.startsWith('/start ')) {
              // Extract parameter after /start
              const match = text.match(/^\/start\s+(.+)$/i);
              if (match && match[1]) {
                userId = decodeURIComponent(match[1].trim());
                console.log(`🔗 Start command received with userId parameter: ${userId}`);
              }
            }

            // If userId parameter exists, add friend to that specific user's list
            if (userId) {
              autoAddFriendForUser(chatId, update.message.from, userId);
            } else {
              // No parameter - just show welcome message (backwards compatibility)
              console.log(`ℹ️  Generic /start received (no userId parameter) - friend not auto-added`);
            }
          } else {
            // Track contact info when they message (for display purposes)
            // This stores contact info, but contacts only appear in dropdown if they're in user's friend list
            detectedContacts.set(chatId, {
              chatId: chatId,
              username: update.message.from.username || null,
              firstName: update.message.from.first_name || 'Unknown',
              lastName: update.message.from.last_name || null
            });
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
              // Store the response with guardian's selected personality voiceId (if any)
              const friendName = friend.name;
              const guardianVoiceId = activeAlertSession.guardianPersonalities?.get(chatId) || null;
              activeAlertSession.responses.set(chatId, {
                name: friendName,
                text: text.trim(),
                voiceId: guardianVoiceId // Store voiceId so we can play it with that voice
              });

              console.log(`📝 Processing ${responses.length} response(s) with voice playback`);

              // Queue each response individually so the client can play them with correct voices
              for (const response of responses) {
                const voiceId = response.voiceId || null;
                const formattedText = `${response.name} says ${response.text}`;

                // Logic from HEAD was to play locally. Logic from Main is to queue.
                // We queue it for the client.
                audioQueue.push({
                  text: formattedText,
                  originalText: response.text, // raw text
                  name: response.name,
                  voiceId: voiceId, // Pass voiceId to client!
                  timestamp: Date.now(),
                  type: 'reply'
                });

                console.log(`🔊 Queued response from ${response.name}${voiceId ? ` with voice ${voiceId}` : ' (default voice)'}`);
              }

              console.log(`✅ Queued all ${responses.length} response(s) for client playback`);

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
 * Auto-add friend to a specific user's friend list when they click personalized bot link
 * Friend must use /start with userId parameter: /start USER_A_ID
 */
function autoAddFriendForUser(chatId, from, userId) {
  if (!userId) {
    console.error('❌ Cannot add friend: userId is required');
    return;
  }

  // Load friends for the specific user
  const friends = loadFriends(userId);

  // Check if friend already exists in this user's list
  const existingFriend = friends.find(f => f.chatId === chatId || f.chatId === parseInt(chatId));

  if (existingFriend) {
    console.log(`✅ Friend ${existingFriend.name} (${chatId}) already in user ${userId}'s list`);
    // Still track in detectedContacts so they appear in dropdown
    detectedContacts.set(chatId, {
      chatId: chatId,
      username: from.username || null,
      firstName: from.first_name || 'Unknown',
      lastName: from.last_name || null
    });
    return;
  }

  // Generate friend name
  const name = (from.first_name + (from.last_name ? ` ${from.last_name}` : '')) ||
    (from.username ? `@${from.username}` : '') ||
    'Unknown';

  // Add new friend to this specific user's list
  friends.push({
    chatId: parseInt(chatId),
    name: name,
    enabled: true
  });

  if (saveFriends(friends, userId)) {
    console.log(`✅ Auto-added friend: ${name} (${chatId}) to user ${userId}'s friend list via personalized link`);

    // Track in detectedContacts so they appear in this user's dropdown
    detectedContacts.set(chatId, {
      chatId: chatId,
      username: from.username || null,
      firstName: from.first_name || 'Unknown',
      lastName: from.last_name || null
    });
  } else {
    console.error(`❌ Failed to auto-add friend ${chatId} to user ${userId}'s list`);
  }
}


/**
 * Process and play collated friend responses
 * Each response can have its own voiceId (if guardian selected a personality)
 */
async function processFriendResponses(session) {
  if (!session || session.responses.size === 0) {
    return; // No responses to process
  }

  const responses = Array.from(session.responses.values());

  console.log(`📝 Processing ${responses.length} response(s) with voice playback`);

  // Queue each response individually so the client can play them with correct voices
  for (const response of responses) {
    const voiceId = response.voiceId || null;
    const formattedText = `${response.name} says ${response.text}`;

    // We queue it for the client.
    audioQueue.push({
      text: formattedText,
      originalText: response.text,
      name: response.name,
      voiceId: voiceId,
      timestamp: Date.now(),
      type: 'reply'
    });

    console.log(`🔊 Queued response from ${response.name}${voiceId ? ` with voice ${voiceId}` : ' (default voice)'}`);
  }

  console.log(`✅ Queued all ${responses.length} response(s) for client playback`);
}

function startHttpServer() {
  const PORT = process.env.PORT || 3001;
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

    // GET /contacts - Get contacts who are in the current user's friend list
    // Only returns contacts that have explicitly opted-in via personalized link
    if (pathname === '/contacts' && req.method === 'GET') {
      const parsedUrl = new URL(req.url, `http://${req.headers.host}`);
      const userId = parsedUrl.searchParams.get('userId') || null;

      // Load this user's friends list
      const userFriends = loadFriends(userId);

      // Convert friends list to contacts format for dropdown
      // Only show contacts that are in this user's friend list (opted-in via personalized link)
      const contacts = userFriends.map(friend => ({
        chatId: friend.chatId,
        username: detectedContacts.has(friend.chatId) ? detectedContacts.get(friend.chatId).username : null,
        firstName: detectedContacts.has(friend.chatId) ? detectedContacts.get(friend.chatId).firstName : friend.name.split(' ')[0] || friend.name,
        lastName: detectedContacts.has(friend.chatId) ? detectedContacts.get(friend.chatId).lastName : null
      }));

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

    // GET /audio-events - Client polls this to play audio
    if (pathname === '/audio-events' && req.method === 'GET') {
      const events = [...audioQueue];
      // Clear queue after sending
      audioQueue.length = 0;

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ events }));
      return;
    }

    if (req.url === '/trigger' && req.method === 'POST') {
      console.log("🔥 Received Trigger from Browser!");

      // Extract userId, userName, and voiceId from request body if provided
      let userId = null;
      let body = '';

<<<<<<< HEAD
      let userName = null;
      let voiceId = 'FRzaj7L4px15biN0RGSj'; // Default fallback
=======
>>>>>>> main
      await new Promise((resolve) => {
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', () => {
          console.log('🎭 [BOT.JS] Received request body (raw):', body);
          try {
            if (body) {
              const parsedBody = JSON.parse(body);
              console.log('🎭 [BOT.JS] Parsed request body:', JSON.stringify(parsedBody));

              userId = parsedBody.userId || null;
              userName = parsedBody.userName || null;

              // CRITICAL: Get voiceId from request - this MUST come from UI
              if (parsedBody.voiceId) {
                voiceId = parsedBody.voiceId;
                console.log('✅ [BOT.JS] voiceId received from request:', voiceId);
              } else {
                console.error('❌ [BOT.JS] NO voiceId in request body! Using default:', voiceId);
              }

              // Validate voiceId
              const validVoiceIds = ['FRzaj7L4px15biN0RGSj', 'wJ5MX7uuKXZwFqGdWM4N', 'ljEOxtzNoGEa58anWyea', 'K8nDX2f6wjv6bCh5UeZi', 'nw6EIXCsQ89uJMjytYb8', 'gad8DmXGyu7hwftX9JqI', 'spZS54yMfsj80VHtUQFY', 'yqZhXcy5spYR7Hhv17QY'];
              if (!validVoiceIds.includes(voiceId)) {
                console.error('❌ [BOT.JS] Invalid voiceId:', voiceId, '- using default');
                voiceId = 'FRzaj7L4px15biN0RGSj';
              }

              console.log('🎭 [BOT.JS] Final voiceId to use:', voiceId);
            } else {
              console.error('❌ [BOT.JS] No request body received! Using default:', voiceId);
            }
          } catch (e) {
            console.error('❌ [BOT.JS] Error parsing request body:', e.message);
            console.error('❌ [BOT.JS] Using default voiceId:', voiceId);
          }
          resolve();
        });
      });

      const friends = loadFriends(userId);
      const enabledFriends = friends.filter(f => f.enabled !== false);
      console.log(`📋 Sending alerts to ${enabledFriends.length} enabled friend(s) out of ${friends.length} total friend(s)`);

<<<<<<< HEAD
      // If no friends to alert, generate and play AI insult immediately (no waiting)
      if (enabledFriends.length === 0) {
        console.log('ℹ️  No friends to alert - generating AI insult immediately');

        // Send response immediately
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, message: 'No friends to alert - playing AI insult' }));

        // Generate and play AI insult directly with selected personality
        try {
          console.log(`🎭 Generating insult with voiceId: ${voiceId}`);
          const insultResult = await generatePostureInsult(voiceId);
          console.log(`🎭 Generated insult with voiceId: ${insultResult.voiceId}, voiceName: ${insultResult.voiceName}`);
          await playAudio(insultResult.text, insultResult.voiceId);
          console.log(`🤖 AI insult played (no friends scenario) - Voice: ${insultResult.voiceName}`);
        } catch (error) {
          console.error('❌ Failed to generate/play AI insult:', error.message);
        }

        return;
      }

      // Personalized alert message with user's name - savage but PG-13
      const alertMessage = userName && userName.trim()
        ? `🚨 ${userName} is slouching! Tell them to GET UP and straighten out RIGHT NOW or prepare for absolute verbal annihilation! No mercy! 💀`
        : '🚨 Someone is slouching! Tell them to GET UP and straighten out RIGHT NOW or prepare for absolute verbal annihilation! No mercy! 💀';
=======
      const alertMessage = '🚨 Posture Alert: You are slouching! Sit up straight!';
>>>>>>> main

      // Cancel any existing alert session
      if (activeAlertSession && activeAlertSession.timerId) {
        clearTimeout(activeAlertSession.timerId);
      }

      // Create new alert session
      activeAlertSession = {
        timerId: null,
        collectionTimerId: null, // Timer for collecting responses
        responses: new Map(), // chatId -> {name, text, voiceId}
        enabledFriends: enabledFriends,
        aiInsultCancelled: false, // Flag to prevent AI insult if any friend replies
        voiceId: voiceId || null, // Store user's selected personality voice ID (default)
        guardianPersonalities: new Map() // Guardian's personality selections: Map<chatId, voiceId>
      };

      // Generate inline keyboard with personality options
      const personalityKeyboard = generatePersonalityKeyboard();
      const alertMessageWithButtons = alertMessage + '\n\n⏰ You have 15 seconds to send a message!\n\n🎭 Choose an accent/personality:\n• Select an accent and type a message (it will be played in that voice)\n• OR select an accent and click "Generate AI Roast" to create a savage roast';

      // Send to enabled friends only with personality selection buttons
      for (const friend of enabledFriends) {
        try {
          await sendAlert(friend.chatId, alertMessageWithButtons, personalityKeyboard);
          console.log(`✅ Alert sent to ${friend.name} (${friend.chatId}) with personality selection`);
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
<<<<<<< HEAD
          // Get voiceId - use user's default (guardian's selection only applies to their typed/generated messages)
          const sessionVoiceId = sessionRef.voiceId || null;
          console.log(`🎭 Generating timeout AI insult with user-selected voiceId: ${sessionVoiceId}`);
          const insultResult = await generatePostureInsult(sessionVoiceId);
          console.log(`🎭 Generated insult with voiceId: ${insultResult.voiceId}, voiceName: ${insultResult.voiceName}`);
=======
          const insult = await generatePostureInsult();
>>>>>>> main

          // Final check before playing
          if (activeAlertSession !== sessionRef || sessionRef.aiInsultCancelled || sessionRef.responses.size > 0) {
            console.log(`✅ AI insult prevented - friend replied just before playing`);
            return;
          }

<<<<<<< HEAD
          // Play the insult as audio with personality voice
          await playAudio(insultResult.text, insultResult.voiceId);

          console.log(`🔊 Played fallback insult (${insultResult.voiceName}): "${insultResult.text}"`);
=======
          // Queue the insult for client playback
          audioQueue.push({ text: insult, timestamp: Date.now(), type: 'insult' });

          console.log(`🔊 Queued fallback insult: "${insult}"`);
>>>>>>> main
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

