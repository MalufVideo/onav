require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const { createClient } = require('@supabase/supabase-js'); // Import Supabase client
const cors = require('cors'); // Import CORS middleware
const nodemailer = require('nodemailer');

// ... (rest of the code remains the same)

// --- Email API Route ---

// Import Resend
const { Resend } = require('resend');
const resendApiKey = process.env.RESEND_API_KEY;
const resend = resendApiKey ? new Resend(resendApiKey) : null;

// SMTP fallback configuration
const smtpHost = process.env.SMTP_HOST;
const smtpPort = process.env.SMTP_PORT;
const smtpSecure = (process.env.SMTP_SECURE || 'false').toString().toLowerCase() === 'true';
const smtpUser = process.env.SMTP_USER;
const smtpPass = process.env.SMTP_PASS;
let smtpTransporter = null;

if (smtpHost && smtpPort && smtpUser && smtpPass) {
  smtpTransporter = nodemailer.createTransport({
    host: smtpHost,
    port: Number(smtpPort),
    secure: smtpSecure,
    auth: {
      user: smtpUser,
      pass: smtpPass
    }
  });
}

const senderEmail = process.env.SENDER_EMAIL_ADDRESS || 'contato@onav.com.br';
const contactRecipient = process.env.CONTACT_FORM_RECIPIENT || 'nelsonhdvideo@gmail.com';

async function sendContactEmail({ subject, html }) {
  if (resend) {
    try {
      const { data, error } = await resend.emails.send({
        from: `On+Av Contato <${senderEmail}>`,
        to: [contactRecipient],
        subject,
        html
      });

      if (!error) {
        return { provider: 'resend', data };
      }

      console.error('Resend API Error:', error);
    } catch (resendError) {
      console.error('Resend client exception:', resendError);
    }
  }

  if (smtpTransporter) {
    try {
      const info = await smtpTransporter.sendMail({
        from: `On+Av Contato <${senderEmail}>`,
        to: contactRecipient,
        subject,
        html
      });
      return { provider: 'smtp', data: info };
    } catch (smtpError) {
      console.error('SMTP Error:', smtpError);
      throw new Error('Falha ao enviar o email via SMTP. Verifique as credenciais configuradas.');
    }
  }

  throw new Error('Nenhum provedor de email configurado. Adicione RESEND_API_KEY ou credenciais SMTP.');
}

// Handle contact form submissions
app.post('/api/send-email', async (req, res) => {
  try {
    const { name, email, subject, message, phone, company, project, 'equipment-interest': equipmentInterest } = req.body;

    // Basic validation - check for either message or project field
    if (!name || !email || (!message && !project)) {
      return res.status(400).json({ 
        error: 'Campos obrigatórios: nome, email e mensagem',
        message: 'Por favor, preencha todos os campos obrigatórios.' 
      });
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ 
        error: 'Email inválido',
        message: 'Por favor, insira um endereço de email válido.' 
      });
    }

    // Prepare email content
    const emailContent = message || project || '';
    const emailSubject = subject || `On+Av Site: Nova Mensagem de Contato de ${name}`;
    
    const emailHtml = `
        <p>Você recebeu uma nova mensagem do formulário de contato do site On+Av:</p>
        <hr>
        <p><strong>Nome:</strong> ${name}</p>
        <p><strong>Email:</strong> ${email}</p>
        ${phone ? `<p><strong>Telefone:</strong> ${phone}</p>` : ''}
        ${company ? `<p><strong>Empresa:</strong> ${company}</p>` : ''}
        <p><strong>Mensagem:</strong></p>
        <p>${emailContent.replace(/\n/g, '<br>')}</p>
        ${equipmentInterest ? `<p><strong>Equipamentos de interesse:</strong> ${equipmentInterest}</p>` : ''}
        <hr>
        <p><em>Enviado via formulário do site em ${new Date().toLocaleString('pt-BR')}.</em></p>
      `;

    const sendResult = await sendContactEmail({ subject: emailSubject, html: emailHtml });

    console.log(`Email sent successfully via ${sendResult.provider}:`, sendResult.data);
    
    res.json({ 
      success: true, 
      message: 'Mensagem enviada com sucesso! Entraremos em contato em breve.' 
    });
{{ ... }
    
  } catch (error) {
    console.error('Error handling contact form:', error.message);
    res.status(500).json({ 
      error: 'Erro interno do servidor',
      message: 'Ocorreu um erro ao processar sua mensagem. Tente novamente mais tarde.',
      details: error.message 
    });
  }
});

// --- End Email API Route ---

// --- Public Quote API Routes ---

// Serve public quote page
app.get('/quote/:slug', (req, res) => {
  res.sendFile(path.join(__dirname, 'quote.html'));
});

// Serve thank you page
app.get('/obrigado', (req, res) => {
  res.sendFile(path.join(__dirname, 'obrigado.html'));
});

// Serve alternative date selection page
app.get('/escolher-data', (req, res) => {
  res.sendFile(path.join(__dirname, 'escolher-data.html'));
});

// Serve test webhook page
app.get('/test-webhook', (req, res) => {
  res.sendFile(path.join(__dirname, 'test-webhook-local.html'));
});

// Debug endpoint to test slug parsing
app.get('/api/debug/slug/:slug', async (req, res) => {
  const { slug } = req.params;
  const isTemporary = slug.startsWith('quote-');
  const id = isTemporary ? slug.replace('quote-', '') : null;
  
  res.json({
    originalSlug: slug,
    isTemporary,
    extractedId: id,
    lookupMethod: isTemporary ? 'ID-based' : 'slug-based'
  });
});

// Get public quote data by slug
app.get('/api/quotes/public/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    
    if (!slug) {
      return res.status(400).json({ error: 'Quote slug is required' });
    }

    // Get quote by slug or ID (for temporary slugs)
    let quote = null;
    let error = null;
    
    console.log('Looking up quote with slug:', slug);
    
    // Check if this is a temporary slug format (quote-{id})
    if (slug.startsWith('quote-')) {
      const id = slug.replace('quote-', '');
      console.log('Detected temporary slug format, looking up by ID:', id);
      
      // Try ID-based lookup for temporary slugs
      const { data, error: idError } = await supabaseAdmin
        .from('proposals')
        .select('*')
        .eq('id', id)
        .single();
      
      quote = data;
      error = idError;
    } else {
      // Try regular slug-based lookup
      console.log('Using regular slug lookup');
      const { data, error: slugError } = await supabaseAdmin
        .from('proposals')
        .select('*')
        .eq('quote_url_slug', slug)
        .single();
      
      quote = data;
      error = slugError;
    }

    if (error) {
      console.error('Error fetching quote:', error);
      return res.status(404).json({ error: 'Quote not found' });
    }

    if (!quote) {
      console.log('No quote found for slug:', slug);
      return res.status(404).json({ error: 'Quote not found' });
    }
    
    console.log('Found quote:', quote.id, quote.project_name);

    // Parse services data - it can be stored in multiple places
    let parsedServices = [];
    
    // First, try to parse selected_services column
    if (quote.selected_services) {
      try {
        if (typeof quote.selected_services === 'string') {
          parsedServices = JSON.parse(quote.selected_services);
        } else if (Array.isArray(quote.selected_services)) {
          parsedServices = quote.selected_services;
        }
      } catch (e) {
        console.error('Error parsing selected_services:', e);
      }
    }
    
    // If no services found, try discount_description field (for dashboard-created quotes)
    if (parsedServices.length === 0 && quote.discount_description) {
      try {
        const dashboardData = JSON.parse(quote.discount_description);
        if (dashboardData.services && Array.isArray(dashboardData.services)) {
          parsedServices = dashboardData.services;
        }
      } catch (e) {
        console.error('Error parsing services from discount_description:', e);
      }
    }

    // Remove sensitive fields before sending to client
    const publicQuote = {
      id: quote.id,
      project_name: quote.project_name,
      client_name: quote.client_name,
      client_company: quote.client_company,
      client_email: quote.client_email,
      client_phone: quote.client_phone,
      created_at: quote.created_at,
      shooting_dates_start: quote.shooting_dates_start,
      shooting_dates_end: quote.shooting_dates_end,
      days_count: quote.days_count,
      status: quote.status,
      led_principal_width: quote.led_principal_width,
      led_principal_height: quote.led_principal_height,
      led_principal_curvature: quote.led_principal_curvature,
      led_principal_modules: quote.led_principal_modules,
      led_teto_width: quote.led_teto_width,
      led_teto_height: quote.led_teto_height,
      led_teto_modules: quote.led_teto_modules,
      selected_services: parsedServices, // Now properly parsed as array
      total_price: quote.total_price,
      original_total_price: quote.original_total_price,
      discount_percentage: quote.discount_percentage,
      discount_amount: quote.discount_amount,
      discount_reason: quote.discount_reason,
      quote_approved: quote.quote_approved,
      quote_approved_at: quote.quote_approved_at
    };

    res.json({ quote: publicQuote });

  } catch (error) {
    console.error('Error in public quote endpoint:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Approve quote by slug
app.post('/api/quotes/approve/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    const clientIP = req.ip || req.connection.remoteAddress || 'unknown';
    
    if (!slug) {
      return res.status(400).json({ error: 'Quote slug is required' });
    }

    // First, check if quote exists and is not already approved
    let existingQuote = null;
    let fetchError = null;
    
    if (slug.startsWith('quote-')) {
      const id = slug.replace('quote-', '');
      const { data, error } = await supabaseAdmin
        .from('proposals')
        .select('id, quote_approved, project_name, client_email')
        .eq('id', id)
        .single();
      existingQuote = data;
      fetchError = error;
    } else {
      const { data, error } = await supabaseAdmin
        .from('proposals')
        .select('id, quote_approved, project_name, client_email')
        .eq('quote_url_slug', slug)
        .single();
      existingQuote = data;
      fetchError = error;
    }

    if (fetchError || !existingQuote) {
      return res.status(404).json({ error: 'Quote not found' });
    }

    if (existingQuote.quote_approved) {
      return res.status(400).json({ error: 'Quote has already been approved' });
    }

    // Update quote with approval using RPC (works without service key)
    const approvedAt = new Date().toISOString();
    console.log(`Attempting to approve quote ID: ${existingQuote.id}, IP: ${clientIP}`);
    
    const updateQuery = `
      UPDATE proposals 
      SET quote_approved = true, 
          quote_approved_at = NOW(), 
          quote_approval_ip = '${clientIP.replace(/'/g, "''")}', 
          status = 'approved'
      WHERE id = '${existingQuote.id}'
    `;
    
    const { error: updateError } = await supabase.rpc('execute_sql', { sql_query: updateQuery });

    if (updateError) {
      console.error('Error updating quote approval:', updateError);
      console.error('Update error details:', JSON.stringify(updateError, null, 2));
      return res.status(500).json({ error: 'Failed to approve quote', details: updateError.message });
    }

    // Get the complete quote data for the response
    let completeQuote = null;
    if (slug.startsWith('quote-')) {
      const id = slug.replace('quote-', '');
      const { data, error } = await supabaseAdmin
        .from('proposals')
        .select('*')
        .eq('id', id)
        .single();
      completeQuote = data;
    } else {
      const { data, error } = await supabaseAdmin
        .from('proposals')
        .select('*')
        .eq('quote_url_slug', slug)
        .single();
      completeQuote = data;
    }

    // TODO: Send approval notification email to admin/sales team
    console.log(`Quote approved: ${existingQuote.project_name} by client at ${clientIP}`);

    res.json({ 
      success: true, 
      message: 'Quote approved successfully',
      approvedAt: approvedAt,
      quote: completeQuote
    });

  } catch (error) {
    console.error('Error in quote approval endpoint:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Generate URL slug for a proposal
app.post('/api/proposals/:id/generate-slug', async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!id) {
      return res.status(400).json({ error: 'Proposal ID is required' });
    }

    // Check authorization
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'No authorization header' });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    // Get user profile to determine role
    const { data: userProfile, error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    // Special handling for master admin
    let userRole = userProfile?.role;
    
    if (user.email === 'nelson.maluf@onprojecoes.com.br') {
      userRole = 'admin';
    }

    // If no profile found but user exists, and it's a known sales rep email, grant sales_rep role
    if (!userRole && user.email === 'nelson@avdesign.video') {
      userRole = 'sales_rep';
    }

    if (!userRole || !['admin', 'sales_rep'].includes(userRole)) {
      return res.status(403).json({ error: 'Unauthorized: Only admins and sales reps can generate quote URLs' });
    }

    // Check if supabaseAdmin is properly configured
    if (!supabaseAdmin) {
      console.error('Supabase admin client not configured');
      return res.status(500).json({ error: 'Server configuration error: Admin client not available' });
    }

    console.log('Fetching proposal with ID:', id);
    
    // Try to get proposal with quote_url_slug first, fallback to basic fields if column doesn't exist
    let proposal = null;
    let fetchError = null;
    
    try {
      const { data, error } = await supabaseAdmin
        .from('proposals')
        .select('project_name, quote_url_slug')
        .eq('id', id)
        .single();
      
      proposal = data;
      fetchError = error;
    } catch (error) {
      // If quote_url_slug column doesn't exist, try without it
      if (error.message && error.message.includes('quote_url_slug')) {
        console.log('quote_url_slug column does not exist, fetching without it');
        const { data, error: basicError } = await supabaseAdmin
          .from('proposals')
          .select('project_name')
          .eq('id', id)
          .single();
        
        proposal = data ? { ...data, quote_url_slug: null } : null;
        fetchError = basicError;
      } else {
        fetchError = error;
      }
    }

    if (fetchError) {
      console.error('Database error fetching proposal:', fetchError);
      return res.status(500).json({ error: 'Database error', details: fetchError.message });
    }

    if (!proposal) {
      console.error('Proposal not found for ID:', id);
      return res.status(404).json({ error: 'Proposal not found' });
    }

    console.log('Found proposal:', proposal);

    // If already has a slug, return it
    if (proposal.quote_url_slug) {
      return res.json({ slug: proposal.quote_url_slug });
    }

    // Generate a simple slug from project name
    function generateSlug(projectName) {
      if (!projectName || typeof projectName !== 'string') {
        return 'quote-' + Date.now(); // Fallback slug
      }
      return projectName
        .toLowerCase()
        .replace(/[^\w\s-]/g, '') // Remove special characters
        .replace(/\s+/g, '-')     // Replace spaces with hyphens
        .replace(/-+/g, '-')      // Replace multiple hyphens with single
        .trim('-') || 'quote-' + Date.now(); // Fallback if empty
    }

    console.log('Generating slug for project:', proposal.project_name);
    let baseSlug = generateSlug(proposal.project_name);
    let finalSlug = baseSlug;
    let counter = 1;
    console.log('Base slug generated:', baseSlug);

    // Check for existing slugs and make unique
    while (true) {
      try {
        const { data: existing, error: checkError } = await supabaseAdmin
          .from('proposals')
          .select('id')
          .eq('quote_url_slug', finalSlug)
          .neq('id', id)
          .single();

        if (checkError && checkError.code !== 'PGRST116') { // PGRST116 is "not found" which is what we want
          console.error('Error checking existing slug:', checkError);
          throw checkError;
        }

        if (!existing) break; // Slug is unique
        
        finalSlug = `${baseSlug}-${counter}`;
        counter++;
        console.log('Slug exists, trying:', finalSlug);
        
        if (counter > 100) { // Prevent infinite loop
          finalSlug = `${baseSlug}-${Date.now()}`;
          break;
        }
      } catch (error) {
        console.error('Error in slug uniqueness check:', error);
        finalSlug = `${baseSlug}-${Date.now()}`;
        break;
      }
    }

    // Update proposal with the generated slug
    console.log('Updating proposal with slug:', finalSlug);
    
    try {
      const { error: updateError } = await supabaseAdmin
        .from('proposals')
        .update({ quote_url_slug: finalSlug })
        .eq('id', id);

      if (updateError) {
        // If the column doesn't exist, create a simple mapping in memory or return a temporary slug
        if (updateError.message && updateError.message.includes('quote_url_slug')) {
          console.log('quote_url_slug column does not exist, returning temporary slug');
          // For now, return a slug based on the proposal ID - this is a temporary workaround
          const tempSlug = `quote-${id}`;
          console.log('Using temporary slug (column not found):', tempSlug);
          return res.json({ slug: tempSlug });
        } else {
          throw updateError;
        }
      }

      console.log('Successfully generated and saved slug:', finalSlug);
      res.json({ slug: finalSlug });
    } catch (updateError) {
      console.error('Error updating proposal with slug:', updateError);
      
      // Fallback: return a temporary slug based on ID
      const tempSlug = `quote-${id}`;
      console.log('Fallback: using temporary slug due to update error:', tempSlug);
      res.json({ slug: tempSlug });
    }

  } catch (error) {
    console.error('Error in generate slug endpoint:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ 
      error: 'Internal server error', 
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// --- End Public Quote API Routes ---

// --- End User and Lead Management Routes ---

// Socket.io connection handling (existing code)
io.on('connection', (socket) => {
  console.log('A user connected via Socket.IO'); // Clarified log message

  socket.on('disconnect', () => {
    console.log('Socket.IO user disconnected');
  });

  // Handle audio data from client
  socket.on('audioData', async (audioData) => {
    try {
      // Here we would process the audio data with OpenAI
      // For now, we'll just echo it back
      socket.emit('aiResponse', {
        type: 'audio',
        data: 'AI response would go here'
      });
    } catch (error) {
      console.error('Error processing audio:', error);
      socket.emit('error', { message: 'Error processing audio' });
    }
  });

  // Handle text data from client
  socket.on('textData', async (textData) => {
    try {
      // Here we would process the text data with OpenAI
      socket.emit('aiResponse', {
        type: 'text',
        data: 'AI response to: ' + textData
      });
    } catch (error) {
      console.error('Error processing text:', error);
      socket.emit('error', { message: 'Error processing text' });
    }
  });
});

// Track sent webhooks to prevent duplicates
const sentWebhooks = new Set();

// Webhook function to send proposal data to N8N/CRM
async function sendProposalWebhook(proposalData) {
  try {
    // Create a unique key for this proposal
    const webhookKey = `${proposalData.id || 'unknown'}_${Date.now()}`;
    
    // Check if we already sent this webhook recently (within 10 seconds)
    const recentKey = `${proposalData.id || 'unknown'}`;
    const now = Date.now();
    const isRecent = Array.from(sentWebhooks).some(key => 
      key.startsWith(recentKey) && (now - parseInt(key.split('_')[1])) < 10000
    );
    
    if (isRecent) {
      console.log('Skipping duplicate webhook for proposal:', proposalData.id);
      return;
    }
    
    // Add to sent webhooks
    sentWebhooks.add(webhookKey);
    
    // Clean up old entries (keep only last 100)
    if (sentWebhooks.size > 100) {
      const oldestKeys = Array.from(sentWebhooks).slice(0, 50);
      oldestKeys.forEach(key => sentWebhooks.delete(key));
    }
    
    console.log('Sending webhook from SERVER for proposal:', proposalData.id);
    
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
      led_principal_pixels_width: proposalData.led_principal_pixels_width,
      led_principal_pixels_height: proposalData.led_principal_pixels_height,
      led_principal_total_pixels: proposalData.led_principal_total_pixels,
      led_principal_curvature: proposalData.led_principal_curvature,
      
      // LED Teto Configuration (if available)
      led_teto_width: proposalData.led_teto_width,
      led_teto_height: proposalData.led_teto_height,
      led_teto_modules: proposalData.led_teto_modules,
      led_teto_resolution: proposalData.led_teto_resolution,
      led_teto_pixels_width: proposalData.led_teto_pixels_width,
      led_teto_pixels_height: proposalData.led_teto_pixels_height,
      led_teto_total_pixels: proposalData.led_teto_total_pixels,
      
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
      source: 'onav_led_calculator_server',
      timestamp: new Date().toISOString(),
      webhook_call_id: `server_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };
    
    console.log('Sending proposal webhook to N8N from server:', proposalData.id);
    
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
    
    const webhookUrl = `https://n8n.avauto.fun/webhook/061d8866-fa53-435a-9a5f-ceafb3e2e639?${queryParams.toString()}`;
    
    console.log('Server webhook URL being called:', webhookUrl);
    console.log('Server query parameters count:', queryParams.toString().split('&').length);
    
    const response = await fetch(webhookUrl, {
      method: 'GET'
    });
    
    if (!response.ok) {
      throw new Error(`Webhook failed: ${response.status} ${response.statusText}`);
    }
    
    console.log('Webhook sent successfully to N8N from server');
    
  } catch (error) {
    console.error('Error sending webhook to N8N from server:', error);
    throw error;
  }
}

// Email notification function to send proposal emails using Supabase Edge Function
async function sendProposalEmailNotification(proposalData, createdByUserId, currentUserRole) {
  try {
    console.log('Sending proposal email notification from server via Supabase Edge Function');
    
    // Create a server-side supabase client for calling Edge Functions
    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);
    
    // Call the Supabase Edge Function
    const { data, error } = await supabaseClient.functions.invoke('send-quote-notification', {
      body: {
        proposalId: proposalData.id,
        createdByUserId: createdByUserId,
        currentUserRole: currentUserRole
      }
    });
    
    if (error) {
      throw new Error(`Email notification failed: ${error.message}`);
    }
    
    console.log('Email notification sent successfully from server:', data);
    
  } catch (error) {
    console.error('Error sending email notification from server:', error);
    throw error;
  }
}

// --- Webhook Proxy Endpoint ---
// Proxy endpoint to handle webhook calls and bypass CORS
app.post('/api/webhook-proxy', async (req, res) => {
  try {
    const { targetUrl, payload } = req.body;
    
    if (!targetUrl || !payload) {
      return res.status(400).json({ error: 'Missing targetUrl or payload' });
    }
    
    console.log('Proxying webhook to:', targetUrl);
    console.log('Payload:', JSON.stringify(payload, null, 2));
    
    // Import fetch dynamically for Node.js compatibility
    const fetch = (await import('node-fetch')).default;
    
    const response = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'ONAV-Webhook-Proxy/1.0'
      },
      body: JSON.stringify(payload)
    });
    
    const responseText = await response.text();
    console.log('Webhook response status:', response.status);
    console.log('Webhook response:', responseText);
    
    // Try to parse as JSON, fallback to text
    let responseData;
    try {
      responseData = JSON.parse(responseText);
    } catch (e) {
      responseData = responseText;
    }
    
    res.status(response.status).json({
      success: response.ok,
      status: response.status,
      data: responseData
    });
    
  } catch (error) {
    console.error('Webhook proxy error:', error);
    res.status(500).json({ 
      error: 'Webhook proxy failed', 
      details: error.message 
    });
  }
});

const PORT = process.env.PORT || 3000;

// For local development
if (process.env.NODE_ENV !== 'production') {
  server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`API endpoints for products available at http://localhost:${PORT}/api/products`);
  });
}

// Export the Express app for Vercel serverless functions
module.exports = app;