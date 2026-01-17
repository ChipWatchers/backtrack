/**
 * Friends Management UI
 */

const API_BASE = 'https://backtrack-production-06ac.up.railway.app';

// Generate or retrieve user ID from localStorage
function getUserId() {
  let userId = localStorage.getItem('postureSnitch_userId');
  if (!userId) {
    // Generate unique user ID: user_timestamp_random
    userId = `user_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    localStorage.setItem('postureSnitch_userId', userId);
    console.log('🆔 Generated new user ID:', userId);
  }
  return userId;
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
  initializeOnboarding();
  initializeFriendsManagement();
  initializePersonalitySelector();
  initializeSlouchTracker();

  // Debug: Add reset onboarding function to console (for testing)
  window.resetOnboarding = () => {
    localStorage.removeItem('postureSnitch_onboardingComplete');
    location.reload();
  };
  console.log('💡 Debug: Run resetOnboarding() in console to show welcome banner again');
});

// Initialize onboarding welcome banner
function initializeOnboarding() {
  // Check if onboarding already completed
  const onboardingComplete = localStorage.getItem('postureSnitch_onboardingComplete');

  // For testing: Always show banner
  if (true || !onboardingComplete) {
    // Show welcome banner on first visit
    const welcomeBanner = document.getElementById('welcomeBanner');
    if (welcomeBanner) {
      welcomeBanner.style.display = 'block';
    }

    // Load saved user name if exists
    const savedName = localStorage.getItem('postureSnitch_userName');
    const userNameInput = document.getElementById('userNameInput');
    if (userNameInput && savedName) {
      userNameInput.value = savedName;
    }
  }

  // Funny taglines array
  const funnyTaglines = [
    "Ready to fix your posture but with a twist—an AI that roasts you when you slouch! 🔥",
    "Because your spine deserves better than your terrible posture! 💀",
    "Slouching? Don't worry, our AI will absolutely destroy you for it! 😈",
    "Posture correction meets savage AI burns! Get roasted, get better! 🔥",
    "The only posture coach that will literally roast you alive! 💪",
    "Sit straight or get absolutely demolished by AI! No mercy! ⚡",
    "Warning: Our AI doesn't hold back. Neither should your posture! 🎯",
    "Transform from slouch to legend—with brutal AI motivation! 🚀"
  ];

  // Rotate taglines every 5 seconds
  let taglineIndex = 0;
  const taglineElement = document.getElementById('taglineText');
  if (taglineElement) {
    // Set initial tagline
    taglineElement.textContent = funnyTaglines[taglineIndex];

    // Rotate taglines
    setInterval(() => {
      taglineIndex = (taglineIndex + 1) % funnyTaglines.length;
      taglineElement.textContent = funnyTaglines[taglineIndex];
    }, 5000); // Change every 5 seconds
  }

  const userNameInput = document.getElementById('userNameInput');
  const enterNameBtn = document.getElementById('enterNameBtn');
  const welcomeBody = document.querySelector('.welcome-body');

  // Function to save name and lock input
  function saveUserName() {
    if (userNameInput) {
      const name = userNameInput.value.trim();
      if (name) {
        localStorage.setItem('postureSnitch_userName', name);
        // Lock the input once name is confirmed
        userNameInput.disabled = true;
        userNameInput.style.backgroundColor = '#2d2d2d';
        userNameInput.style.opacity = '0.7';
        userNameInput.style.cursor = 'not-allowed';
        if (enterNameBtn) {
          enterNameBtn.disabled = true;
          enterNameBtn.textContent = '✓ Confirmed';
          enterNameBtn.style.backgroundColor = '#4CAF50';
          enterNameBtn.style.cursor = 'default';
        }
        // Trigger custom event for same-tab updates
        window.dispatchEvent(new Event('storage'));
        return true;
      } else {
        localStorage.removeItem('postureSnitch_userName');
        window.dispatchEvent(new Event('storage'));
        return false;
      }
    }
    return false;
  }

  // Save name when Enter button is clicked
  if (enterNameBtn) {
    enterNameBtn.addEventListener('click', () => {
      saveUserName();
    });
  }

  // Save name when Enter key is pressed in input
  if (userNameInput) {
    userNameInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter' && !userNameInput.disabled) {
        e.preventDefault();
        saveUserName();
      }
    });
  }

  // Check if name already exists on load - if so, lock it
  const savedName = localStorage.getItem('postureSnitch_userName');
  if (savedName && userNameInput) {
    userNameInput.value = savedName;
    userNameInput.disabled = true;
    userNameInput.style.backgroundColor = '#2d2d2d';
    userNameInput.style.opacity = '0.7';
    userNameInput.style.cursor = 'not-allowed';
    if (enterNameBtn) {
      enterNameBtn.disabled = true;
      enterNameBtn.textContent = '✓ Confirmed';
      enterNameBtn.style.backgroundColor = '#4CAF50';
      enterNameBtn.style.cursor = 'default';
    }
  }

  // Toggle banner collapse/expand
  const toggleBanner = document.getElementById('toggleBanner');
  if (toggleBanner && welcomeBody) {
    toggleBanner.addEventListener('click', () => {
      const isCollapsed = welcomeBody.style.display === 'none';
      if (isCollapsed) {
        welcomeBody.style.display = 'block';
        toggleBanner.textContent = '▼';
        toggleBanner.title = 'Hide welcome';
      } else {
        welcomeBody.style.display = 'none';
        toggleBanner.textContent = '▶';
        toggleBanner.title = 'Show welcome';
      }
    });
  }

  // Test Alert button (from Main)
  const testAlertBtn = document.getElementById('testAlertBtn');
  if (testAlertBtn) {
    testAlertBtn.addEventListener('click', async () => {
      try {
        const userId = getUserId();
        const response = await fetch(`${API_BASE}/trigger`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ userId: userId || null })
        });

        if (response.ok) {
          showSuccess('Test alert triggered! Check your console and wait 15s for AI response.');
        } else {
          showError('Failed to trigger test alert. Make sure bot server is running.');
        }
      } catch (error) {
        console.error('Failed to trigger test alert:', error);
        showError('Failed to trigger test alert. Make sure bot server is running.');
      }
    });
  }

  // Dismiss banner (from Main)
  const dismissBanner = document.getElementById('dismissBanner');
  const gotItBtn = document.getElementById('gotItBtn');

  const hideBanner = () => {
    const welcomeBanner = document.getElementById('welcomeBanner');
    if (welcomeBanner) {
      welcomeBanner.style.display = 'none';
      localStorage.setItem('postureSnitch_onboardingComplete', 'true');
    }
  };

  if (dismissBanner) {
    dismissBanner.addEventListener('click', hideBanner);
  }

  if (gotItBtn) {
    gotItBtn.addEventListener('click', hideBanner);
  }
}


function initializeFriendsManagement() {
  // Generate user-specific bot link with userId parameter
  function getUserSpecificBotLink() {
    const userId = getUserId();
    // Encode userId for URL parameter
    const encodedUserId = encodeURIComponent(userId);
    return `https://t.me/backtrack_hacknroll_bot?start=${encodedUserId}`;
  }

  // Update bot link display with user-specific link
  const botLinkElement = document.getElementById('botLink');
  if (botLinkElement) {
    const userSpecificLink = getUserSpecificBotLink();
    botLinkElement.href = userSpecificLink;
    botLinkElement.textContent = `t.me/backtrack_hacknroll_bot?start=${getUserId().substring(0, 20)}...`;
    botLinkElement.title = userSpecificLink; // Full link on hover
  }

  // Bot link copy functionality - copy user-specific link
  const copyBotLinkBtn = document.getElementById('copyBotLink');
  if (copyBotLinkBtn) {
    copyBotLinkBtn.addEventListener('click', () => {
      const botLink = getUserSpecificBotLink();
      navigator.clipboard.writeText(botLink).then(() => {
        copyBotLinkBtn.textContent = '✓ Copied!';
        setTimeout(() => {
          copyBotLinkBtn.textContent = 'Copy Link';
        }, 2000);
      });
    });
  }

  // Load friends on page load
  loadFriends();
}

// Load and display friends
async function loadFriends() {
  try {
    const userId = getUserId();
    const response = await fetch(`${API_BASE}/friends?userId=${encodeURIComponent(userId)}`);
    const data = await response.json();

    renderFriendsList(data.friends || []);
  } catch (error) {
    console.error('Failed to load friends:', error);
    showError('Failed to load friends. Make sure the bot server is running.');
  }
}

// Load contacts who messaged the bot
async function loadContacts() {
  try {
    const response = await fetch(`${API_BASE}/contacts`);
    const data = await response.json();

    const dropdown = document.getElementById('contactsDropdown');
    if (dropdown) {
      // Clear existing options except first one
      dropdown.innerHTML = '<option value="">Select a contact...</option>';

      // Add contacts
      (data.contacts || []).forEach(contact => {
        const option = document.createElement('option');
        option.value = contact.chatId;
        option.textContent = `${contact.firstName}${contact.username ? ` (@${contact.username})` : ''} (${contact.chatId})`;
        dropdown.appendChild(option);
      });
    }
  } catch (error) {
    console.error('Failed to load contacts:', error);
  }
}

// Render friends list
function renderFriendsList(friends) {
  const friendsList = document.getElementById('friendsList');
  const noFriends = document.getElementById('noFriends');

  if (!friendsList) return;

  if (friends.length === 0) {
    friendsList.innerHTML = '<p id="noFriends" class="empty-state">No guardians added yet. Share your bot link above to add guardians!</p>';
    return;
  }

  noFriends?.remove();

  friendsList.innerHTML = friends.map(friend => `
    <div class="friend-item" data-chat-id="${friend.chatId}">
      <div class="friend-info">
        <div class="friend-name">
          ${escapeHtml(friend.name)}
          <span class="friend-status ${friend.enabled ? 'enabled' : 'disabled'}">
            ${friend.enabled ? 'Enabled' : 'Disabled'}
          </span>
        </div>
        <div class="friend-chatId">Chat ID: ${friend.chatId}</div>
      </div>
      <div class="friend-actions">
        <label class="toggle-switch">
          <input type="checkbox" ${friend.enabled ? 'checked' : ''} 
                 onchange="toggleFriend(${friend.chatId}, this.checked)" />
          <span class="toggle-slider"></span>
        </label>
        <button class="btn-delete" onclick="deleteFriend(${friend.chatId})">Delete</button>
      </div>
    </div>
  `).join('');
}

// Add friend
async function addFriend() {
  const dropdown = document.getElementById('contactsDropdown');
  const chatId = dropdown.value;

  if (!chatId) {
    showError('Please select a contact from the dropdown');
    return;
  }

  // Get name from selected option text
  const optionText = dropdown.options[dropdown.selectedIndex].textContent;
  const name = optionText.split(' (')[0]; // Extract name before the parentheses

  try {
    const userId = getUserId();
    const response = await fetch(`${API_BASE}/friends`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ userId, chatId: parseInt(chatId), name }),
    });

    const data = await response.json();

    if (response.ok) {
      // Clear form
      document.getElementById('contactsDropdown').value = '';

      // Reload friends list
      loadFriends();
      showSuccess('Guardian added successfully!');
    } else {
      showError(data.error || 'Failed to add friend');
    }
  } catch (error) {
    console.error('Failed to add friend:', error);
    showError('Failed to add friend. Make sure the bot server is running.');
  }
}

// Toggle friend enabled/disabled
window.toggleFriend = async function (chatId, enabled) {
  try {
    const userId = getUserId();
    const response = await fetch(`${API_BASE}/friends/${chatId}/toggle?userId=${encodeURIComponent(userId)}`, {
      method: 'PATCH',
    });

    const data = await response.json();

    if (response.ok) {
      loadFriends(); // Reload to update UI
    } else {
      showError(data.error || 'Failed to toggle friend');
      loadFriends(); // Reload to revert toggle
    }
  } catch (error) {
    console.error('Failed to toggle friend:', error);
    showError('Failed to toggle friend. Make sure the bot server is running.');
    loadFriends(); // Reload to revert toggle
  }
};

// Delete friend
window.deleteFriend = async function (chatId) {
  if (!confirm('Are you sure you want to remove this guardian?')) {
    return;
  }

  try {
    const userId = getUserId();
    const response = await fetch(`${API_BASE}/friends/${chatId}?userId=${encodeURIComponent(userId)}`, {
      method: 'DELETE',
    });

    const data = await response.json();

    if (response.ok) {
      loadFriends();
      showSuccess('Friend removed successfully!');
    } else {
      showError(data.error || 'Failed to delete friend');
    }
  } catch (error) {
    console.error('Failed to delete friend:', error);
    showError('Failed to delete friend. Make sure the bot server is running.');
  }
};

// Utility functions
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function showError(message) {
  // Simple error display - can be improved
  alert('Error: ' + message);
}

function showSuccess(message) {
  // Simple success display - can be improved
  console.log('Success: ' + message);
}

// Personality name mapping
const personalityNames = {
  'FRzaj7L4px15biN0RGSj': 'Malay Barber',
  'wJ5MX7uuKXZwFqGdWM4N': 'Indian Tech Support/Scammer',
  'ljEOxtzNoGEa58anWyea': 'Chinese Karen',
  'K8nDX2f6wjv6bCh5UeZi': 'Rude French Guy',
  'nw6EIXCsQ89uJMjytYb8': 'African Funny Guy',
  'gad8DmXGyu7hwftX9JqI': 'Failed Bangalore Startup Founder',
  'spZS54yMfsj80VHtUQFY': 'Australian Construction Worker',
  'yqZhXcy5spYR7Hhv17QY': 'Texan Cowboy'
};

// Update personality confirmation display
function updatePersonalityConfirmation(voiceId) {
  const activePersonalityName = document.getElementById('activePersonalityName');
  if (activePersonalityName) {
    const name = personalityNames[voiceId] || 'Unknown';
    activePersonalityName.textContent = name;
    console.log('✅ Updated personality confirmation display:', name);
  }
}

// Initialize personality selector
function initializePersonalitySelector() {
  const personalitySelector = document.getElementById('personalitySelector');
  if (!personalitySelector) {
    console.warn('⚠️ Personality selector not found in DOM');
    // Try again after a short delay in case DOM isn't ready
    setTimeout(() => {
      const retrySelector = document.getElementById('personalitySelector');
      if (retrySelector) {
        console.log('✅ Found personality selector on retry');
        initializePersonalitySelector();
      }
    }, 100);
    return;
  }

  console.log('✅ Personality selector found, initializing...');

  // Load saved personality from localStorage, default to first option
  const savedPersonality = localStorage.getItem('postureSnitch_selectedPersonality');
  if (savedPersonality && personalitySelector.querySelector(`option[value="${savedPersonality}"]`)) {
    personalitySelector.value = savedPersonality;
    console.log('🎭 Loaded saved personality from localStorage:', savedPersonality);
    updatePersonalityConfirmation(savedPersonality);
  } else {
    // Default to first personality (Malay Barber)
    const defaultValue = 'FRzaj7L4px15biN0RGSj';
    personalitySelector.value = defaultValue;
    localStorage.setItem('postureSnitch_selectedPersonality', defaultValue);
    console.log('🎭 Set default personality:', defaultValue);
    updatePersonalityConfirmation(defaultValue);
  }

  // Verify the value was set
  console.log('🎭 Current dropdown value:', personalitySelector.value);

  // Save personality when changed and update confirmation
  personalitySelector.addEventListener('change', (e) => {
    const selectedVoiceId = e.target.value;
    if (selectedVoiceId) {
      localStorage.setItem('postureSnitch_selectedPersonality', selectedVoiceId);
      console.log('🎭 Personality changed and saved to localStorage:', selectedVoiceId);

      // Update confirmation display
      updatePersonalityConfirmation(selectedVoiceId);

      // Verify it was saved
      const verify = localStorage.getItem('postureSnitch_selectedPersonality');
      console.log('🎭 Verified localStorage value:', verify);
    } else {
      console.warn('⚠️ No value selected in personality selector');
    }
  });

  // Also expose function to get current selection
  window.getSelectedPersonality = function () {
    const current = localStorage.getItem('postureSnitch_selectedPersonality') || 'FRzaj7L4px15biN0RGSj';
    console.log('🎭 getSelectedPersonality() called, returning:', current);
    return current;
  };

  // Expose function to set personality programmatically
  window.setSelectedPersonality = function (voiceId) {
    if (personalitySelector.querySelector(`option[value="${voiceId}"]`)) {
      personalitySelector.value = voiceId;
      localStorage.setItem('postureSnitch_selectedPersonality', voiceId);
      updatePersonalityConfirmation(voiceId);
      console.log('🎭 Set personality programmatically:', voiceId);
      return true;
    } else {
      console.warn('⚠️ Invalid voiceId:', voiceId);
      return false;
    }
  };
}

// Slouch Tracker with hourly line graph
let slouchChart = null;

function initializeSlouchTracker() {
  updateSlouchGraph();

  // Update graph every minute
  setInterval(updateSlouchGraph, 60000);
}

// Expose to global scope so main.js can call it
window.updateSlouchGraph = updateSlouchGraph;

function updateSlouchGraph() {
  try {
    // Get slouch data from localStorage
    const slouchesKey = 'postureSnitch_slouches';
    const slouchesJson = localStorage.getItem(slouchesKey);
    const slouches = slouchesJson ? JSON.parse(slouchesJson) : [];

    if (slouches.length === 0) {
      // Show empty state
      const canvas = document.getElementById('slouchChart');
      const stats = document.getElementById('slouchStats');
      if (canvas) {
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#aaa';
        ctx.font = '16px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('No slouch data yet. Start using the app to track your posture!', canvas.width / 2, canvas.height / 2);
      }
      if (stats) {
        stats.textContent = 'Total slouches: 0';
      }
      return;
    }

    // Aggregate slouches by hour
    const hourlyData = aggregateSlouchesByHour(slouches);

    // Get last 24 hours of data
    const now = new Date();
    const last24Hours = [];
    const labels = [];

    for (let i = 23; i >= 0; i--) {
      const hourDate = new Date(now);
      hourDate.setHours(hourDate.getHours() - i);
      hourDate.setMinutes(0);
      hourDate.setSeconds(0);
      hourDate.setMilliseconds(0);

      const hourKey = hourDate.getTime();
      const hourLabel = hourDate.toLocaleTimeString('en-US', { hour: 'numeric', hour12: true });
      labels.push(hourLabel);

      last24Hours.push(hourlyData[hourKey] || 0);
    }

    // Calculate stats
    const totalSlouches = slouches.length;
    const todaySlouches = slouches.filter(ts => {
      const slouchDate = new Date(ts);
      const today = new Date();
      return slouchDate.toDateString() === today.toDateString();
    }).length;
    const maxHour = Math.max(...last24Hours, 0);

    // Update stats display
    const stats = document.getElementById('slouchStats');
    if (stats) {
      stats.textContent = `Total: ${totalSlouches} | Today: ${todaySlouches} | Max per hour (last 24h): ${maxHour}`;
    }

    // Draw or update chart
    const canvas = document.getElementById('slouchChart');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');

    // Destroy existing chart if it exists
    if (slouchChart) {
      slouchChart.destroy();
    }

    // Create new chart with fixed size
    slouchChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [{
          label: 'Slouches per Hour',
          data: last24Hours,
          borderColor: '#4CAF50',
          backgroundColor: 'rgba(76, 175, 80, 0.1)',
          borderWidth: 2,
          fill: true,
          tension: 0.4,
          pointRadius: 4,
          pointHoverRadius: 6,
          pointBackgroundColor: '#4CAF50',
          pointBorderColor: '#fff',
          pointBorderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: true,
            labels: {
              color: '#ccc'
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            max: 10, // Fixed maximum to prevent vertical scaling
            ticks: {
              stepSize: 1,
              color: '#aaa'
            },
            grid: {
              color: '#333'
            }
          },
          x: {
            ticks: {
              color: '#aaa',
              maxRotation: 45,
              minRotation: 45
            },
            grid: {
              color: '#333'
            }
          }
        }
      }
    });

  } catch (error) {
    console.error('❌ Failed to update slouch graph:', error.message);
  }
}

function aggregateSlouchesByHour(slouches) {
  const hourlyData = {};

  slouches.forEach(timestamp => {
    const date = new Date(timestamp);
    // Round down to the hour
    const hourDate = new Date(date);
    hourDate.setMinutes(0);
    hourDate.setSeconds(0);
    hourDate.setMilliseconds(0);

    const hourKey = hourDate.getTime();
    hourlyData[hourKey] = (hourlyData[hourKey] || 0) + 1;
  });

  return hourlyData;
}

// Get selected personality voice ID
function getSelectedPersonality() {
  return localStorage.getItem('postureSnitch_selectedPersonality') || 'FRzaj7L4px15biN0RGSj';
}

