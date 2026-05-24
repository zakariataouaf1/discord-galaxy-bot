const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { removePoints, getUser, ensureUser } = require('../utils/points');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('removepoints')
    .setDescription('Remove points from a user [Admin only]')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addUserOption(opt => opt.setName('user').setDescription('Target user').setRequired(true))
    .addIntegerOption(opt => opt.setName('amount').setDescription('Points to remove').setRequired(true).setMinValue(1)),

  async execute(interaction) {
    const target = interaction.options.getUser('user');
    const amount = interaction.options.getInteger('amount');

    await ensureUser(target.id, target.username);
    await removePoints(target.id, amount);
    const after = await getUser(target.id);

    await interaction.reply({
      content: `✅ Removed **${amount} points** from ${target.username}. They now have **${after.points} points**.`,
      ephemeral: true
    });
  }
};
