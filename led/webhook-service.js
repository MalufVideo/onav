// Webhook service for sending proposal data to N8N/CRM integration

/**
 * Sends proposal data to N8N webhook for CRM integration
 * @param {Object} proposalData - The saved proposal data from Supabase
 */
async function sendProposalWebhook(proposalData) {
  try {
    // Prepare webhook payload with all required information
    const webhookPayload = {
      // Client Information
      client_name: proposalData.client_name,
      client_email: proposalData.client_email, 
      client_phone: proposalData.client_phone,
      client_company: proposalData.client_company,
      
      // Sales Rep Information
      sales_rep_name: proposalData.sales_rep_name,
      sales_rep_id: proposalData.sales_rep_id,
      
      // Project Information
      project_name: proposalData.project_name,
      
      // Shooting Dates
      shooting_dates_start: proposalData.shooting_dates_start,
      shooting_dates_end: proposalData.shooting_dates_end,
      days_count: proposalData.days_count,
      
      // Quote/Pricing Information
      total_price: proposalData.total_price,
      daily_rate: proposalData.daily_rate,
      selected_pod_type: proposalData.selected_pod_type,
      selected_services: proposalData.selected_services,
      
      // LED Configuration Details  
      led_principal_width: proposalData.led_principal_width,
      led_principal_height: proposalData.led_principal_height,
      led_principal_modules: proposalData.led_principal_modules,
      led_principal_resolution: proposalData.led_principal_resolution,
      
      // LED Teto Configuration (if available)
      led_teto_width: proposalData.led_teto_width,
      led_teto_height: proposalData.led_teto_height,
      led_teto_modules: proposalData.led_teto_modules,
      led_teto_resolution: proposalData.led_teto_resolution,
      led_teto_pixels_width: proposalData.led_teto_pixels_width,
      led_teto_pixels_height: proposalData.led_teto_pixels_height,
      led_teto_total_pixels: proposalData.led_teto_total_pixels,
      
      // Additional LED Principal data
      led_principal_pixels_width: proposalData.led_principal_pixels_width,
      led_principal_pixels_height: proposalData.led_principal_pixels_height,
      led_principal_total_pixels: proposalData.led_principal_total_pixels,
      led_principal_curvature: proposalData.led_principal_curvature,
      
      // Power and weight data
      principal_power_max: proposalData.principal_power_max,
      principal_power_avg: proposalData.principal_power_avg,
      principal_weight: proposalData.principal_weight,
      teto_power_max: proposalData.teto_power_max,
      teto_power_avg: proposalData.teto_power_avg,
      teto_weight: proposalData.teto_weight,
      
      // System Information
      proposal_id: proposalData.id,
      created_at: proposalData.created_at,
      status: proposalData.status,
      
      // Additional context
      source: 'onav_led_calculator',
      timestamp: new Date().toISOString()
    };
    
    console.log('Sending proposal webhook to N8N:', webhookPayload);
    
    // Send to N8N webhook using GET with query parameters
    const queryParams = new URLSearchParams();
    Object.keys(webhookPayload).forEach(key => {
      if (webhookPayload[key] !== null && webhookPayload[key] !== undefined) {
        // Convert arrays to string format for URL params
        const value = Array.isArray(webhookPayload[key]) 
          ? JSON.stringify(webhookPayload[key]) 
          : String(webhookPayload[key]);
        queryParams.append(key, value);
      }
    });
    
    const webhookUrl = `https://n8n.avauto.fun/webhook-test/061d8866-fa53-435a-9a5f-ceafb3e2e639?${queryParams.toString()}`;
    
    console.log('Webhook URL being called:', webhookUrl);
    console.log('Query parameters count:', queryParams.toString().split('&').length);
    
    const response = await fetch(webhookUrl, {
      method: 'GET'
    });
    
    if (!response.ok) {
      throw new Error(`Webhook failed: ${response.status} ${response.statusText}`);
    }
    
    console.log('Webhook sent successfully to N8N');
    
  } catch (error) {
    console.error('Error sending webhook to N8N:', error);
    throw error; // Re-throw so caller can handle
  }
}

/**
 * Sends email notification for new proposals using Supabase Edge Function
 * @param {Object} proposalData - The saved proposal data from Supabase
 * @param {string} createdByUserId - ID of the user who created the proposal
 * @param {string} currentUserRole - Role of the user who created the proposal
 */
async function sendProposalEmailNotification(proposalData, createdByUserId, currentUserRole) {
  try {
    console.log('Sending proposal email notification via Supabase Edge Function');
    
    // Get Supabase client with proper auth
    const supabase = window.auth?.getSupabaseClient();
    if (!supabase) {
      throw new Error('Supabase client not available');
    }
    
    // Get current session for authorization
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      throw new Error('No active session for email notification');
    }
    
    // Call the Supabase Edge Function
    const { data, error } = await supabase.functions.invoke('send-quote-notification', {
      body: {
        proposalId: proposalData.id,
        createdByUserId: createdByUserId,
        currentUserRole: currentUserRole
      },
      headers: {
        Authorization: `Bearer ${session.access_token}`
      }
    });
    
    if (error) {
      throw error;
    }
    
    console.log('Email notification sent successfully:', data);
    
  } catch (error) {
    console.error('Error sending email notification:', error);
    throw error; // Re-throw so caller can handle
  }
}

/**
 * Test function to send email notification (for debugging)
 * @param {string} proposalId - ID of an existing proposal to test with
 */
async function testEmailNotification(proposalId) {
  try {
    console.log('Testing email notification for proposal:', proposalId);
    
    const supabase = window.auth?.getSupabaseClient();
    if (!supabase) {
      throw new Error('Supabase client not available');
    }
    
    // Get current user info
    const currentUser = window.auth.getCurrentUser();
    const userProfile = window.auth.getUserProfile();
    
    if (!currentUser) {
      throw new Error('No current user for test');
    }
    
    console.log('Testing with user:', currentUser.id, 'role:', userProfile?.role);
    
    // Get current session for authorization
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      throw new Error('No active session for email notification test');
    }
    
    // Call the Supabase Edge Function directly for testing
    const { data, error } = await supabase.functions.invoke('send-quote-notification', {
      body: {
        proposalId: proposalId,
        createdByUserId: currentUser.id,
        currentUserRole: userProfile?.role || 'end_user'
      },
      headers: {
        Authorization: `Bearer ${session.access_token}`
      }
    });
    
    if (error) {
      throw error;
    }
    
    console.log('Test email notification sent successfully:', data);
    alert(`Email sent successfully to: ${data.recipient} (${data.recipientType})`);
    
  } catch (error) {
    console.error('Error testing email notification:', error);
    alert(`Email test failed: ${error.message}`);
  }
}

// Export to global scope
window.webhookService = {
  sendProposalWebhook,
  sendProposalEmailNotification,
  testEmailNotification
};