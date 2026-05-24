const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { pool } = require('../db');
const { ensureUser } = require('../utils/points');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('myinvite')
    .setDescription('Get your unique referral invite link'),

  async execute(interaction) {
    await ensureUser(interaction.user.id, interaction.user.username);

    // Check if user already has an invite
    const [existing] = await pool.query(
      `SELECT invite_code, uses FROM bot_invites WHERE discord_id = ?`,
      [interaction.user.id]
    );

    if (existing.length) {
      const embed = new EmbedBuilder()
        .setColor(0x57F287)
        .setTitle('🔗 Your Referral Link')
        .setDescription(`https://discord.gg/${existing[0].invite_code}`)
        .addFields({ name: '👥 Total Uses', value: `${existing[0].uses}` })
        .setFooter({ text: 'Share this link to earn points when people join!' });
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    // Create a new invite
    const guild = interaction.guild;
    const channel = guild.channels.cache.find(c => c.isTextBased() && c.permissionsFor(guild.members.me).has('CreateInstantInvite'));

    if (!channel) {
      return interaction.reply({ content: '❌ Could not create an invite. Contact an admin.', ephemeral: true });
    }

    const invite = await channel.createInvite({
      maxAge: 0,       // Never expires
      maxUses: 0,      // Unlimited uses
      unique: true,
      reason: `Referral invite for ${interaction.user.username}`
    });

    // Save to DB
    await pool.query(
      `INSERT INTO bot_invites (discord_id, invite_code) VALUES (?, ?)`,
      [interaction.user.id, invite.code]
    );

    const embed = new EmbedBuilder()
      .setColor(0x57F287)
      .setTitle('🔗 Your Referral Link')
      .setDescription(`https://discord.gg/${invite.code}`)
      .addFields({ name: '👥 Total Uses', value: '0' })
      .setFooter({ text: 'Share this link to earn points when people join!' });

    await interaction.reply({ embeds: [embed], ephemeral: true });
  }
};
