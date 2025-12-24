require('dotenv').config({ path: '../.env' });
const { google } = require('googleapis');

async function testConnection() {
    console.log('--- Google Calendar Service Account Connection Test ---');

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
        const jwtClient = new google.auth.JWT(
            SERVICE_ACCOUNT_EMAIL,
            null,
            PRIVATE_KEY.replace(/\\n/g, '\n'), // Handle newline characters if passed as single line
            ['https://www.googleapis.com/auth/calendar.events', 'https://www.googleapis.com/auth/calendar.readonly']
        );

        console.log('🔄 Authenticating...');
        await jwtClient.authorize();
        console.log('✅ Authentication successful!');

        // 3. Test Calendar Access (List Events)
        const calendar = google.calendar({ version: 'v3', auth: jwtClient });

        console.log('🔄 Fetching upcoming events...');
        const res = await calendar.events.list({
            calendarId: CALENDAR_ID,
            timeMin: new Date().toISOString(),
            maxResults: 5,
            singleEvents: true,
            orderBy: 'startTime',
        });

        const events = res.data.items;
        if (events && events.length) {
            console.log('✅ Successfully retrieved events:');
            events.map((event, i) => {
                const start = event.start.dateTime || event.start.date;
                console.log(`   ${i + 1}. ${event.summary} (${start})`);
            });
        } else {
            console.log('✅ Connection successful! No upcoming events found in this calendar.');
        }

        // 4. Test Availability Check (FreeBusy)
        console.log('🔄 Testing FreeBusy query for next 24 hours...');
        const now = new Date();
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);

        const freeBusyRes = await calendar.freebusy.query({
            resource: {
                timeMin: now.toISOString(),
                timeMax: tomorrow.toISOString(),
                items: [{ id: CALENDAR_ID }]
            }
        });

        if (freeBusyRes.data.calendars[CALENDAR_ID].errors) {
            console.error('❌ FreeBusy Check Error:', freeBusyRes.data.calendars[CALENDAR_ID].errors);
        } else {
            const busySlots = freeBusyRes.data.calendars[CALENDAR_ID].busy;
            console.log(`✅ FreeBusy Check successful. Found ${busySlots.length} busy slot(s) for the next 24h.`);
        }

    } catch (error) {
        console.error('❌ CONNECTION FAILED:');
        console.error(error.message);
        if (error.message.includes('Not Found')) {
            console.error('👉 Hint: Check if the Calendar ID is correct.');
        } else if (error.message.includes('Grant: Invalid JWT')) {
            console.error('👉 Hint: Check your Private Key and Service Account Email.');
        } else if (error.message.includes('403')) {
            console.error('👉 Hint: Make sure you have SHARED the calendar with the Service Account Email.');
        }
    }
}

testConnection();
