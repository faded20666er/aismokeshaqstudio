// AISmokeShaqStudio/middleware/userSettingsStore.js

// This example uses a simple in-memory store.
// Replace with Redis, MongoDB, Supabase, or your DB of choice later.

const userSettings = {}; 
// Structure:
// userSettings[userId] = { nsfwEnabled: true, ... }

export async function getUserSettings(userId) {
  if (!userSettings[userId]) {
    // Default settings
    userSettings[userId] = {
      nsfwEnabled: false,
    };
  }
  return userSettings[userId];
}

export async function updateUserSettings(userId, newSettings) {
  if (!userSettings[userId]) {
    userSettings[userId] = {};
  }

  userSettings[userId] = {
    ...userSettings[userId],
    ...newSettings,
  };

  return userSettings[userId];
}
