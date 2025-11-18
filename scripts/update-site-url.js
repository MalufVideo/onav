const axios = require('axios');
const jwt = require('jsonwebtoken');
require('dotenv').config();

// Parse the Ghost Admin API key
const [id, secret] = process.env.GHOST_ADMIN_KEY.split(':');

// Create JWT token for authentication
function createToken() {
    const token = jwt.sign(
        {},
        Buffer.from(secret, 'hex'),
        {
            keyid: id,
            algorithm: 'HS256',
            expiresIn: '5m',
            audience: '/admin/'
        }
    );
    return token;
}

async function updateSiteUrl() {
    try {
        console.log('🔧 Attempting to update Ghost site URL...\n');

        const baseUrl = 'https://insights.onav.com.br';
        const correctUrl = 'https://insights.onav.com.br';

        // Note: The site URL is typically NOT editable via API for security reasons
        // It must be changed in the Ghost configuration file

        console.log('⚠️  IMPORTANT: Site URL cannot be changed via API\n');
        console.log('The Ghost site URL is configured at the server/installation level.');
        console.log('You need to update it where Ghost is installed.\n');

        console.log('📋 Current situation:');
        console.log(`   Wrong URL: http://ghost-pkocccco88s0wcssk048ks8g.109.123.248.87.sslip.io/`);
        console.log(`   Correct URL: ${correctUrl}\n`);

        console.log('🔍 How to find where Ghost is installed:\n');
        console.log('1. Check your hosting provider dashboard');
        console.log('2. If using Docker, check docker-compose.yml');
        console.log('3. If using Ghost CLI, the config is in Ghost installation folder');
        console.log('4. Common locations:');
        console.log('   - /var/www/ghost/config.production.json');
        console.log('   - /opt/ghost/config.production.json');
        console.log('   - ~/ghost/config.production.json\n');

        console.log('🛠️  Quick fixes by hosting type:\n');

        console.log('Docker/Docker Compose:');
        console.log('   1. Edit docker-compose.yml');
        console.log('   2. Set environment: url=https://insights.onav.com.br');
        console.log('   3. Run: docker-compose restart\n');

        console.log('Ghost CLI Installation:');
        console.log('   1. cd /path/to/ghost');
        console.log('   2. ghost config url https://insights.onav.com.br');
        console.log('   3. ghost restart\n');

        console.log('Manual Configuration:');
        console.log('   1. Edit config.production.json');
        console.log('   2. Change "url": "https://insights.onav.com.br"');
        console.log('   3. Restart Ghost service\n');

        console.log('📞 If you need help:');
        console.log('   - Tell me: How is Ghost installed? (Docker/VPS/Hosting provider)');
        console.log('   - Do you have SSH access to the server?');
        console.log('   - What hosting service are you using?\n');

    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

updateSiteUrl();
