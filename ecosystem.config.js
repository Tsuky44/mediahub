module.exports = {
  apps: [
    {
      name: 'emby-next-app',
      script: 'node_modules/next/dist/bin/next',
      args: 'start -p 3000',
      cwd: './next-app',
      instances: 'max',
      exec_mode: 'cluster',
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
