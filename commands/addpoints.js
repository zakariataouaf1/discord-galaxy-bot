const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { addPoints } = require('../utils/points');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('addpoints')
    .setDescription('Add points to a user [Admin only]')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addUserOption(opt => opt.setName('user').setDescription('Target user').setRequired(true))
    .addIntegerOption(opt => opt.setName('amount').setDescription('Points to add').setRequired(true).setMinValue(1)),

  async execute(interaction) {
    const target = interaction.options.getUser('user');
    const amount = interaction.options.getInteger('amount');

    const { after, leveledUp } = await addPoints(target.id, target.username, amount);

    let msg = `✅ Added **${amount} points** to ${target.username}. They now have **${after.points} points**.`;
    if (leveledUp) msg += `\n🎉 They leveled up to **${leveledUp.name}**!`;

    await interaction.reply({ content: msg, ephemeral: true });
  }
};
