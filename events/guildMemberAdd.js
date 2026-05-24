const { addPoints, ensureUser } = require('../utils/points');
const { pool } = require('../db');

const REFERRAL_POINTS = 20; // Points for inviting someone

// Cache of invite uses { code: uses }
let cachedInvites = new Map();

async function cacheInvites(guild) {
  const invites = await guild.invites.fetch();
  cachedInvites = new Map(invites.map(inv => [inv.code, inv.uses]));
}

async function handleGuildMemberAdd(member, guild) {
  try {
    if (member.user.bot) return;

    const newInvites = await guild.invites.fetch();
    let usedCode = null;

    // Find which invite's use count went up
    for (const [code, invite] of newInvites) {
      const oldUses = cachedInvites.get(code) || 0;
      if (invite.uses > oldUses) {
        usedCode = code;
        break;
      }
    }

    // Update cache
    cachedInvites = new Map(newInvites.map(inv => [inv.code, inv.uses]));

    if (!usedCode) return;

    // Check if this invite belongs to a tracked user
    const [rows] = await pool.query(
      `SELECT discord_id FROM bot_invites WHERE invite_code = ?`,
      [usedCode]
    );

    if (!rows.length) return;

    const referrerId = rows[0].discord_id;

    // Update invite uses count
    await pool.query(
      `UPDATE bot_invites SET uses = uses + 1 WHERE invite_code = ?`,
      [usedCode]
    );

    // Update total invites count
    await pool.query(
      `UPDATE bot_points SET total_invites = total_invites + 1 WHERE discord_id = ?`,
      [referrerId]
    );

    // Give referrer points
    const referrer = await guild.members.fetch(referrerId).catch(() => null);
    const referrerName = referrer?.user?.username || 'Unknown';

    const { after, leveledUp } = await addPoints(referrerId, referrerName, REFERRAL_POINTS);
    console.log(`[INVITE] ${referrerName} referred ${member.user.username} → +${REFERRAL_POINTS}pts`);

    // Notify referrer via DM
    if (referrer) {
      try {
        await referrer.send(
          `🎉 **${member.user.username}** just joined using your invite link!\n` +
          `You earned **+${REFERRAL_POINTS} points**! You now have **${after.points} points** total. 🔥`
        );
      } catch (_) {} // DMs might be closed

      // Level up notification
      if (leveledUp) {
        try {
          await referrer.send(
            `🚀 **Level Up!** You just reached **${leveledUp.name}**! Keep going! 💪`
          );
        } catch (_) {}
      }
    }

    // Ensure new member exists in points table
    await ensureUser(member.user.id, member.user.username);

  } catch (err) {
    console.error('[INVITE] Error:', err);
  }
}

module.exports = { handleGuildMemberAdd, cacheInvites };
