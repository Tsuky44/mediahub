module.exports = {
  apps: [
    {
      name: 'emby-next-app',
      script: 'node_modules/next/dist/bin/next',
      args: 'start -p 3008',
      cwd: './next-app',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        NODE_OPTIONS: '--openssl-legacy-provider',
      },
      env_production: {
        NODE_ENV: 'production',
        NODE_OPTIONS: '--openssl-legacy-provider',
      },
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
    },
  ],
};
