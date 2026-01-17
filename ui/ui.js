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

  if (!onboardingComplete) {
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

  // Save user name when input changes
  const userNameInput = document.getElementById('userNameInput');
  if (userNameInput) {
    userNameInput.addEventListener('input', (e) => {
      const name = e.target.value.trim();
      if (name) {
        localStorage.setItem('postureSnitch_userName', name);
      } else {
        localStorage.removeItem('postureSnitch_userName');
      }
    });
  }

  // Test Alert button
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

  // Dismiss banner
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
  // Bot link copy functionality
  const copyBotLinkBtn = document.getElementById('copyBotLink');
  if (copyBotLinkBtn) {
    copyBotLinkBtn.addEventListener('click', () => {
      const botLink = 'https://t.me/backtrack_hacknroll_bot';
      navigator.clipboard.writeText(botLink).then(() => {
        copyBotLinkBtn.textContent = '✓ Copied!';
        setTimeout(() => {
          copyBotLinkBtn.textContent = 'Copy Link';
        }, 2000);
      });
    });
  }

  // Add friend button
  const addFriendBtn = document.getElementById('addFriendBtn');
  if (addFriendBtn) {
    addFriendBtn.addEventListener('click', addFriend);
  }

  // Load friends and contacts on page load
  loadFriends();
  loadContacts();
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
    friendsList.innerHTML = '<p id="noFriends" class="empty-state">No guardians added yet. Add a friend above!</p>';
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

