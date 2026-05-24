module.exports = {
  apps: [
    {
      name: 'discord-bot',
      script: 'index.js',
      cwd: '/var/www/discord-bot',
      watch: false,
      restart_delay: 5000,
      max_restarts: 10,
      env: {
        NODE_ENV: 'production',
      },
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      error_file: '/var/www/discord-bot/logs/error.log',
      out_file: '/var/www/discord-bot/logs/out.log',
    },
  ],
};
