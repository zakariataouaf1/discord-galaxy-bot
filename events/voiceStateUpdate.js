const { addPoints } = require('../utils/points');
const { pool } = require('../db');

// In-memory tracker: { discord_id: { joinedAt, channelId, interval } }
const voiceTrackers = new Map();

const POINTS_PER_HOUR = 10;
const MIN_USERS_IN_CHANNEL = 4;
const CHECK_INTERVAL_MS = 60 * 1000; // check every 1 minute

async function handleVoiceStateUpdate(oldState, newState, client) {
  const userId = newState.id || oldState.id;
  const member = newState.member || oldState.member;
  if (!member || member.user.bot) return;

  const username = member.user.username;

  // User joined a voice channel
  if (!oldState.channelId && newState.channelId) {
    startTracking(userId, username, newState.channelId, client);
  }

  // User switched channels
  else if (oldState.channelId && newState.channelId && oldState.channelId !== newState.channelId) {
    stopTracking(userId);
    startTracking(userId, username, newState.channelId, client);
  }

  // User left voice
  else if (oldState.channelId && !newState.channelId) {
    stopTracking(userId);
  }
}

function startTracking(userId, username, channelId, client) {
  if (voiceTrackers.has(userId)) stopTracking(userId);

  let minutesAccumulated = 0;

  const interval = setInterval(async () => {
    try {
      // Fetch the channel to count real members
      const channel = await client.channels.fetch(channelId).catch(() => null);
      if (!channel) return stopTracking(userId);

      const humanMembers = channel.members.filter(m => !m.user.bot).size;

      if (humanMembers >= MIN_USERS_IN_CHANNEL) {
        minutesAccumulated++;

        // Every 60 minutes → award points
        if (minutesAccumulated >= 60) {
          minutesAccumulated = 0;
          const { after, leveledUp } = await addPoints(userId, username, POINTS_PER_HOUR);

          // Update total voice minutes
          await pool.query(
            `UPDATE bot_points SET total_voice_minutes = total_voice_minutes + 60 WHERE discord_id = ?`,
            [userId]
          );

          console.log(`[VOICE] +${POINTS_PER_HOUR}pts → ${username} (${after.points} total)`);

          // Level up notification
          if (leveledUp) {
            try {
              const member = channel.members.get(userId);
              if (member) {
                await member.send(
                  `🎉 **Level Up!** You just reached **${leveledUp.name}** in the server!\n` +
                  `Keep it up, you're now at **${after.points} points**! 💪`
                );
              }
            } catch (_) {} // DMs might be closed
          }
        }
      }
    } catch (err) {
      console.error('[VOICE] Interval error:', err);
    }
  }, CHECK_INTERVAL_MS);

  voiceTrackers.set(userId, { channelId, interval, minutesAccumulated: 0 });
  console.log(`[VOICE] Tracking started → ${username}`);
}

function stopTracking(userId) {
  const tracker = voiceTrackers.get(userId);
  if (tracker) {
    clearInterval(tracker.interval);
    voiceTrackers.delete(userId);
    console.log(`[VOICE] Tracking stopped → ${userId}`);
  }
}

module.exports = { handleVoiceStateUpdate };
