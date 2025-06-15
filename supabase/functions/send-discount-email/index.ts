import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { Resend } from 'https://esm.sh/resend';

console.log('Discount Email Function invoked');

// --- Helper to format dates ---
function formatDate(dateString: string | null): string {
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

// --- Helper to format currency ---
function formatCurrency(value: number | null | undefined): string {
  if (value === null || value === undefined || isNaN(value)) {
    return 'N/A';
  }
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value);
}

// --- Helper to format shooting period ---
function formatShootingPeriod(startDate: string | null, endDate: string | null): string {
  if (!startDate || !endDate) return '-';
  
  const start = new Date(startDate);
  const end = new Date(endDate);
  const startDay = start.toLocaleDateString('pt-BR', { day: '2-digit' });
  const endDay = end.toLocaleDateString('pt-BR', { day: '2-digit' });
  const monthYear = end.toLocaleDateString('pt-BR', { 
    month: '2-digit', 
    year: 'numeric' 
  });
  
  return `${startDay} a ${endDay}/${monthYear}`;
}

// --- Helper to parse original price ---
function parseOriginalPrice(originalPriceString: string): number {
  if (!originalPriceString) return 0;
  
  // Remove currency symbols and convert to number
  const cleanedPrice = originalPriceString
    .replace(/[^\d,.-]/g, '') // Remove non-numeric characters except comma, dot, dash
    .replace(/\./g, '') // Remove thousand separators
    .replace(',', '.'); // Replace decimal comma with dot
  
  return parseFloat(cleanedPrice) || 0;
}

// --- Generate HTML for discount email ---
function generateDiscountProposalHtml(proposalData: any): string {
  const projectName = proposalData.project_name || 'N/A';
  const clientName = proposalData.client_name || 'N/A';
  const clientCompany = proposalData.client_company || 'N/A';
  const clientEmail = proposalData.client_email || 'N/A';
  const clientPhone = proposalData.client_phone || 'N/A';
  const proposalDate = formatDate(proposalData.created_at) || formatDate(new Date().toISOString()) || 'N/A';
  const shootingPeriod = formatShootingPeriod(proposalData.shooting_dates_start, proposalData.shooting_dates_end) || 'N/A';
  const duration = proposalData.days_count ? `${proposalData.days_count} dia(s)` : 'N/A';
  const proposalIdShort = proposalData.id ? proposalData.id.substring(0, 8) : 'N/A';
  
  // Get discount information
  const originalPrice = parseOriginalPrice(proposalData.original_total_price);
  const discountPercentage = proposalData.total_discount_percentage || 0;
  const discountAmount = proposalData.total_discount_amount || 0;
  const finalPrice = originalPrice - discountAmount;
  const totalPriceFormatted = proposalData.total_price || formatCurrency(finalPrice);

  // LED configuration data
  const ledPWidth = proposalData.led_principal_width ?? '-';
  const ledPHeight = proposalData.led_principal_height ?? '-';
  const ledPCurvature = proposalData.led_principal_curvature ?? '-';
  const ledPModules = proposalData.led_principal_modules ?? '-';
  const ledTWidth = proposalData.led_teto_width ?? '-';
  const ledTHeight = proposalData.led_teto_height ?? '-';
  const ledTModules = proposalData.led_teto_modules ?? '-';

  // Generate service table rows
  let serviceRowsHtml = '';
  if (proposalData.selected_services && Array.isArray(proposalData.selected_services)) {
    proposalData.selected_services.forEach((service: any) => {
      const unitPrice = service.unit_price ?? 0;
      const quantity = service.quantity ?? 0;
      const dailySubtotal = unitPrice * quantity;
      
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

  // Generate discount section HTML
  const discountSectionHtml = `
    <div class="section">
      <div class="card">
        <h3 style="color: #dc2626; margin-bottom: 1rem;"> Desconto Aplicado</h3>
        <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 1rem;">
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem;">
            <div>
              <p style="margin: 0; font-weight: 600; color: #374151;">Preço Original:</p>
              <p style="margin: 0.25rem 0 0 0; font-size: 1.1rem; color: #6b7280; text-decoration: line-through;">${formatCurrency(originalPrice)}</p>
            </div>
            <div>
              <p style="margin: 0; font-weight: 600; color: #374151;">Desconto:</p>
              <p style="margin: 0.25rem 0 0 0; font-size: 1.1rem; color: #dc2626; font-weight: 600;">${discountPercentage}% (${formatCurrency(discountAmount)})</p>
            </div>
            <div>
              <p style="margin: 0; font-weight: 600; color: #374151;">Preço Final:</p>
              <p style="margin: 0.25rem 0 0 0; font-size: 1.2rem; color: #059669; font-weight: 700;">${formatCurrency(finalPrice)}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="pt">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>Proposta Atualizada - Desconto Aplicado: ${projectName}</title>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap" rel="stylesheet" />
      <style>
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
        .modal-header-flex img {
          max-width: 160px;
          height: auto;
          flex-shrink: 0;
        }
        .modal-header-flex h2 {
          font-size: 1.4rem;
          color: #111827;
          margin: 0;
          text-align: right;
          flex-grow: 1;
          margin-left: 1rem;
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
            <img src="https://onav.com.br/img/on+av_logo_v3.png" alt="ON+AV Logo" />
            <h2>Detalhes: ${projectName}</h2>
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
                <p><strong>Numero do orçamento:</strong> ${proposalIdShort}</p>
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
                <p><strong>Resolução:</strong> N/A</p>
                <p><strong>Pixels (L×A):</strong> 7.680 × 1.920 (14.745.600 total)</p>
                <p><strong>Potência Máx./Média:</strong> 69.000 W / 23.000 W</p>
                <p><strong>Peso:</strong> 3.000 kg</p>
              </div>
              <div class="card">
                <h4>LED Teto</h4>
                <p><strong>Dimensões:</strong> ${ledTWidth} m × ${ledTHeight} m</p>
                <p><strong>Módulos:</strong> ${ledTModules}</p>
                <p><strong>Resolução:</strong> N/A</p>
                <p><strong>Pixels (L×A):</strong> 3.072 × 2.304 (7.077.888 total)</p>
                <p><strong>Potência Máx./Média:</strong> 33.120 W / 11.040 W</p>
                <p><strong>Peso:</strong> 1.440 kg</p>
              </div>
            </div>
          </div>

          <div class="section">
            <div class="card">
              <h3>Serviços Incluídos (Valores Diários)</h3>
              <table class="service-table">
                <thead>
                  <tr>
                    <th>Item</th>
                    <th style="text-align: center;">Qtd</th>
                    <th style="text-align: right;">Preço Unit. (Diária)</th>
                    <th style="text-align: right;">Subtotal (Diária)</th>
                  </tr>
                </thead>
                <tbody>
                  ${serviceRowsHtml}
                </tbody>
              </table>
            </div>
          </div>

          ${discountSectionHtml}

          <div class="section">
            <div class="total-line">
              <span>Total com Desconto (${duration})</span>
              <span>${formatCurrency(finalPrice)}</span>
            </div>
          </div>

        </div>
      </div>
    </body>
    </html>
  `;

  return htmlContent;
}

// --- Generate plain text for discount email ---
function generateDiscountPlainText(proposalData: any): string {
  const projectName = proposalData.project_name || 'N/A';
  const clientName = proposalData.client_name || 'N/A';
  const clientEmail = proposalData.client_email || 'N/A';
  const proposalDate = formatDate(proposalData.created_at) || formatDate(new Date().toISOString()) || 'N/A';
  const shootingPeriod = formatShootingPeriod(proposalData.shooting_dates_start, proposalData.shooting_dates_end) || 'N/A';
  const duration = proposalData.days_count ? `${proposalData.days_count} dia(s)` : 'N/A';
  const proposalIdShort = proposalData.id ? proposalData.id.substring(0, 8) : 'N/A';
  
  // Get discount information
  const originalPrice = parseOriginalPrice(proposalData.original_total_price);
  const discountPercentage = proposalData.total_discount_percentage || 0;
  const discountAmount = proposalData.total_discount_amount || 0;
  const finalPrice = originalPrice - discountAmount;

  let text = `PROPOSTA ATUALIZADA - DESCONTO APLICADO: ${projectName}\n\n`;
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
    proposalData.selected_services.forEach((service: any) => {
      const unitPrice = service.unit_price ?? 0;
      const quantity = service.quantity ?? 0;
      const dailySubtotal = unitPrice * quantity;
      text += `${service.name || 'N/A'} | ${quantity} | ${formatCurrency(unitPrice)} | ${formatCurrency(dailySubtotal)}\n`;
    });
  } else {
    text += `Nenhum serviço selecionado.\n`;
  }
  
  text += `------------------------------------\n\n`;
  text += `DESCONTO APLICADO:\n`;
  text += `Preço Original: ${formatCurrency(originalPrice)}\n`;
  text += `Desconto: ${discountPercentage}% (${formatCurrency(discountAmount)})\n`;
  text += `Preço Final: ${formatCurrency(finalPrice)}\n\n`;
  text += `TOTAL COM DESCONTO (${duration}): ${formatCurrency(finalPrice)}\n\n`;
  text += `ON+AV - https://onav.com.br`;
  
  return text;
}

// --- Main server logic ---
serve(async (req) => {
  console.log('Discount email request received:', req.method, req.url);
  
  try {
    // Handle CORS preflight request
    if (req.method === 'OPTIONS') {
      return new Response('ok', {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
        }
      });
    }

    // --- Get environment variables ---
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    const senderEmail = Deno.env.get('SENDER_EMAIL_ADDRESS');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SERVICE_ROLE_KEY');

    if (!resendApiKey || !senderEmail || !supabaseUrl || !serviceRoleKey) {
      console.error('Missing environment variables');
      throw new Error('Server configuration error: Missing environment variables.');
    }

    const resend = new Resend(resendApiKey);
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false
      }
    });

    // --- Extract proposalId from request body ---
    const { proposalId } = await req.json();
    if (!proposalId) {
      throw new Error('proposalId is required in the request body.');
    }

    console.log(`Discount email function invoked for proposalId: ${proposalId}`);

    // --- Fetch proposal data ---
    console.log('Fetching proposal data from Supabase...');
    const { data: proposalData, error: fetchError } = await supabaseAdmin
      .from('proposals')
      .select('*')
      .eq('id', proposalId)
      .single();

    if (fetchError) {
      console.error('Error fetching proposal:', fetchError);
      throw new Error(`Could not fetch proposal data: ${fetchError.message}`);
    }

    if (!proposalData) {
      throw new Error(`Proposal with ID ${proposalId} not found.`);
    }

    // Check if proposal has discount applied
    if (!proposalData.total_discount_percentage && !proposalData.total_discount_amount) {
      throw new Error(`No discount found for proposal ID ${proposalId}.`);
    }

    console.log('Proposal data fetched successfully.');

    // --- Generate HTML and text content ---
    console.log('Generating discount email content...');
    const htmlContent = generateDiscountProposalHtml(proposalData);
    const textContent = generateDiscountPlainText(proposalData);
    console.log('Email content generated.');

    // --- Send email via Resend ---
    const recipientEmail = proposalData.client_email;
    if (!recipientEmail) {
      throw new Error(`Client email not found for proposal ID ${proposalId}.`);
    }

    console.log(`Attempting to send discount email to ${recipientEmail}...`);
    const { data: emailData, error: emailError } = await resend.emails.send({
      from: senderEmail,
      to: recipientEmail,
      subject: `ON+AV Proposta Atualizada - Desconto Aplicado: ${proposalData.project_name || 'Seu Projeto'}`,
      html: htmlContent,
      text: textContent
    });

    if (emailError) {
      console.error('Error sending discount email:', emailError);
      console.error('Resend error details:', JSON.stringify(emailError, null, 2));
      throw new Error(`Failed to send discount email.`);
    }

    const sentEmailId = emailData?.id || 'N/A';
    console.log(`Discount email sent successfully to ${recipientEmail}, Resend Email ID: ${sentEmailId}`);

    // --- Return success response ---
    return new Response(JSON.stringify({
      message: 'Discount email sent successfully.',
      emailId: sentEmailId
    }), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      status: 200
    });

  } catch (error) {
    console.error('Discount email function execution error:', error);
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
});