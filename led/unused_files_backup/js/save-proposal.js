// Function to save proposal data to Supabase
async function saveProposalToSupabase() {
  // Get all the data from the proposal modal
  const projectName = document.getElementById('project-name')?.value || '';
  
  // Dates
  const shootingDatesStart = document.getElementById('shooting-dates-start')?.value || null;
  const shootingDatesEnd = document.getElementById('shooting-dates-end')?.value || null;
  
  // Parse dates to standard format
  function parseDate(dateStr) {
    if (!dateStr) return null;
    
    if (dateStr.includes('/')) {
      // Format: dd/mm/yyyy
      const [day, month, year] = dateStr.split('/').map(Number);
      return `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
    } else if (dateStr.includes('-')) {
      // Format: yyyy-mm-dd already in correct format
      return dateStr;
    }
    return null;
  }
  
  const parsedStartDate = parseDate(shootingDatesStart);
  const parsedEndDate = parseDate(shootingDatesEnd);
  
  // Calculate days count
  const dayCount = getSelectedDays(); // uses the existing function from modal-summary.js
  console.log('dayCount:', dayCount);
  
  // LED Principal details
  const ledPrincipalWidth = parseFloat(document.getElementById('led-width')?.textContent || '20');
  const ledPrincipalHeight = parseFloat(document.getElementById('led-height')?.textContent || '5');
  const ledPrincipalCurvature = parseInt(document.getElementById('led-curvature')?.textContent || '5');
  const ledPrincipalModules = parseInt(document.getElementById('module-count')?.textContent || '400');
  
  // LED Principal resolution
  const ledPrincipalPixelsWidth = ledPrincipalWidth * 384;
  const ledPrincipalPixelsHeight = ledPrincipalHeight * 384;
  const ledPrincipalTotalPixels = ledPrincipalPixelsWidth * ledPrincipalPixelsHeight;
  const ledPrincipalResolution = `${ledPrincipalPixelsWidth}×${ledPrincipalPixelsHeight} (${ledPrincipalTotalPixels.toLocaleString('pt-BR')} pixels)`;
  
  // LED Teto details
  const ledTetoWidth = 8;
  const ledTetoHeight = 6;
  const ledTetoModules = parseInt(document.getElementById('teto-module-count')?.textContent || '192');
  
  // LED Teto resolution
  const ledTetoPixelsWidth = ledTetoWidth * 384;
  const ledTetoPixelsHeight = ledTetoHeight * 384;
  const ledTetoTotalPixels = ledTetoPixelsWidth * ledTetoPixelsHeight;
  const ledTetoResolution = `${ledTetoPixelsWidth}×${ledTetoPixelsHeight} (${ledTetoTotalPixels.toLocaleString('pt-BR')} pixels)`;
  
  // Get selected pod type (2D or 3D)
  const selectedPodType = document.getElementById('selected-pod-type')?.value || '3d';
  
  // Disguise prices - use default values if elements not found
  const disguiseTotal = parsePrice(document.getElementById('summary-disguise-total')?.textContent) || 112540;
  const disguiseModulesLed = parsePrice(document.getElementById('summary-modules-led-price')?.textContent) || 71040;
  const disguiseMx40Pro = parsePrice(document.getElementById('summary-mx40-pro-price')?.textContent) || 4000;
  const disguiseVx4n = parsePrice(document.getElementById('summary-vx4n-price')?.textContent) || 10000;
  const disguiseRxii = parsePrice(document.getElementById('summary-rxii-price')?.textContent) || 22500;
  const disguiseTracking = parsePrice(document.getElementById('summary-tracking-price')?.textContent) || 5000;
  
  // Debug info
  console.log('Disguise prices:', { 
    disguiseTotal, 
    disguiseModulesLed, 
    disguiseMx40Pro, 
    disguiseVx4n, 
    disguiseRxii, 
    disguiseTracking 
  });
  
  // Rube Draco prices
  const cinebotPrice = document.getElementById('cinebot-btn')?.classList.contains('selected') ? 45000 : 0;
  const trilhoPrice = document.getElementById('trilho-btn')?.classList.contains('selected') ? 5000 : 0;
  const komodoPrice = document.getElementById('komodo-btn')?.classList.contains('selected') ? 1500 : 0;
  const rubeDracoTotal = cinebotPrice + trilhoPrice + komodoPrice;
  
  console.log('Rube Draco prices:', { cinebotPrice, trilhoPrice, komodoPrice, rubeDracoTotal });
  
  // Estudios
  const selectedEstudioBtn = document.querySelector('.studio-button.selected');
  const selectedStudioSize = selectedEstudioBtn ? 
    selectedEstudioBtn.getAttribute('data-studio-size') || '750m2' : '750m2';
  const estudiosTotal = selectedEstudioBtn ? 
    parseInt(selectedEstudioBtn.getAttribute('data-value')) : 15000;
  
  console.log('Estudios:', { selectedStudioSize, estudiosTotal });
  
  // Pricing information
  const oneDayTotal = Number(disguiseTotal) + Number(rubeDracoTotal) + Number(estudiosTotal);
  
  console.log('One day total:', oneDayTotal);
  
  // Simple calculation: day rate multiply by the number of days (no discounts)
  const dailyRate = Number(oneDayTotal);
  const finalTotal = dailyRate * Number(dayCount);
  const dayDescription = `${dayCount} dia(s)`;
  
  console.log('Final price calculation:', {
    oneDayTotal: dailyRate,
    dayCount,
    finalTotal,
    dayDescription
  });
  
  // Client information
  const clientName = document.getElementById('client-name')?.value || '';
  const clientCompany = document.getElementById('client-company')?.value || '';
  const clientEmail = document.getElementById('client-email')?.value || '';
  const clientPhone = document.getElementById('client-phone')?.value || '';
  
  // Debug pricing info
  console.log('Pricing calculations:', {
    dayCount,
    oneDayTotal,
    finalTotal
  });
  
  // Prepare the data object for Supabase
  const proposalData = {
    project_name: projectName,
    shooting_dates_start: parsedStartDate,
    shooting_dates_end: parsedEndDate,
    led_principal_width: Number(ledPrincipalWidth),
    led_principal_height: Number(ledPrincipalHeight),
    led_principal_curvature: Number(ledPrincipalCurvature),
    led_principal_modules: Number(ledPrincipalModules),
    led_principal_resolution: ledPrincipalResolution,
    led_principal_pixels_width: Number(ledPrincipalPixelsWidth),
    led_principal_pixels_height: Number(ledPrincipalPixelsHeight),
    led_principal_total_pixels: Number(ledPrincipalTotalPixels),
    led_teto_width: Number(ledTetoWidth),
    led_teto_height: Number(ledTetoHeight),
    led_teto_modules: Number(ledTetoModules),
    led_teto_pixels_width: Number(ledTetoPixelsWidth),
    led_teto_pixels_height: Number(ledTetoPixelsHeight),
    led_teto_total_pixels: Number(ledTetoTotalPixels),
    selected_pod_type: selectedPodType,
    price_disguise_total: Number(disguiseTotal),
    price_disguise_modules_led: Number(disguiseModulesLed),
    price_disguise_mx40_pro: Number(disguiseMx40Pro),
    price_disguise_vx4n: Number(disguiseVx4n),
    price_rxii: Number(disguiseRxii),
    price_tracking: Number(disguiseTracking),
    price_cinebot: Number(cinebotPrice),
    price_trilho: Number(trilhoPrice),
    price_komodo: Number(komodoPrice),
    selected_studio_size: selectedStudioSize,
    total_price_3d: Number(disguiseTotal),
    total_price_rube_draco: Number(rubeDracoTotal),
    total_price_estudios: Number(estudiosTotal),
    days_count: Number(dayCount),
    discount_percentage: 0,
    discount_description: '',
    daily_rate: Number(oneDayTotal),
    discounted_daily_rate: Number(oneDayTotal),
    total_price: Number(finalTotal),
    client_name: clientName,
    client_company: clientCompany,
    client_email: clientEmail,
    client_phone: clientPhone,
    status: 'pending'
  };
  
  console.log('Saving proposal with data:', proposalData);
  
  try {
    // Send data to Supabase
    const { data, error } = await supabase
      .from('quotes')
      .insert([proposalData])
      .select(); // Add this to get the inserted record with its UUID
    
    if (error) {
      console.error('Error saving proposal:', error);
      return { success: false, error };
    }
    
    // Get the UUID of the newly created record
    const newProposalId = data && data.length > 0 ? data[0].id : null;
    console.log('Proposal saved successfully with ID:', newProposalId);
    
    return { success: true, data, id: newProposalId };
  } catch (err) {
    console.error('Exception saving proposal:', err);
    return { success: false, error: err };
  }
}

// Helper function to parse price from formatted string
function parsePrice(priceString) {
  if (!priceString) return 0;
  
  // Remove currency symbol and any non-numeric characters except . and ,
  const cleaned = priceString.replace(/[^0-9.,]/g, '');
  
  // Replace dots as thousand separators and comma as decimal separator
  return parseFloat(cleaned.replace(/\./g, '').replace(',', '.'));
}

// Add event listener to save button
document.addEventListener('DOMContentLoaded', function() {
  const requestProposalBtn = document.getElementById('request-proposal-btn');
  
  if (requestProposalBtn) {
    requestProposalBtn.addEventListener('click', async function() {
      // Show loading indicator
      requestProposalBtn.textContent = 'Salvando...';
      requestProposalBtn.disabled = true;
      
      try {
        const result = await saveProposalToSupabase();
        
        if (result.success) {
          // Show success message with proposal ID if available
          const proposalId = result.id ? ` (ID: ${result.id})` : '';
          alert(`Proposta salva com sucesso!${proposalId}`);
          
          // Close the proposal modal
          const proposalModal = document.getElementById('proposal-modal');
          if (proposalModal) {
            proposalModal.style.display = 'none';
          }
        } else {
          // Show error message
          alert('Erro ao salvar proposta. Por favor, tente novamente.');
        }
      } catch (err) {
        console.error('Error in save process:', err);
        alert('Erro ao salvar proposta. Por favor, tente novamente.');
      } finally {
        // Reset button
        requestProposalBtn.textContent = 'Requisitar Proposta';
        requestProposalBtn.disabled = false;
      }
    });
  }
});
