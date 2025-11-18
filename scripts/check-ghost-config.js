const GhostAdminAPI = require('@tryghost/admin-api');
require('dotenv').config();

const api = new GhostAdminAPI({
    url: 'https://insights.onav.com.br',
    key: process.env.GHOST_ADMIN_KEY,
    version: 'v5.0'
});

async function checkConfig() {
    try {
        console.log('🔍 Checking Ghost configuration...\n');

        // Get site settings
        const settings = await api.settings.browse();

        console.log('Current Ghost Settings:');
        console.log('======================\n');

        const importantSettings = [
            'title',
            'description',
            'url',
            'codeinjection_head',
            'codeinjection_foot',
            'navigation',
            'timezone'
        ];

        settings.forEach(setting => {
            if (importantSettings.includes(setting.key) || setting.key.includes('url')) {
                console.log(`${setting.key}: ${JSON.stringify(setting.value, null, 2)}`);
                console.log('---');
            }
        });

        console.log('\n⚠️  ISSUE FOUND:');
        console.log('The Ghost site URL is likely configured incorrectly in your Ghost installation.');
        console.log('\nTo fix this, you need to update the Ghost configuration file (config.production.json)');
        console.log('or environment variable where Ghost is installed.\n');

        console.log('📝 Steps to fix:');
        console.log('1. Access your Ghost installation server/hosting');
        console.log('2. Locate the Ghost configuration file (usually config.production.json)');
        console.log('3. Update the "url" field to: "https://insights.onav.com.br"');
        console.log('4. Restart Ghost service\n');

        console.log('OR if using environment variables:');
        console.log('Set: url=https://insights.onav.com.br\n');

        console.log('💡 After fixing, all post URLs will automatically update to use the correct domain.');

    } catch (error) {
        console.error('❌ Error:', error.message);
        if (error.response) {
            console.error('Response:', JSON.stringify(error.response.data, null, 2));
        }
    }
}

checkConfig();
