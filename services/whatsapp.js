/**
 * WhatsApp Notification Service
 * Handles sending WhatsApp notifications via external API
 */

const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

// WhatsApp Configuration
const WHATSAPP_API_URL = process.env.WHATSAPP_API_URL || 'http://72.60.142.28:3000/send';
const WHATSAPP_NOTIFICATION_PHONE = process.env.WHATSAPP_NOTIFICATION_PHONE || '5519981454647';

/**
 * Send a WhatsApp notification message
 * @param {string} message - The message to send
 * @returns {Promise<boolean>} - True if sent successfully
 */
async function sendWhatsAppNotification(message) {
  try {
    console.log('📱 Sending WhatsApp notification...');
    const response = await fetch(WHATSAPP_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to: WHATSAPP_NOTIFICATION_PHONE, message })
    });
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`WhatsApp API error: ${response.status} - ${errorText}`);
    }
    console.log('✅ WhatsApp notification sent successfully');
    return true;
  } catch (error) {
    console.error('❌ WhatsApp notification failed:', error.message);
    return false;
  }
}

/**
 * Build pre-reserve notification message
 */
function buildPreReserveMessage(data) {
  return `🔄 *PRÉ-RESERVA CRIADA*\n\n📋 *Projeto:* ${data.project_name || 'N/A'}\n👤 *Cliente:* ${data.client_name || 'N/A'}\n📧 *Email:* ${data.client_email || 'N/A'}\n📞 *Telefone:* ${data.client_phone || 'N/A'}\n📅 *Data:* ${data.shooting_dates_start || 'N/A'}\n💰 *Valor:* ${data.total_price || 'N/A'}\n\n🔗 ID: ${data.id}`;
}

/**
 * Build confirmed booking notification message
 */
function buildConfirmedMessage(data) {
  return `✅ *CONFIRMADO*\n\n📋 *Projeto:* ${data.project_name || 'N/A'}\n👤 *Cliente:* ${data.client_name || 'N/A'}\n📧 *Email:* ${data.client_email || 'N/A'}\n📞 *Telefone:* ${data.client_phone || 'N/A'}\n📅 *Data:* ${data.shooting_dates_start || 'N/A'}\n💰 *Valor:* ${data.total_price || 'N/A'}\n\n🎉 Proposta aprovada pelo cliente!\n🔗 ID: ${data.id}`;
}

/**
 * Build date conflict notification message
 */
function buildDateConflictMessage(data) {
  return `⚠️ *DATA INDISPONÍVEL*\n\n📅 *Data Solicitada:* ${data.shooting_dates_start || 'N/A'}\n👤 *Cliente:* ${data.client_name || 'N/A'}\n📧 *Email:* ${data.client_email || 'N/A'}\n📞 *Telefone:* ${data.client_phone || 'N/A'}\n📋 *Projeto:* ${data.project_name || 'N/A'}\n\n❌ Cliente tentou reservar data já ocupada!\n🔗 ID: ${data.id}`;
}

module.exports = {
  sendWhatsAppNotification,
  buildPreReserveMessage,
  buildConfirmedMessage,
  buildDateConflictMessage
};
