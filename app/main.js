const { sendAlert } = require('../telegram/sendAlert.js');
const fs = require('fs');
const path = require('path');

// Load friends from config
function loadFriends() {
  const friendsPath = path.join(__dirname, '../config/friends.json');
  try {
    const friendsData = fs.readFileSync(friendsPath, 'utf8');
    const config = JSON.parse(friendsData);
    return config.friends || [];
  } catch (error) {
    console.error('❌ Failed to load friends.json:', error.message);
    return [];
  }
}

/**
 * Handle slouch detection event
 * This will be called when slouching is detected (fake trigger for now)
 */
async function onSlouchDetected() {
  console.log('🚨 Slouch detected! Sending alerts to friends...');
  
  const friends = loadFriends();
  
  if (friends.length === 0) {
    console.warn('⚠️  No friends configured. Add friends to config/friends.json');
    return;
  }
  
  const alertMessage = '🚨 Posture Alert: You are slouching! Sit up straight!';
  
  // Send alert to all friends
  for (const friend of friends) {
    try {
      await sendAlert(friend.chatId, alertMessage);
    } catch (error) {
      console.error(`❌ Failed to send alert to ${friend.name} (${friend.chatId}):`, error.message);
    }
  }
}

// Fake slouch trigger for testing
// Simulates slouch detection after 5 seconds
console.log('🤖 Starting posture snitch...');
console.log('⏱️  Fake slouch trigger will fire in 5 seconds...');
console.log('💡 This simulates: "User slouched for 5 seconds"');

setTimeout(() => {
  onSlouchDetected();
}, 5000);

// Keep the process alive
process.on('SIGINT', () => {
  console.log('\n👋 Shutting down...');
  process.exit(0);
});

module.exports = {
  onSlouchDetected
};

