require('dotenv').config({ path: '../.env' });
const { JWT } = require('google-auth-library');
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

async function testConnection() {
    console.log('--- Google Calendar Service Account Connection Test (Lightweight) ---');

    // 1. Load Credentials from JSON file
    const CALENDAR_ID = process.env.GOOGLE_CALENDAR_ID || 'd0be053c3b4590597dbffe0b1b08fb68bfcce6d060901d2bfc1574fb7e515c1f@group.calendar.google.com';
    let googleCreds = {};
    try {
        googleCreds = require('../google-credentials.json');
        console.log('✅ Loaded google-credentials.json');
    } catch (e) {
        console.error('❌ Could not load google-credentials.json');
        return;
    }

    const SERVICE_ACCOUNT_EMAIL = googleCreds.client_email;
    const PRIVATE_KEY = googleCreds.private_key;

    if (!CALENDAR_ID || !SERVICE_ACCOUNT_EMAIL || !PRIVATE_KEY) {
        console.error('❌ ERROR: Missing credentials.');
        return;
    }

    console.log(`- Calendar ID: ${CALENDAR_ID}`);
    console.log(`- Service Account: ${SERVICE_ACCOUNT_EMAIL}`);

    try {
        // 2. Initialize Auth
        console.log('🔄 Authenticating...');
        const jwtClient = new JWT({
            email: SERVICE_ACCOUNT_EMAIL,
            key: PRIVATE_KEY.replace(/\\n/g, '\n'),
            scopes: ['https://www.googleapis.com/auth/calendar.readonly'],
        });

        const tokens = await jwtClient.authorize();
        console.log('✅ Authenticated successfully.');

        // 3. Test API with direct fetch
        console.log('🔄 Querying FreeBusy (minimal check)...');
        const now = new Date();
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);

        const freeBusyUrl = 'https://www.googleapis.com/calendar/v3/freeBusy/query';
        const response = await fetch(freeBusyUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${tokens.access_token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                timeMin: now.toISOString(),
                timeMax: tomorrow.toISOString(),
                items: [{ id: CALENDAR_ID }]
            })
        });

        if (!response.ok) {
            const errText = await response.text();
            throw new Error(`API Error: ${response.status} - ${errText}`);
        }

        const data = await response.json();
        const busySlots = data.calendars[CALENDAR_ID].busy;
        console.log(`✅ FreeBusy Check successful. Found ${busySlots.length} busy slot(s) for the next 24h.`);
        console.log('\n🌟 SUCCESS: Integration is working correctly!');

    } catch (error) {
        console.error('\n❌ ERROR:');
        console.error(error.message);
        console.log('\nPotential fixes:');
        console.log('1. Ensure the Calendar ID is correct.');
        console.log('2. Ensure you shared the calendar with the service account email.');
        console.log('3. Check if your project has the Calendar API enabled.');
    }
}

testConnection();
