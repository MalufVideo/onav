/**
 * Services Index
 * Central export point for all services
 */

const database = require('./database');
const calendar = require('./calendar');
const whatsapp = require('./whatsapp');

module.exports = {
  // Database
  supabase: database.supabase,
  supabaseAdmin: database.supabaseAdmin,
  supabaseUrl: database.supabaseUrl,
  supabaseAnonKey: database.supabaseAnonKey,
  supabaseServiceKey: database.supabaseServiceKey,
  safeNumber: database.safeNumber,
  safeInteger: database.safeInteger,
  getUserFromToken: database.getUserFromToken,
  
  // Calendar
  getGoogleAuth: calendar.getGoogleAuth,
  createPreReserveEvent: calendar.createPreReserveEvent,
  checkConfirmedBookingConflict: calendar.checkConfirmedBookingConflict,
  createConfirmedBookingEvent: calendar.createConfirmedBookingEvent,
  deleteCalendarEvent: calendar.deleteCalendarEvent,
  CALENDAR_PREFIX_PRE_RESERVE: calendar.CALENDAR_PREFIX_PRE_RESERVE,
  CALENDAR_PREFIX_CONFIRMED: calendar.CALENDAR_PREFIX_CONFIRMED,
  
  // WhatsApp
  sendWhatsAppNotification: whatsapp.sendWhatsAppNotification,
  buildPreReserveMessage: whatsapp.buildPreReserveMessage,
  buildConfirmedMessage: whatsapp.buildConfirmedMessage,
  buildDateConflictMessage: whatsapp.buildDateConflictMessage
};
