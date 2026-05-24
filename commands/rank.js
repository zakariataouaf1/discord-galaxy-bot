const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getUser, ensureUser, getLevelInfo } = require('../utils/points');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('rank')
    .setDescription('Check your rank or someone else\'s')
    .addUserOption(opt =>
      opt.setName('user').setDescription('User to check (leave empty for yourself)').setRequired(false)
    ),

  async execute(interaction) {
    const target = interaction.options.getUser('user') || interaction.user;
    await ensureUser(target.id, target.username);
    const user = await getUser(target.id);
    const lvl = getLevelInfo(user.points);
    const nextPoints = lvl.next ? lvl.next.min - user.points : 0;

    const embed = new EmbedBuilder()
      .setColor(0x5865F2)
      .setTitle(`${lvl.name} — ${target.username}`)
      .setThumbnail(target.displayAvatarURL())
      .addFields(
        { name: '⭐ Points', value: `${user.points}`, inline: true },
        { name: '🏅 Level', value: `${user.level}`, inline: true },
        { name: '🎙️ Voice Time', value: `${Math.floor(user.total_voice_minutes / 60)}h ${user.total_voice_minutes % 60}m`, inline: true },
        { name: '🔗 Invites', value: `${user.total_invites}`, inline: true },
        { name: lvl.next ? `Next: ${lvl.next.name}` : '✅ Max Rank', value: lvl.next ? `${nextPoints} points needed` : 'You\'re at the top!', inline: true },
      )
      .setFooter({ text: 'Keep grinding! 💪' })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  }
};
