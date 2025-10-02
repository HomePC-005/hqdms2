module.exports = {
  apps: [{
    name: 'hqdms-backend',
    script: './index.js',
    cwd: '/home/user/hqdms2/server',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 3003
    }
  }]
}
