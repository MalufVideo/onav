/**
 * Google Calendar Service
 * Handles all Google Calendar operations for booking management
 */

const crypto = require('crypto');
const { JWT } = require('google-auth-library');
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

// Load Google Credentials (fallback for local)
let googleCreds = null;
try {
  googleCreds = require('../google-credentials.json');
} catch (e) {
  // Ignore, will use env variables
}

// Google Calendar Configuration
const CALENDAR_ID = process.env.GOOGLE_CALENDAR_ID || 'd0be053c3b4590597dbffe0b1b08fb68bfcce6d060901d2bfc1574fb7e515c1f@group.calendar.google.com';

// Calendar Event Prefixes
const CALENDAR_PREFIX_PRE_RESERVE = '🔄 PRÉ-RESERVA:';
const CALENDAR_PREFIX_CONFIRMED = '✅ CONFIRMADO:';

/**
 * Helper to get a Google Auth JWT client with robust key normalization
 */
async function getGoogleAuth(scopes) {
  const client_email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || (googleCreds && googleCreds.client_email);
  const private_key = process.env.GOOGLE_PRIVATE_KEY || (googleCreds && googleCreds.private_key);

  if (!client_email || !private_key) {
    throw new Error('Google Calendar credentials not configured. Email or Key missing.');
  }

  // Robust private key normalization - foolproof for Vercel dashboard pastes
  let base64Content = private_key;

  // 1. Try to extract content between BEGIN and END markers (case-insensitive)
  const markerMatch = private_key.match(/-----BEGIN[^-]*-----([A-Za-z0-9+/=\s\n\r]+)-----END[^-]*-----/i);
  if (markerMatch) {
    base64Content = markerMatch[1];
  }

  // 2. Remove ANY non-base64 characters (keep only A-Za-z0-9+/) - remove padding first
  base64Content = base64Content.replace(/[^A-Za-z0-9+/]/g, '');

  if (!base64Content || base64Content.length < 500) {
    throw new Error(`Invalid private key length: ${base64Content?.length || 0}. Check your GOOGLE_PRIVATE_KEY variable.`);
  }

  // 3. Fix base64 padding - must be divisible by 4
  const remainder = base64Content.length % 4;
  if (remainder === 1) {
    console.log(`[getGoogleAuth] Removing 1 extra character from base64 (length was ${base64Content.length})`);
    base64Content = base64Content.slice(0, -1);
  } else if (remainder === 2) {
    base64Content += '==';
  } else if (remainder === 3) {
    base64Content += '=';
  }

  console.log(`[getGoogleAuth] Final base64 length: ${base64Content.length} (divisible by 4: ${base64Content.length % 4 === 0})`);

  // 4. Reconstruct standard PEM with 64-character lines
  const lines = base64Content.match(/.{1,64}/g) || [];
  const normalizedKey = `-----BEGIN PRIVATE KEY-----\n${lines.join('\n')}\n-----END PRIVATE KEY-----\n`;

  // 5. Verify the key can be parsed by Node's crypto module before passing to JWT
  try {
    crypto.createPrivateKey({
      key: normalizedKey,
      format: 'pem'
    });
    console.log('[getGoogleAuth] Private key verified successfully by crypto module');
  } catch (cryptoError) {
    console.log('[getGoogleAuth] Standard PEM failed:', cryptoError.message);

    try {
      const keyBuffer = Buffer.from(base64Content, 'base64');
      console.log(`[getGoogleAuth] Key buffer length: ${keyBuffer.length} bytes`);

      if (keyBuffer[0] !== 0x30) {
        throw new Error(`Invalid key structure: first byte is 0x${keyBuffer[0].toString(16)}, expected 0x30 (SEQUENCE)`);
      }

      let expectedLength;
      if (keyBuffer[1] < 0x80) {
        expectedLength = keyBuffer[1] + 2;
      } else if (keyBuffer[1] === 0x82) {
        expectedLength = (keyBuffer[2] << 8) + keyBuffer[3] + 4;
      }
      console.log(`[getGoogleAuth] ASN.1 expected length: ${expectedLength}, actual: ${keyBuffer.length}`);

      if (keyBuffer.length !== expectedLength) {
        throw new Error(`Key length mismatch: ASN.1 header says ${expectedLength} bytes, but got ${keyBuffer.length} bytes. Key may be truncated or corrupted.`);
      }
    } catch (bufferError) {
      throw new Error(`Key validation failed: ${bufferError.message}. CleanedLen: ${base64Content.length}`);
    }

    throw new Error(`Key verification failed: ${cryptoError.message}. CleanedLen: ${base64Content.length}, Start: ${base64Content.substring(0, 20)}, End: ${base64Content.substring(base64Content.length - 20)}`);
  }

  const jwtClient = new JWT({
    email: client_email,
    key: normalizedKey,
    scopes: scopes,
  });

  try {
    const tokens = await jwtClient.authorize();
    return tokens;
  } catch (authError) {
    const diag = ` (Email: ${client_email.substring(0, 5)}... CleanedLen: ${base64Content.length} Start: ${base64Content.substring(0, 10)} End: ${base64Content.substring(base64Content.length - 10)})`;
    authError.message = `${authError.message}${diag}`;
    throw authError;
  }
}

/**
 * Create a pre-reserve calendar event (when a quote is submitted)
 * Multiple pre-reserves can exist for the same date
 */
async function createPreReserveEvent(proposal) {
  try {
    const tokens = await getGoogleAuth(['https://www.googleapis.com/auth/calendar.events']);
    const createUrl = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(CALENDAR_ID)}/events`;

    const clientName = proposal.client_name || 'Cliente';
    const projectName = proposal.project_name || 'Projeto';
    const startDate = new Date(proposal.shooting_dates_start);
    const endDate = proposal.shooting_dates_end ? new Date(proposal.shooting_dates_end) : new Date(startDate);

    // Add one day to end date for all-day event (Google Calendar quirk)
    endDate.setDate(endDate.getDate() + 1);

    const eventData = {
      summary: `${CALENDAR_PREFIX_PRE_RESERVE} ${clientName} - ${projectName}`,
      description: `Pré-reserva de estúdio\n\nCliente: ${clientName}\nProjeto: ${projectName}\nEmail: ${proposal.client_email || 'N/A'}\nTelefone: ${proposal.client_phone || 'N/A'}\n\n⚠️ Esta é apenas uma pré-reserva. O estúdio só será bloqueado após a aprovação do orçamento.`,
      start: { date: startDate.toISOString().split('T')[0] },
      end: { date: endDate.toISOString().split('T')[0] },
      colorId: '5', // Yellow for pre-reserve
      transparency: 'transparent' // Doesn't block the time
    };

    const response = await fetch(createUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${tokens.access_token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(eventData)
    });

    const data = await response.json();
    if (!response.ok) {
      console.error('Failed to create pre-reserve event:', data);
      throw new Error(data.error?.message || 'Failed to create pre-reserve event');
    }

    console.log(`[Calendar] Pre-reserve event created: ${data.id} for ${clientName} - ${projectName}`);
    return { success: true, eventId: data.id, htmlLink: data.htmlLink };
  } catch (error) {
    console.error('[Calendar] Error creating pre-reserve event:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Check if there's already a confirmed booking for any date in the range
 * Returns { hasConflict: boolean, conflictingEvents: array }
 */
async function checkConfirmedBookingConflict(startDate, endDate) {
  try {
    const tokens = await getGoogleAuth(['https://www.googleapis.com/auth/calendar.readonly']);

    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(endDate || startDate);
    end.setHours(23, 59, 59, 999);

    const listUrl = new URL(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(CALENDAR_ID)}/events`);
    listUrl.searchParams.set('timeMin', start.toISOString());
    listUrl.searchParams.set('timeMax', end.toISOString());
    listUrl.searchParams.set('singleEvents', 'true');
    listUrl.searchParams.set('orderBy', 'startTime');

    const response = await fetch(listUrl.toString(), {
      headers: {
        'Authorization': `Bearer ${tokens.access_token}`
      }
    });

    const data = await response.json();
    if (!response.ok) {
      console.error('Failed to check calendar events:', data);
      throw new Error(data.error?.message || 'Failed to check calendar');
    }

    console.log(`[Calendar] Found ${(data.items || []).length} events in date range`);
    (data.items || []).forEach(event => {
      console.log(`[Calendar] Event: "${event.summary}" starts: ${event.start?.date || event.start?.dateTime}`);
    });

    const confirmedEvents = (data.items || []).filter(event =>
      event.summary && event.summary.startsWith(CALENDAR_PREFIX_CONFIRMED)
    );

    console.log(`[Calendar] Found ${confirmedEvents.length} CONFIRMED bookings (prefix: "${CALENDAR_PREFIX_CONFIRMED}")`);

    return {
      hasConflict: confirmedEvents.length > 0,
      conflictingEvents: confirmedEvents.map(e => ({
        id: e.id,
        summary: e.summary,
        start: e.start?.date || e.start?.dateTime,
        end: e.end?.date || e.end?.dateTime
      }))
    };
  } catch (error) {
    console.error('[Calendar] Error checking booking conflicts:', error.message);
    return { hasConflict: false, error: error.message };
  }
}

/**
 * Create a confirmed booking calendar event (when a quote is approved)
 * This blocks the date - only one confirmed booking per date allowed
 */
async function createConfirmedBookingEvent(proposal) {
  try {
    const tokens = await getGoogleAuth(['https://www.googleapis.com/auth/calendar.events']);
    const createUrl = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(CALENDAR_ID)}/events`;

    const clientName = proposal.client_name || 'Cliente';
    const projectName = proposal.project_name || 'Projeto';
    const startDate = new Date(proposal.shooting_dates_start);
    const endDate = proposal.shooting_dates_end ? new Date(proposal.shooting_dates_end) : new Date(startDate);

    endDate.setDate(endDate.getDate() + 1);

    let totalPriceDisplay = 'N/A';
    console.log(`[createConfirmedBookingEvent] Raw total_price:`, proposal.total_price, `Type:`, typeof proposal.total_price);

    if (proposal.total_price) {
      const priceValue = proposal.total_price;

      if (typeof priceValue === 'string') {
        if (priceValue.includes('R$')) {
          totalPriceDisplay = priceValue;
        } else {
          const cleanedPrice = priceValue.replace(/[^\d.,]/g, '').replace(/\./g, '').replace(',', '.');
          const priceNum = parseFloat(cleanedPrice);
          if (!isNaN(priceNum) && priceNum > 0) {
            totalPriceDisplay = `R$ ${priceNum.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
          }
        }
      } else if (typeof priceValue === 'number' && !isNaN(priceValue) && priceValue > 0) {
        totalPriceDisplay = `R$ ${priceValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      }
    }

    if (totalPriceDisplay === 'N/A' && proposal.original_total_price) {
      const origPrice = parseFloat(proposal.original_total_price);
      if (!isNaN(origPrice) && origPrice > 0) {
        totalPriceDisplay = `R$ ${origPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      }
    }

    console.log(`[createConfirmedBookingEvent] Final totalPriceDisplay:`, totalPriceDisplay);

    const eventData = {
      summary: `${CALENDAR_PREFIX_CONFIRMED} ${clientName} - ${projectName}`,
      description: `Gravação confirmada!\n\nCliente: ${clientName}\nProjeto: ${projectName}\nEmail: ${proposal.client_email || 'N/A'}\nTelefone: ${proposal.client_phone || 'N/A'}\nValor: ${totalPriceDisplay}\n\n✅ Estúdio reservado e confirmado.`,
      start: { date: startDate.toISOString().split('T')[0] },
      end: { date: endDate.toISOString().split('T')[0] },
      colorId: '10', // Green for confirmed
      transparency: 'opaque' // Blocks the time
    };

    const response = await fetch(createUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${tokens.access_token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(eventData)
    });

    const data = await response.json();
    if (!response.ok) {
      console.error('Failed to create confirmed booking event:', data);
      throw new Error(data.error?.message || 'Failed to create confirmed booking event');
    }

    console.log(`[Calendar] Confirmed booking event created: ${data.id} for ${clientName} - ${projectName}`);
    return { success: true, eventId: data.id, htmlLink: data.htmlLink };
  } catch (error) {
    console.error('[Calendar] Error creating confirmed booking event:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Delete a calendar event
 */
async function deleteCalendarEvent(eventId) {
  try {
    if (!eventId) return { success: true };

    const tokens = await getGoogleAuth(['https://www.googleapis.com/auth/calendar.events']);
    const deleteUrl = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(CALENDAR_ID)}/events/${eventId}`;

    const response = await fetch(deleteUrl, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${tokens.access_token}`
      }
    });

    if (!response.ok && response.status !== 404) {
      const data = await response.json();
      throw new Error(data.error?.message || 'Failed to delete event');
    }

    console.log(`[Calendar] Event deleted: ${eventId}`);
    return { success: true };
  } catch (error) {
    console.error('[Calendar] Error deleting event:', error.message);
    return { success: false, error: error.message };
  }
}

module.exports = {
  getGoogleAuth,
  createPreReserveEvent,
  checkConfirmedBookingConflict,
  createConfirmedBookingEvent,
  deleteCalendarEvent,
  CALENDAR_PREFIX_PRE_RESERVE,
  CALENDAR_PREFIX_CONFIRMED
};
