/**
 * Test script for sendAlert and receiveReply
 * 
 * Usage:
 * 1. For sendAlert: node telegram/test-alerts.js send
 * 2. For receiveReply: Start bot.js first, then run this script
 */

const { sendAlert } = require('./sendAlert.js');
const { onReply } = require('./receiveReply.js');
const { startPolling } = require('./bot.js');

const MY_CHAT_ID = 1202231782; // Replace with your chat ID if different

// Test sendAlert
async function testSendAlert() {
  console.log('🧪 Testing sendAlert...');
  try {
    await sendAlert(MY_CHAT_ID, 'Test alert message from posture-snitch!');
    console.log('✅ sendAlert test successful - check your Telegram!');
  } catch (error) {
    console.error('❌ sendAlert test failed:', error.message);
  }
}

// Test receiveReply
function testReceiveReply() {
  console.log('🧪 Testing receiveReply...');
  console.log('📥 Registering reply callback...');
  
  onReply((text) => {
    console.log("Reply:", text);
  });
  
  console.log('✅ Reply callback registered!');
  console.log('💬 Send a message to your bot to test the callback');
  console.log('🔄 Starting bot polling...');
  startPolling();
}

// Main
const command = process.argv[2];

if (command === 'send') {
  testSendAlert();
} else if (command === 'reply') {
  testReceiveReply();
} else {
  console.log('Usage:');
  console.log('  node telegram/test-alerts.js send   - Test sendAlert');
  console.log('  node telegram/test-alerts.js reply  - Test receiveReply');
}

