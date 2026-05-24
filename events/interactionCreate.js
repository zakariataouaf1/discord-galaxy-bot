const fs = require('fs');
const path = require('path');

const commands = new Map();

// Load all commands
const commandFiles = fs.readdirSync(path.join(__dirname, '../commands')).filter(f => f.endsWith('.js'));
for (const file of commandFiles) {
  const cmd = require(`../commands/${file}`);
  commands.set(cmd.data.name, cmd);
}

async function handleInteraction(interaction) {
  if (!interaction.isChatInputCommand()) return;

  const command = commands.get(interaction.commandName);
  if (!command) return;

  try {
    await command.execute(interaction);
  } catch (err) {
    console.error(`[CMD] Error in /${interaction.commandName}:`, err);
    const msg = { content: '❌ Something went wrong. Try again.', ephemeral: true };
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp(msg);
    } else {
      await interaction.reply(msg);
    }
  }
}

module.exports = { handleInteraction };
