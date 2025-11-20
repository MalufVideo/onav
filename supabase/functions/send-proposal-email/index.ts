import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { Resend } from 'https://esm.sh/resend';

console.log('Function invoked');

// --- Helper to format dates (adjust format as needed) ---
function formatDate(dateString) {
  if (!dateString) return '-';
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  } catch (e) {
    return '-';
  }
}

// --- Helper to format currency (adjust as needed for R$) ---
function formatCurrency(value) {
  if (value === null || value === undefined || isNaN(value)) {
    return 'N/A'; // Or R$ 0,00 or '-' depending on preference
  }
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value);
}

// --- Helper to parse original price ---
function parseOriginalPrice(originalPriceString) {
  if (!originalPriceString) return 0;
  
  // Remove currency symbols and convert to number
  const cleanedPrice = originalPriceString
    .replace(/[^\d,.-]/g, '') // Remove non-numeric characters except comma, dot, dash
    .replace(/\./g, '') // Remove thousand separators
    .replace(',', '.'); // Replace decimal comma with dot
  
  return parseFloat(cleanedPrice) || 0;
}

// --- Helper Function to Generate HTML --- 
// (Based on html-to-pdf/template.html)
function generateProposalHtml(proposalData) {
  const projectName = proposalData.project_name || 'N/A';
  const clientName = proposalData.client_name || 'N/A';
  const clientCompany = proposalData.client_company || 'N/A';
  const clientEmail = proposalData.client_email || 'N/A';
  const clientPhone = proposalData.client_phone || 'N/A';
  const proposalDate = formatDate(proposalData.created_at) || formatDate(new Date().toISOString()) || 'N/A'; // Use created_at or current date
  const shootingPeriod = formatShootingPeriod(proposalData.shooting_dates_start, proposalData.shooting_dates_end) || 'N/A';
  const duration = proposalData.days_count ? `${proposalData.days_count} dia(s)` : 'N/A';
  const proposalIdShort = proposalData.id ? proposalData.id.substring(0, 8) : 'N/A'; // Short ID for display
  const daysCount = proposalData.days_count || 1;

  // Discount Data
  const originalPrice = parseOriginalPrice(proposalData.original_total_price);
  const discountPercentage = proposalData.total_discount_percentage || 0;
  const discountAmount = proposalData.total_discount_amount || 0;
  const discountReason = proposalData.discount_reason || '';
  const hasDiscount = discountPercentage > 0 || discountAmount > 0;
  
  // Calculate final price if discount exists, otherwise use total_price string directly if available
  // Note: total_price in DB is usually a formatted string like "R$ 1.000,00"
  let totalPriceFormatted = proposalData.total_price || 'N/A';
  
  // If we have explicit discount values, we might want to recalculate/format explicitly to be safe,
  // but relying on the stored total_price is usually better if it was calculated correctly on save.
  // However, for the "Desconto Aplicado" section, we need numbers.

  // LED Principal Data (with explicit fallbacks)
  const ledPWidth = proposalData.led_principal_width ?? '-';
  const ledPHeight = proposalData.led_principal_height ?? '-';
  const ledPCurvature = proposalData.led_principal_curvature ?? '-';
  const ledPModules = proposalData.led_principal_modules ?? '-';
  // const ledPPixels = (proposalData.led_principal_pixels_width && proposalData.led_principal_pixels_height)
  //   ? `${proposalData.led_principal_pixels_width} × ${proposalData.led_principal_pixels_height}` : '-';
  // const ledPWeight = proposalData.led_principal_weight ?? '-';

  // LED Teto Data (with explicit fallbacks)
  const ledTWidth = proposalData.led_teto_width ?? '-';
  const ledTHeight = proposalData.led_teto_height ?? '-';
  // Assuming no curvature for teto? Add if needed.
  const ledTModules = proposalData.led_teto_modules ?? '-';
  // const ledTPixels = (proposalData.led_teto_pixels_width && proposalData.led_teto_pixels_height)
  //   ? `${proposalData.led_teto_pixels_width} × ${proposalData.led_teto_pixels_height}` : '-';
  // const ledTWeight = proposalData.led_teto_weight ?? '-';

  // --- Generate Service Table Rows (with daily prices) ---
  let serviceRowsHtml = '';
  if (proposalData.selected_services && Array.isArray(proposalData.selected_services)) {
    proposalData.selected_services.forEach((service)=>{
      const unitPrice = service.unit_price ?? 0;
      const quantity = service.quantity ?? 0;
      const dailySubtotal = unitPrice * quantity;
      
      // Inline styles for potentially problematic elements in Gmail
      const tdStyle = 'style="border: 1px solid #e5e7eb; padding: 5px 8px; text-align: left; font-size: 0.88rem; vertical-align: top;"';
      const tdQtyStyle = 'style="border: 1px solid #e5e7eb; padding: 5px 8px; text-align: center; font-size: 0.88rem; vertical-align: top;"';
      const tdPriceStyle = 'style="border: 1px solid #e5e7eb; padding: 5px 8px; text-align: right; font-weight: 500; white-space: nowrap; color: #1f2937; font-size: 0.88rem; vertical-align: top;"';
      
      serviceRowsHtml += `
        <tr>
          <td ${tdStyle}>${service.name || 'N/A'}</td>
          <td ${tdQtyStyle}>${quantity}</td>
          <td ${tdPriceStyle}>${formatCurrency(unitPrice)}</td>
          <td ${tdPriceStyle}>${formatCurrency(dailySubtotal)}</td> 
        </tr>
      `;
    });
  } else {
    serviceRowsHtml = '<tr><td colspan="4" style="text-align: center; padding: 10px;">Nenhum serviço selecionado.</td></tr>';
  }

  // --- Generate Discount HTML ---
  let discountHtml = '';
  let totalLabel = `Total (${duration})`;
  
  if (hasDiscount) {
    totalLabel = `Total com Desconto (${duration})`;
    const discountReasonHtml = discountReason 
      ? `<div style="margin-top: 1rem; padding-top: 0.5rem; border-top: 1px dashed #fcd34d;">
           <p style="margin: 0; font-weight: 600; color: #92400e; font-size: 0.9rem;">Motivo do Desconto:</p>
           <p style="margin: 0.2rem 0 0 0; font-size: 0.9rem; color: #b45309;">${discountReason}</p>
         </div>`
      : '';

    discountHtml = `
    <div class="section">
      <div class="card" style="background-color: #fffbeb; border: 1px solid #fcd34d;">
        <h3 style="color: #b45309; margin-bottom: 1rem;">Desconto Aplicado</h3>
        
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem;">
          <div>
            <p style="margin: 0; font-weight: 600; color: #92400e;">Preço Original:</p>
            <p style="margin: 0.25rem 0 0 0; font-size: 1.1rem; color: #b45309; text-decoration: line-through;">${formatCurrency(originalPrice)}</p>
          </div>
          <div>
            <p style="margin: 0; font-weight: 600; color: #92400e;">Desconto:</p>
            <p style="margin: 0.25rem 0 0 0; font-size: 1.1rem; color: #d97706; font-weight: 600;">${discountPercentage}% (${formatCurrency(discountAmount)})</p>
          </div>
          <div>
            <p style="margin: 0; font-weight: 600; color: #92400e;">Preço Final:</p>
            <p style="margin: 0.25rem 0 0 0; font-size: 1.2rem; color: #059669; font-weight: 700;">${totalPriceFormatted}</p>
          </div>
        </div>

        ${discountReasonHtml}

      </div>
    </div>
    `;
  }

  // --- Construct Full HTML --- 
  // Using template literal for readability
  const htmlContent = `
    <!DOCTYPE html>
    <html lang="pt">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>Proposta Orçamentária: ${projectName}</title>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap" rel="stylesheet" />
      <style>
        /* Copied directly from template.html */
        body {
          margin: 0;
          padding: 0;
          background-color: #ffffff;
          font-family: 'Inter', sans-serif;
          display: flex;
          justify-content: center;
        }
        #quote-details-content-wrapper {
          max-width: 754px;
          width: 100%;
          margin: 20px auto;
          background-color: white;
          box-shadow: 0 8px 24px rgba(0,0,0,0.15);
          border-radius: 12px;
        }
        #quote-details-content {
          color: #374151;
          padding: 2rem 1.5rem 1.5rem;
          line-height: 1.45;
        }
        .modal-header-flex {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding-bottom: 1rem;
          margin-bottom: 1rem;
          border-bottom: 1px solid #e5e7eb;
        }
        .modal-header-flex h2 {
          font-size: 1.4rem;
          color: #111827;
          margin: 0;
          text-align: right;
          flex-grow: 1;
          margin-left: 1rem;
        }
        .modal-close-btn {
          display: none; /* Hide close button in email/PDF */
        }
        .section {
          padding: 1rem 0;
          margin-bottom: 1rem;
          border-bottom: 1px solid #f3f4f6;
        }
        .section:last-of-type {
          border-bottom: none;
          margin-top: 0.5rem;
          padding-top: 0.5rem;
        }
        .card-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 1rem;
        }
        .card {
          background: #f9fafb;
          padding: 0.8rem 1rem;
          border-radius: 8px;
        }
        .card h3 {
          font-size: 1.05rem;
          color: #1f2937;
          margin: 0 0 0.4rem 0;
        }
        .card h4 {
          font-size: 0.95rem;
          color: #4b5563;
          margin: 0 0 0.3rem 0;
        }
        .card p {
          margin: 0.3rem 0;
          font-size: 0.9rem;
          color: #4b5563;
        }
        .card p strong {
          color: #1f2937;
          font-weight: 500;
          margin-right: 4px;
        }
        .service-table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 0.5rem;
          margin-bottom: 0;
        }
        .service-table th,
        .service-table td {
          border: 1px solid #e5e7eb;
          padding: 5px 8px;
          text-align: left;
          font-size: 0.88rem;
          vertical-align: top;
        }
        .service-table th {
          background-color: #f3f4f6;
          font-weight: 600;
          color: #374151;
        }
        .service-table th.col-qty,
        .service-table td.col-qty {
          text-align: center;
        }
        .service-table th.col-price,
        .service-table td.col-price {
          text-align: right;
          font-weight: 500;
          white-space: nowrap;
          color: #1f2937;
        }
        .service-table tbody tr:nth-child(odd) {
          background-color: #fdfdfd;
        }
        .total-line {
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: #dcfce7;
          color: #166534;
          font-size: 0.95rem;
          font-weight: 600;
          padding: 0.5rem 1rem;
          border-radius: 8px;
          margin-top: 0.5rem;
          border: 1px solid #a7f3d0;
        }
      </style>
    </head>
    <body>
      <div id="quote-details-content-wrapper">
        <div id="quote-details-content">
          <div class="modal-header-flex">
            <h2>Detalhes da Proposta: ${projectName}</h2>
          </div>


          <div class="section">
            <div class="card-grid">
              <div class="card">
                <h3>Informações do Cliente</h3>
                <p><strong>Nome:</strong> ${clientName}</p>
                <p><strong>Empresa:</strong> ${clientCompany}</p>
                <p><strong>Email:</strong> ${clientEmail}</p>
                <p><strong>Telefone:</strong> ${clientPhone}</p>
              </div>
              <div class="card">
                <h3>Detalhes do Projeto</h3>
                <p><strong>Data da Proposta:</strong> ${proposalDate}</p>
                <p><strong>Período de Filmagem:</strong> ${shootingPeriod}</p>
                <p><strong>Duração:</strong> ${duration}</p>
                <p><strong>Numero do orçamento:</strong> ${proposalIdShort}</p> <!-- Fallback to part of ID -->
              </div>
            </div>
          </div>


          <div class="section">
            <h3 style="margin-top:0">Configuração do LED</h3>
            <div class="card-grid">
              <div class="card">
                <h4>LED Principal</h4>
                <p><strong>Dimensões:</strong> ${ledPWidth} m × ${ledPHeight} m</p>
                <p><strong>Curvatura:</strong> ${ledPCurvature}°</p>
                <p><strong>Módulos:</strong> ${ledPModules}</p>
              </div>
              <div class="card">
                <h4>LED Teto</h4>
                <p><strong>Dimensões:</strong> ${ledTWidth} m × ${ledTHeight} m</p>
                <p><strong>Módulos:</strong> ${ledTModules}</p>
              </div>
            </div>
          </div>


          <div class="section">
            <div class="card">
              <h3>Serviços Incluídos (Valores Diários)</h3>
              <table class="service-table" style="width: 100%; border-collapse: collapse; margin-top: 0.5rem; margin-bottom: 0;">
                <thead style="background-color: #f3f4f6; font-weight: 600; color: #374151;">
                  <tr>
                    <th style="border: 1px solid #e5e7eb; padding: 5px 8px; text-align: left; font-size: 0.88rem;">Item</th>
                    <th style="border: 1px solid #e5e7eb; padding: 5px 8px; text-align: center; font-size: 0.88rem;">Qtd</th>
                    <th style="border: 1px solid #e5e7eb; padding: 5px 8px; text-align: right; font-size: 0.88rem; white-space: nowrap;">Preço Unit. (Diária)</th>
                    <th style="border: 1px solid #e5e7eb; padding: 5px 8px; text-align: right; font-size: 0.88rem; white-space: nowrap;">Subtotal (Diária)</th>
                  </tr>
                </thead>
                <tbody>
                  ${serviceRowsHtml}
                </tbody>
              </table>
            </div>
          </div>
          
          ${discountHtml}

          <div class="section">
            <div class="total-line">
              <span>${totalLabel}</span>
              <span>${totalPriceFormatted}</span>
            </div>
          </div>


        </div>
      </div>
    </body>
    </html>
  `;
  return htmlContent;
}

function formatShootingPeriod(startDate, endDate) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const startDay = start.toLocaleDateString('pt-BR', {
    day: '2-digit'
  });
  const endDay = end.toLocaleDateString('pt-BR', {
    day: '2-digit'
  });
  const monthYear = end.toLocaleDateString('pt-BR', {
    month: '2-digit',
    year: 'numeric'
  }); // Get MM/YYYY from end date
  return `${startDay} a ${endDay}/${monthYear}`;
}

// --- Function to Generate Plain Text Content ---
function generatePlainText(proposalData) {
  const projectName = proposalData.project_name || 'N/A';
  const clientName = proposalData.client_name || 'N/A';
  const clientEmail = proposalData.client_email || 'N/A';
  const proposalDate = formatDate(proposalData.created_at) || formatDate(new Date().toISOString()) || 'N/A';
  const shootingPeriod = formatShootingPeriod(proposalData.shooting_dates_start, proposalData.shooting_dates_end) || 'N/A';
  const duration = proposalData.days_count ? `${proposalData.days_count} dia(s)` : 'N/A';
  const proposalIdShort = proposalData.id ? proposalData.id.substring(0, 8) : 'N/A';
  const totalPriceFormatted = proposalData.total_price || 'N/A';
  const daysCount = proposalData.days_count || 1;
  
  // Discount Data
  const originalPrice = parseOriginalPrice(proposalData.original_total_price);
  const discountPercentage = proposalData.total_discount_percentage || 0;
  const discountAmount = proposalData.total_discount_amount || 0;
  const discountReason = proposalData.discount_reason || '';
  const hasDiscount = discountPercentage > 0 || discountAmount > 0;
  
  let text = `DETALHES DA PROPOSTA: ${projectName}\n\n`;
  text += `CLIENTE:\n`;
  text += `Nome: ${clientName}\n`;
  text += `Email: ${clientEmail}\n\n`;
  text += `PROJETO:\n`;
  text += `Data da Proposta: ${proposalDate}\n`;
  text += `Período: ${shootingPeriod}\n`;
  text += `Duração: ${duration}\n`;
  text += `Orçamento No.: ${proposalIdShort}\n\n`;
  
  text += `SERVIÇOS (Valores Diários):\n`;
  text += `------------------------------------\n`;
  text += `Item | Qtd | Preço Unit. | Subtotal Diário\n`;
  text += `------------------------------------\n`;
  
  if (proposalData.selected_services && Array.isArray(proposalData.selected_services)) {
    proposalData.selected_services.forEach((service)=>{
      const unitPrice = service.unit_price ?? 0;
      const quantity = service.quantity ?? 0;
      const dailySubtotal = unitPrice * quantity;
      text += `${service.name || 'N/A'} | ${quantity} | ${formatCurrency(unitPrice)} | ${formatCurrency(dailySubtotal)}\n`;
    });
  } else {
    text += `Nenhum serviço selecionado.\n`;
  }
  
  text += `------------------------------------\n\n`;
  
  if (hasDiscount) {
    text += `DESCONTO APLICADO:\n`;
    text += `Preço Original: ${formatCurrency(originalPrice)}\n`;
    text += `Desconto: ${discountPercentage}% (${formatCurrency(discountAmount)})\n`;
    text += `Preço Final: ${totalPriceFormatted}\n`;
    if (discountReason) {
       text += `Motivo: ${discountReason}\n`;
    }
    text += `\n`;
    text += `TOTAL COM DESCONTO (${duration}): ${totalPriceFormatted}\n\n`;
  } else {
    text += `TOTAL (${duration}): ${totalPriceFormatted}\n\n`;
  }

  text += `ON+AV - https://onav.com.br`;
  
  return text;
}

// --- Main Server Logic --- 
serve(async (req)=>{
  console.log('Request received:', req.method, req.url);
  
  try {
    // Log headers for debugging
    console.log('Request Headers:', JSON.stringify(Object.fromEntries(req.headers.entries())));
    
    // Log environment variables (excluding sensitive keys)
    const envVars = Deno.env.toObject();
    const safeEnvVars = Object.keys(envVars).filter((key)=>!key.includes('KEY') && !key.includes('SECRET')) // Basic filtering
    .reduce((obj, key)=>{
      obj[key] = envVars[key];
      return obj;
    }, {});
    console.log('Environment Variables (safe):', JSON.stringify(safeEnvVars));
    
    // Handle CORS preflight request
    if (req.method === 'OPTIONS') {
      return new Response('ok', {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
        }
      });
    }
    
    let supabaseAdmin = null; // Define here for broader scope
    
    try {
      // --- Get Secrets and Initialize Clients ---
      const resendApiKey = Deno.env.get('RESEND_API_KEY');
      const senderEmail = Deno.env.get('SENDER_EMAIL_ADDRESS');
      const supabaseUrl = Deno.env.get('SUPABASE_URL'); // Provided by Supabase environment
      const serviceRoleKey = Deno.env.get('SERVICE_ROLE_KEY'); // Use the correct name
      
      if (!resendApiKey || !senderEmail || !supabaseUrl || !serviceRoleKey) {
        console.error('Missing environment variables');
        throw new Error('Server configuration error: Missing environment variables.');
      }
      
      const resend = new Resend(resendApiKey);
      supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false // Explicitly disable for server-side
        }
      });
      
      // --- Extract proposalId from request body ---
      const { proposalId } = await req.json();
      if (!proposalId) {
        throw new Error('proposalId is required in the request body.');
      }
      
      console.log(`Function invoked for proposalId: ${proposalId}`);
      
      // --- Fetch Proposal Data ---
      console.log('Fetching proposal data from Supabase...');
      const { data: proposalData, error: fetchError } = await supabaseAdmin.from('proposals').select('*') // Select all columns needed for the HTML/PDF
      .eq('id', proposalId).single();
      
      if (fetchError) {
        console.error('Error fetching proposal:', fetchError);
        throw new Error(`Could not fetch proposal data: ${fetchError.message}`);
      }
      
      if (!proposalData) {
        throw new Error(`Proposal with ID ${proposalId} not found.`);
      }
      
      console.log('Proposal data fetched successfully.');
      
      // --- Generate HTML Content ---
      console.log('Generating HTML content...');
      const htmlContent = generateProposalHtml(proposalData); // Cast to our interface
      console.log('HTML content generated.');
      
      // --- Generate Plain Text Content ---
      console.log('Generating plain text content...');
      const textContent = generatePlainText(proposalData);
      console.log('Plain text content generated.');
      
      // --- Send Email via Resend ---
      const recipientEmail = proposalData.client_email;
      if (!recipientEmail) {
        throw new Error(`Client email not found for proposal ID ${proposalId}.`);
      }
      
      console.log(`Attempting to send email to ${recipientEmail}...`);
      const { data: emailData, error: emailError } = await resend.emails.send({
        from: senderEmail,
        to: recipientEmail,
        subject: `ON+AV Proposta Orçamentária: ${proposalData.project_name || 'Detalhes da Proposta'}`,
        html: htmlContent,
        text: textContent
      });
      
      if (emailError) {
        console.error('Error sending email:', emailError);
        // Log the detailed error object from Resend
        console.error('Resend error details:', JSON.stringify(emailError, null, 2));
        throw new Error(`Failed to send email.`); // Keep generic error message for client
      }
      
      // Log the email ID returned by Resend upon success
      const sentEmailId = emailData?.id || 'N/A';
      console.log(`Email sent successfully to ${recipientEmail}, Resend Email ID: ${sentEmailId}`);
      
      // --- Return Success Response ---
      return new Response(JSON.stringify({
        message: 'Proposal email sent successfully.',
        emailId: sentEmailId
      }), {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        status: 200
      });
      
    } catch (error) {
      console.error('Function execution error:', error);
      // Ensure a response is sent even if the error occurs before generating response
      return new Response(JSON.stringify({
        error: error.message || 'An unexpected error occurred.'
      }), {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        status: 500
      });
    }
    
  } catch (error) {
    console.error('Server error:', error);
    return new Response(JSON.stringify({
      error: 'Internal Server Error'
    }), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      status: 500
    });
  }
});
