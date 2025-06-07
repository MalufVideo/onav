// My Quotes Page JavaScript

document.addEventListener('DOMContentLoaded', async () => {
  // Wait for authentication to initialize
  if (typeof window.auth !== 'undefined' && typeof window.auth.initAuth === 'function') {
    await window.auth.initAuth();
    setupQuotesUI();
  } else {
    // console.error('Auth module not found');
  }
});

/**
 * Set up the quotes UI and load quotes
 */
async function setupQuotesUI() {
  // Check if user is authenticated
  if (!window.auth.isAuthenticated()) {
    showLoginPrompt();
    return;
  }
  
  // Ensure the modal structure exists ONCE on page load
  setupQuoteDetailsModal(); 

  // Load and display quotes
  await loadUserQuotes();
  
  // Add logout button functionality
  const logoutButton = document.getElementById('logout-button');
  if (logoutButton) {
    logoutButton.addEventListener('click', async () => {
      await window.auth.signOut();
      window.location.href = 'login.html';
    });
  }
}

/**
 * Load the user's quotes from Supabase
 */
async function loadUserQuotes() {
  try {
    const quotesList = document.getElementById('quotes-list');
    if (!quotesList) return;
    
    // Show loading indicator
    quotesList.innerHTML = '<div class="loading">Carregando propostas...</div>';
    
    // Get Supabase client
    const supabase = window.auth.getSupabaseClient();
    if (!supabase) {
      throw new Error('Supabase client not available');
    }
    
    // Use quoteService to fetch proposals from the new table
    if (window.quoteService && typeof window.quoteService.getProposals === 'function') {
      const result = await window.quoteService.getProposals();
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to load proposals');
      }
      
      const proposals = result.data;
      
      // Display proposals or show empty message
      if (proposals && proposals.length > 0) {
        displayQuotes(proposals, quotesList);
      } else {
        quotesList.innerHTML = '<div class="empty-quotes">Você ainda não tem propostas salvas.</div>';
      }
    } else {
      // Fallback to the old method (for compatibility during transition)
      const { data: quotes, error } = await supabase
        .from('proposals')
        .select('*')
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      
      // Display quotes or show empty message
      if (quotes && quotes.length > 0) {
        displayQuotes(quotes, quotesList);
      } else {
        quotesList.innerHTML = '<div class="empty-quotes">Você ainda não tem propostas salvas.</div>';
      }
    }
  } catch (error) {
    // console.error('Error loading quotes:', error);
    document.getElementById('quotes-list').innerHTML = 
      `<div class="error">Erro ao carregar propostas: ${error.message}</div>`;
  }
}

/**
 * Format date from ISO to Brazilian format
 * @param {string} dateStr - ISO date string
 * @returns {string} Formatted date
 */
function formatDate(dateStr) {
  if (!dateStr) return '-';
  
  try {
    // Handle ISO date strings and date-only strings
    const date = new Date(dateStr);
    
    // Check if date is valid
    if (isNaN(date.getTime())) {
      // console.error('Invalid date:', dateStr);
      return 'Data inválida';
    }
    
    // Format to Brazilian date format (DD/MM/YYYY)
    return date.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
  } catch (e) {
    // console.error('Error formatting date:', e, 'Input:', dateStr);
    return 'Data inválida';
  }
}

/**
 * Format a number with thousand separators.
 * @param {number} value - The number to format.
 * @returns {string} Formatted number string.
 */
function formatNumber(value) {
  const num = Number(value);
  if (isNaN(num)) {
    return '-';
  }
  return num.toLocaleString('pt-BR');
}

/**
 * Display quotes in the UI
 * @param {Array} quotes - Array of quote objects
 * @param {HTMLElement} container - Container element to display quotes in
 */
function displayQuotes(quotes, container) {
  container.innerHTML = '';
  
  quotes.forEach(quote => {
    const quoteCard = document.createElement('div');
    quoteCard.className = 'quote-card';
    
    // Format date
    const formattedDate = formatDate(quote.created_at);
    
    // Format the shooting dates
    const shootingStart = formatDate(quote.shooting_dates_start);
    const shootingEnd = formatDate(quote.shooting_dates_end);
    const shootingPeriod = (shootingStart !== '-' && shootingEnd !== '-') ? 
      `${shootingStart} a ${shootingEnd}` : '-';
    
    quoteCard.innerHTML = `
      <div class="quote-header">
        <h3>${quote.project_name || 'Sem título'}</h3>
        <span class="quote-date">${formattedDate}</span>
      </div>
      <div class="quote-details">
        <div class="quote-info">
          <p><strong>Período:</strong> ${shootingPeriod}</p>
          <p><strong>Duração:</strong> ${quote.days_count || 1} dia(s)</p>
        </div>
        <div class="quote-price">
          <p class="price">${quote.total_price || 'R$ 0,00'}</p>
          <button class="view-details-btn" data-id="${quote.id}">Ver Detalhes</button>
        </div>
      </div>
    `;
    
    // Add click handler for view details button
    const viewButton = quoteCard.querySelector('.view-details-btn');
    if (viewButton) {
      viewButton.addEventListener('click', () => {
        showQuoteDetails(quote);
      });
    }
    
    container.appendChild(quoteCard);
  });
}

/**
 * Shows a modal with detailed quote information
 * @param {Object} quote - The quote object
 */
async function showQuoteDetails(quote) {
  // Ensure the modal exists (create it if not)
  const detailsModal = document.getElementById('quote-details-modal');
  const modalContent = document.getElementById('quote-details-content'); 

  if (!detailsModal || !modalContent) {
    // console.error('Quote details modal or content container not found');
    return;
  }

  // console.log('Quote data for modal:', quote); 

  // --- Helper function for formatting dates (adjust format as needed) ---
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      // Adjust options for pt-BR format DD/MM/YYYY
      return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    } catch (e) {
      // console.error("Error formatting date:", dateString, e);
      return dateString; 
    }
  };

  // --- Process selected_services for the table ---
  let serviceTableRowsHtml = '<tr><td colspan="4" style="padding: 10px; text-align: center; border-bottom: 1px solid #dee2e6;">Nenhum serviço adicionado</td></tr>'; 
  let serviceItems = [];
  let dailySubtotalSum = 0; // To calculate daily total if needed

  const processServicesForTable = (services) => {
    serviceItems = []; 
    dailySubtotalSum = 0;
    // console.log('Raw services data received:', services); 
    if (Array.isArray(services)) {
      services.forEach(service => {
        // console.log('Processing service item:', service); 
        const name = service.name || 'Serviço sem nome';
        const quantity = service.quantity || 0; 
        const unit_price = service.unit_price || 0; 
        const subtotal = quantity * unit_price; 
        dailySubtotalSum += subtotal; 
        
        serviceItems.push({ 
            name: name, 
            quantity: quantity, 
            unit_price: unit_price, 
            subtotal: subtotal 
        });
      });

      if (serviceItems.length > 0) {
        serviceTableRowsHtml = serviceItems.map(item => `
          <tr>
            <td data-label="Item" style="padding: 10px; border-bottom: 1px solid #dee2e6;">${item.name}</td>
            <td data-label="Qtd" style="text-align: center; padding: 10px; border-bottom: 1px solid #dee2e6; width: 60px;">${item.quantity}</td>
            <td data-label="Preço Unit. (Diária)" style="text-align: right; padding: 10px; border-bottom: 1px solid #dee2e6; width: 120px;">${formatCurrency(item.unit_price)}</td>
            <td data-label="Subtotal (Diária)" style="text-align: right; padding: 10px; border-bottom: 1px solid #dee2e6; width: 120px;">${formatCurrency(item.subtotal)}</td>
          </tr>
        `).join('');
      }
    }
  };

  // Safely parse and process services
  if (quote.selected_services) {
      if (typeof quote.selected_services === 'string') {
          try {
              const parsedServices = JSON.parse(quote.selected_services);
              processServicesForTable(parsedServices);
          } catch (e) {
              // console.error('Error parsing selected_services:', e);
              serviceTableRowsHtml = '<tr><td colspan="4" style="padding: 10px; text-align: center; border-bottom: 1px solid #dee2e6;">Erro ao carregar serviços.</td></tr>';
          }
      } else if (Array.isArray(quote.selected_services)) {
          processServicesForTable(quote.selected_services);
      }
  }

  // --- Format other data safely (Remains the same) ---
  const proposalId = quote.id || 'N/A'; 
  const projectName = quote.project_name || 'Projeto sem nome';
  const clientName = quote.client_name || 'N/A';
  const clientCompany = quote.client_company || 'N/A';
  const clientEmail = quote.client_email || 'N/A';
  const clientPhone = quote.client_phone || 'N/A';
  const createdDate = formatDate(quote.created_at);
  const shootingStart = formatDate(quote.shooting_dates_start);
  const shootingEnd = formatDate(quote.shooting_dates_end);
  const daysCount = quote.days_count || 1; 
  const totalPrice = quote.total_price || formatCurrency(dailySubtotalSum * daysCount); 

  // LED Principal Data (Remains the same)
  const ledPWidth = quote.led_principal_width || 'N/A';
  const ledPHeight = quote.led_principal_height || 'N/A';
  const ledPCurvature = quote.led_principal_curvature !== null ? quote.led_principal_curvature : 'N/A';
  const ledPModules = quote.led_principal_modules || 'N/A';
  const ledPResolution = quote.led_principal_resolution || 'N/A';
  const ledPPixelsW = quote.led_principal_pixels_width || 'N/A';
  const ledPPixelsH = quote.led_principal_pixels_height || 'N/A';
  const ledPTotalPixels = quote.led_principal_total_pixels ? Number(quote.led_principal_total_pixels).toLocaleString('pt-BR') : 'N/A';
  const ledPPowerMax = quote.principal_power_max ? `${formatNumber(quote.principal_power_max)} W` : 'N/A'; 
  const ledPPowerAvg = quote.principal_power_avg ? `${formatNumber(quote.principal_power_avg)} W` : 'N/A'; 
  const ledPWeight = quote.principal_weight ? `${formatNumber(quote.principal_weight)} kg` : 'N/A';   

  // LED Teto Data (Remains the same)
  const hasTetoLed = !!quote.led_teto_width; 
  const ledTWidth = quote.led_teto_width || 'N/A';
  const ledTHeight = quote.led_teto_height || 'N/A';
  const ledTModules = quote.led_teto_modules || 'N/A';
  const ledTResolution = quote.led_teto_resolution || 'N/A';
  const ledTPixelsW = quote.led_teto_pixels_width || 'N/A';
  const ledTPixelsH = quote.led_teto_pixels_height || 'N/A';
  const ledTTotalPixels = quote.led_teto_total_pixels ? Number(quote.led_teto_total_pixels).toLocaleString('pt-BR') : 'N/A';
  const ledTPowerMax = quote.teto_power_max ? `${formatNumber(quote.teto_power_max)} W` : 'N/A';
  const ledTPowerAvg = quote.teto_power_avg ? `${formatNumber(quote.teto_power_avg)} W` : 'N/A'; 
  const ledTWeight = quote.teto_weight ? `${formatNumber(quote.teto_weight)} kg` : 'N/A';   

  // --- Build Modal HTML - RESTORING ORIGINAL STRUCTURE WITH UPDATED TABLE/TOTAL ---
  modalContent.innerHTML = `
    <div id="quote-details-content-wrapper" style="background-color: #f8f9fa; border-radius: 8px; padding: 25px; max-width: 900px; margin: 20px auto; box-shadow: 0 4px 15px rgba(0,0,0,0.1); position: relative;"> <!-- Wrapper for styling -->
        <button id="quote-details-close-btn" class="modal-close-btn" aria-label="Fechar" style="position: absolute; top: 15px; right: 15px; background: none; border: none; font-size: 1.8rem; cursor: pointer; color: #6c757d;">&times;</button>

        <div class="modal-header-flex" style="display: flex; align-items: center; gap: 20px; margin-bottom: 25px; border-bottom: 1px solid #dee2e6; padding-bottom: 15px;">
            <img src="https://onav.com.br/img/on+av_logo_v3.png" alt="ON+AV Logo" style="height: 40px; width: auto;">
            <h2 id="quote-details-project-name" style="margin: 0; font-size: 1.5rem; color: #343a40; margin-left: auto;">Detalhes: ${projectName}</h2>
        </div>

        <div class="section" style="margin-bottom: 25px;">
          <div class="card-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px;">
            <div class="card" style="background-color: #fff; border: 1px solid #e9ecef; border-radius: 6px; padding: 20px; box-shadow: 0 2px 5px rgba(0,0,0,0.05);">
              <h3 style="margin-top: 0; margin-bottom: 15px; font-size: 1.2rem; color: #495057;">Informações do Cliente</h3>
              <p style="margin: 5px 0; font-size: 0.95rem; color: #6c757d;"><strong>Nome:</strong> <span id="quote-details-client-name">${clientName}</span></p>
              <p style="margin: 5px 0; font-size: 0.95rem; color: #6c757d;"><strong>Empresa:</strong> <span id="quote-details-client-company">${clientCompany}</span></p>
              <p style="margin: 5px 0; font-size: 0.95rem; color: #6c757d;"><strong>Email:</strong> <span id="quote-details-client-email">${clientEmail}</span></p>
              <p style="margin: 5px 0; font-size: 0.95rem; color: #6c757d;"><strong>Telefone:</strong> <span id="quote-details-client-phone">${clientPhone}</span></p>
            </div>

            <div class="card" style="background-color: #fff; border: 1px solid #e9ecef; border-radius: 6px; padding: 20px; box-shadow: 0 2px 5px rgba(0,0,0,0.05);">
              <h3 style="margin-top: 0; margin-bottom: 15px; font-size: 1.2rem; color: #495057;">Detalhes do Projeto</h3>
              <p style="margin: 5px 0; font-size: 0.95rem; color: #6c757d;"><strong>Data da Proposta:</strong> <span id="quote-details-created-date">${createdDate}</span></p>
              <p style="margin: 5px 0; font-size: 0.95rem; color: #6c757d;"><strong>Período de Filmagem:</strong> <span id="quote-details-shooting-dates">${shootingStart} – ${shootingEnd}</span></p>
              <p style="margin: 5px 0; font-size: 0.95rem; color: #6c757d;"><strong>Duração:</strong> <span id="quote-details-days-count">${daysCount}</span> dia(s)</p>
              <p style="margin: 5px 0; font-size: 0.95rem; color: #6c757d;"><strong>Numero do orçamento:</strong> <span id="quote-details-proposal-id">${proposalId}</span></p>
            </div>
          </div>
        </div>

        <div class="section" style="margin-bottom: 25px;">
          <h3 style="margin-top: 0; margin-bottom: 15px; font-size: 1.3rem; color: #343a40;">Configuração do LED</h3>
          <div class="card-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px;">
            <div class="card" id="led-principal-card" style="background-color: #fff; border: 1px solid #e9ecef; border-radius: 6px; padding: 20px; box-shadow: 0 2px 5px rgba(0,0,0,0.05);">
              <h4 style="margin-top: 0; margin-bottom: 15px; font-size: 1.1rem; color: #495057;">LED Principal</h4>
              <p style="margin: 5px 0; font-size: 0.95rem; color: #6c757d;"><strong>Dimensões:</strong> <span id="led-principal-dimensions">${ledPWidth}</span>&nbsp;m × <span id="led-principal-height">${ledPHeight}</span>&nbsp;m</p>
              <p style="margin: 5px 0; font-size: 0.95rem; color: #6c757d;"><strong>Curvatura:</strong> <span id="led-principal-curvature">${ledPCurvature}</span>°</p>
              <p style="margin: 5px 0; font-size: 0.95rem; color: #6c757d;"><strong>Módulos:</strong> <span id="led-principal-modules">${formatNumber(ledPModules)}</span></p>
              <p style="margin: 5px 0; font-size: 0.95rem; color: #6c757d;"><strong>Resolução:</strong> <span id="led-principal-resolution">${ledPResolution}</span></p>
              <p style="margin: 5px 0; font-size: 0.95rem; color: #6c757d;"><strong>Pixels (L×A):</strong> <span id="led-principal-pixels-wh">${formatNumber(ledPPixelsW)}</span> × <span id="led-principal-pixels-h">${formatNumber(ledPPixelsH)}</span> (<span id="led-principal-total-pixels">${ledPTotalPixels}</span> total)</p>
              <p style="margin: 5px 0; font-size: 0.95rem; color: #6c757d;"><strong>Potência Máx./Média:</strong> <span id="led-principal-power">${ledPPowerMax}</span> / <span id="led-principal-power-avg">${ledPPowerAvg}</span></p>
              <p style="margin: 5px 0; font-size: 0.95rem; color: #6c757d;"><strong>Peso:</strong> <span id="led-principal-weight">${ledPWeight}</span></p>
            </div>

            ${hasTetoLed ? `
            <div class="card" id="led-teto-card" style="background-color: #fff; border: 1px solid #e9ecef; border-radius: 6px; padding: 20px; box-shadow: 0 2px 5px rgba(0,0,0,0.05);">
              <h4 style="margin-top: 0; margin-bottom: 15px; font-size: 1.1rem; color: #495057;">LED Teto</h4>
              <p style="margin: 5px 0; font-size: 0.95rem; color: #6c757d;"><strong>Dimensões:</strong> <span id="led-teto-dimensions">${ledTWidth}</span>&nbsp;m × <span id="led-teto-height">${ledTHeight}</span>&nbsp;m</p>
              <p style="margin: 5px 0; font-size: 0.95rem; color: #6c757d;"><strong>Módulos:</strong> <span id="led-teto-modules">${formatNumber(ledTModules)}</span></p>
              <p style="margin: 5px 0; font-size: 0.95rem; color: #6c757d;"><strong>Resolução:</strong> <span id="led-teto-resolution">${ledTResolution}</span></p>
              <p style="margin: 5px 0; font-size: 0.95rem; color: #6c757d;"><strong>Pixels (L×A):</strong> <span id="led-teto-pixels-wh">${formatNumber(ledTPixelsW)}</span> × <span id="led-teto-pixels-h">${formatNumber(ledTPixelsH)}</span> (<span id="led-teto-total-pixels">${ledTTotalPixels}</span> total)</p>
              <p style="margin: 5px 0; font-size: 0.95rem; color: #6c757d;"><strong>Potência Máx./Média:</strong> <span id="led-teto-power">${ledTPowerMax}</span> / <span id="led-teto-power-avg">${ledTPowerAvg}</span></p>
              <p style="margin: 5px 0; font-size: 0.95rem; color: #6c757d;"><strong>Peso:</strong> <span id="led-teto-weight">${ledTWeight}</span></p>
            </div>
            ` : ''}
          </div>
        </div>

        <div class="section" style="margin-bottom: 25px;">
          <div class="card" style="background-color: #fff; border: 1px solid #e9ecef; border-radius: 6px; padding: 20px; box-shadow: 0 2px 5px rgba(0,0,0,0.05); overflow-x: auto;"> <!-- Wrap table in a card -->
            <h3 style="margin-top: 0; margin-bottom: 15px; font-size: 1.2rem; color: #495057;">Serviços Incluídos (Valores Diários)</h3>
            <!-- UPDATED TABLE STRUCTURE -->
            <table class="service-table" style="width: 100%; border-collapse: collapse; font-size: 0.9rem;">
               <thead style="background-color: #e9ecef;">
                  <tr>
                     <th style="text-align: left; padding: 10px; border-bottom: 2px solid #dee2e6;">Item</th>
                     <th style="text-align: center; padding: 10px; border-bottom: 2px solid #dee2e6; width: 60px;">Qtd</th>
                     <th style="text-align: right; padding: 10px; border-bottom: 2px solid #dee2e6; width: 120px;">Preço Unit. (Diária)</th>
                     <th style="text-align: right; padding: 10px; border-bottom: 2px solid #dee2e6; width: 120px;">Subtotal (Diária)</th>
                  </tr>
               </thead>
               <tbody id="quote-details-services-tbody" style="color: #6c757d;">
                  ${serviceTableRowsHtml} <!-- Correctly generated rows -->
               </tbody>
            </table>
          </div>
        </div>

        <!-- UPDATED TOTAL DISPLAY -->
        <div class="section" style="margin-bottom: 25px;">
          <div class="total-line" style="display: flex; justify-content: flex-end; align-items: center; padding-top: 15px; border-top: 1px solid #dee2e6; font-size: 1.2rem; font-weight: bold; color: #343a40;">
            <span style="margin-right: 15px;">Total Estimado (${daysCount} ${daysCount > 1 ? 'dias' : 'dia'}):</span>
            <span id="quote-details-total-price">${totalPrice}</span>
          </div>
        </div>

        <div class="section approval-section" style="text-align: center; margin-top: 30px;">
           <button id="approve-quote-btn" class="form-submit" data-proposal-id="${proposalId}" style="padding: 12px 25px; font-size: 1rem; color: #fff; background-color: #28a745; border: none; border-radius: 5px; cursor: pointer; transition: background-color 0.2s ease;">Aprovar Orçamento</button>
        </div>

    </div> <!-- End of quote-details-content-wrapper -->
  `; // End of modalContent.innerHTML

  // Show the modal
  document.body.style.overflow = 'hidden'; // Prevent body scroll WHILE modal is open
  detailsModal.style.display = 'flex'; // Use flex to help with centering defined in setupQuoteDetailsModal

  // --- Add event listeners *after* setting innerHTML --- 
  const closeButton = modalContent.querySelector('#quote-details-close-btn');
  if (closeButton) {
    // Clone and replace to ensure no duplicate listeners
     const newCloseBtn = closeButton.cloneNode(true);
     closeButton.parentNode.replaceChild(newCloseBtn, closeButton);

    newCloseBtn.addEventListener('click', () => {
      detailsModal.style.display = 'none';
      document.body.style.overflow = ''; // Restore body scroll on close
    });
  }

  // Add approval button functionality (if needed/exists)
  const approveButton = modalContent.querySelector('#approve-quote-btn');
  if (approveButton) {
      // Clone and replace to ensure no duplicate listeners
      const newApproveBtn = approveButton.cloneNode(true);
      approveButton.parentNode.replaceChild(newApproveBtn, approveButton);
      
      newApproveBtn.addEventListener('click', async (event) => {
          const proposalIdToApprove = event.target.dataset.proposalId;
          alert(`Funcionalidade de aprovar proposta (${proposalIdToApprove}) ainda não implementada.`);
          // TODO: Implement approval logic - call Supabase function or update status
          // e.g., await window.quoteService.updateProposalStatus(proposalId, 'approved');
          // Close modal and refresh list?
      });
  }
}

// Make sure setupQuoteDetailsModal exists and correctly sets up the #quote-details-modal container
// Added checks and ensure the content div is correctly targeted/created.
function setupQuoteDetailsModal() {
    let modal = document.getElementById('quote-details-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'quote-details-modal';
        // Basic modal styling (should ideally be in CSS)
        modal.style.position = 'fixed';
        modal.style.zIndex = '1000';
        modal.style.left = '0';
        modal.style.top = '0';
        modal.style.width = '100%';
        modal.style.height = '100%';
        modal.style.overflow = 'hidden'; 
        modal.style.backgroundColor = 'rgba(0,0,0,0.6)'; 
        modal.style.justifyContent = 'center'; 
        modal.style.alignItems = 'center'; 
        modal.style.padding = '20px'; 
        modal.style.boxSizing = 'border-box';

        // Create the content container *inside* the modal overlay
        const contentDiv = document.createElement('div');
        contentDiv.id = 'quote-details-content'; 
        // Styles for the content container itself (like max-width, background) should be handled by the CSS
        // for #quote-details-content-wrapper which is *inside* this innerHTML
        contentDiv.style.width = '100%'; 
        contentDiv.style.maxHeight = '100%'; 
        contentDiv.style.overflowY = 'auto'; 

        modal.appendChild(contentDiv);
        document.body.appendChild(modal);

        // Close modal if clicked on the overlay (outside the content wrapper)
        modal.addEventListener('click', (event) => {
            // Check if the click target is the modal overlay itself
            if (event.target === modal) {
                modal.style.display = 'none';
                document.body.style.overflow = ''; 
            }
        });
    }
}

/**
 * Format a number as a currency
 * @param {number} value - The value to format
 * @returns {string} - Formatted currency string
 */
function formatCurrency(value) {
  // Ensure the value is a number and default to 0 if not
  let numberValue;
  
  // If the value already has the R$ prefix, extract the number
  if (typeof value === 'string' && value.trim().startsWith('R$')) {
    const numStr = value.replace('R$', '').trim();
    numberValue = parseFloat(numStr.replace(/\./g, '').replace(',', '.'));
  } else {
    numberValue = Number(value);
  }
  
  if (isNaN(numberValue)) {
    // console.warn('Invalid currency value:', value);
    return 'R$ 0,00';
  }
  
  // Use proper Brazilian Portuguese format
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2
  }).format(numberValue);
}

/**
 * Show login prompt when user is not authenticated
 */
function showLoginPrompt() {
  const container = document.getElementById('quotes-container');
  if (!container) return;
  
  container.innerHTML = `
    <div class="login-prompt">
      <h2>Acesso Restrito</h2>
      <p>Você precisa estar logado para ver suas propostas.</p>
      <a href="login.html" class="login-button">Fazer Login</a>
    </div>
  `;
}
