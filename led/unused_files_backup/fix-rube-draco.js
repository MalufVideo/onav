// Fix for Rube Draco pricing issues

// Wait for page to load
document.addEventListener('DOMContentLoaded', function() {
  console.log('Applying Rube Draco pricing fixes...');
  
  // Fix formatCurrency function to handle zero values
  window.fixedFormatCurrency = function(value) {
    // If value is already a string with R$ prefix, extract the number
    let number;
    
    if (typeof value === 'string' && value.trim().startsWith('R$')) {
      const numStr = value.replace('R$', '').trim();
      number = parseFloat(numStr.replace(/\./g, '').replace(',', '.'));
    } else {
      number = typeof value === 'string' ? 
        parseFloat(value.replace(/\./g, '').replace(',', '.')) : value;
    }
    
    if (isNaN(number)) {
      console.warn('Invalid currency value:', value);
      return 'R$ 0,00';
    }
    
    // Ensure we display cents for zero values
    if (number === 0) {
      return 'R$ 0,00';
    }
    
    // Format with thousands separator and two decimal places
    return `R$ ${number.toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
  };
  
  // Enhanced updateProposalSummary function
  const originalUpdateProposalSummary = window.updateProposalSummary || (() => {});
  
  window.updateProposalSummary = function() {
    // Call the original function if it exists
    if (typeof originalUpdateProposalSummary === 'function') {
      originalUpdateProposalSummary();
    }
    
    console.log('Updating Rube Draco and Estúdios pricing...');
    
    // 2. RUBE DRACO SERVICES
    let rubeDracoTotal = 0;
    
    // Hide all Rube Draco options by default
    document.getElementById('rube-draco-option-cinebot').style.display = 'none';
    document.getElementById('rube-draco-option-trilho').style.display = 'none';
    document.getElementById('rube-draco-option-komodo').style.display = 'none';
    
    // Initialize all Rube Draco price elements to zero first
    if (document.getElementById('summary-cinebot-price')) {
      document.getElementById('summary-cinebot-price').textContent = 'R$ 0,00';
    }
    if (document.getElementById('summary-trilho-price')) {
      document.getElementById('summary-trilho-price').textContent = 'R$ 0,00';
    }
    if (document.getElementById('summary-komodo-price')) {
      document.getElementById('summary-komodo-price').textContent = 'R$ 0,00';
    }
    
    // Check which Rube Draco services are selected
    if (document.getElementById('cinebot-btn')?.classList.contains('selected')) {
      // Updated to use the value from the button instead of hardcoded value
      const cinebotBtn = document.getElementById('cinebot-btn');
      const cinebotPrice = parseInt(cinebotBtn.getAttribute('data-value') || 15000);
      if (document.getElementById('summary-cinebot-price')) {
        document.getElementById('summary-cinebot-price').textContent = window.fixedFormatCurrency(cinebotPrice);
      }
      rubeDracoTotal += cinebotPrice;
      // Show this option
      document.getElementById('rube-draco-option-cinebot').style.display = 'flex';
    }
    
    if (document.getElementById('trilho-btn')?.classList.contains('selected')) {
      // Updated to use the value from the button instead of hardcoded value
      const trilhoBtn = document.getElementById('trilho-btn');
      const trilhoPrice = parseInt(trilhoBtn.getAttribute('data-value') || 5000);
      if (document.getElementById('summary-trilho-price')) {
        document.getElementById('summary-trilho-price').textContent = window.fixedFormatCurrency(trilhoPrice);
      }
      rubeDracoTotal += trilhoPrice;
      // Show this option
      document.getElementById('rube-draco-option-trilho').style.display = 'flex';
    }
    
    if (document.getElementById('komodo-btn')?.classList.contains('selected')) {
      // Updated to use the value from the button instead of hardcoded value
      const komodoBtn = document.getElementById('komodo-btn');
      const komodoPrice = parseInt(komodoBtn.getAttribute('data-value') || 1500);
      if (document.getElementById('summary-komodo-price')) {
        document.getElementById('summary-komodo-price').textContent = window.fixedFormatCurrency(komodoPrice);
      }
      rubeDracoTotal += komodoPrice;
      // Show this option
      document.getElementById('rube-draco-option-komodo').style.display = 'flex';
    }
    
    // Update Rube Draco total
    if (document.getElementById('summary-rube-draco-total')) {
      document.getElementById('summary-rube-draco-total').textContent = window.fixedFormatCurrency(rubeDracoTotal);
    }
    
    // 3. ESTUDIOS SECTION
    let estudiosTotal = 0;
    
    // Hide all Estudio options by default
    document.getElementById('estudio-option-750').style.display = 'none';
    document.getElementById('estudio-option-350').style.display = 'none';
    document.getElementById('estudio-option-100').style.display = 'none';
    
    const selectedEstudioBtn = document.querySelector('#card-estudios .studio-button.selected');
    
    if (selectedEstudioBtn) {
      const estudioValue = parseFloat(selectedEstudioBtn.getAttribute('data-value')) || 0;
      const estudioId = selectedEstudioBtn.getAttribute('data-studio');
      
      if (estudioId === '1') {
        // Estudio 1
        if (document.getElementById('summary-estudio1-price')) {
          document.getElementById('summary-estudio1-price').textContent = window.fixedFormatCurrency(estudioValue);
        }
        document.getElementById('estudio-option-750').style.display = 'flex';
      } else if (estudioId === '2') {
        // Estudio 2
        if (document.getElementById('summary-estudio2-price')) {
          document.getElementById('summary-estudio2-price').textContent = window.fixedFormatCurrency(estudioValue);
        }
        document.getElementById('estudio-option-350').style.display = 'flex';
      } else if (estudioId === '3') {
        // Estudio 3
        if (document.getElementById('summary-estudio3-price')) {
          document.getElementById('summary-estudio3-price').textContent = window.fixedFormatCurrency(estudioValue);
        }
        document.getElementById('estudio-option-100').style.display = 'flex';
      }
      
      estudiosTotal = estudioValue;
    }
    
    // Update estúdios total
    if (document.getElementById('summary-estudios-sp-total')) {
      document.getElementById('summary-estudios-sp-total').textContent = window.fixedFormatCurrency(estudiosTotal);
    }
  };
  
  // Fix quote-service.js saveQuote function to only use existing columns
  if (window.quoteService && window.quoteService.saveQuote) {
    const originalSaveQuote = window.quoteService.saveQuote;
    window.quoteService.saveQuote = async function(quoteData) {
      // Add Rube Draco pricing based on button selections
      const hasCinebot = document.getElementById('cinebot-btn')?.classList.contains('selected');
      const hasTrilho = document.getElementById('trilho-btn')?.classList.contains('selected');
      const hasKomodo = document.getElementById('komodo-btn')?.classList.contains('selected');
      
      const cinebotBtn = document.getElementById('cinebot-btn');
      const trilhoBtn = document.getElementById('trilho-btn');
      const komodoBtn = document.getElementById('komodo-btn');
      
      quoteData.price_cinebot = hasCinebot ? parseInt(cinebotBtn.getAttribute('data-value') || 15000) : 0;
      quoteData.price_trilho = hasTrilho ? parseInt(trilhoBtn.getAttribute('data-value') || 5000) : 0;
      quoteData.price_komodo = hasKomodo ? parseInt(komodoBtn.getAttribute('data-value') || 1500) : 0;
      quoteData.total_price_rube_draco = (hasCinebot ? parseInt(cinebotBtn.getAttribute('data-value') || 15000) : 0) + (hasTrilho ? parseInt(trilhoBtn.getAttribute('data-value') || 5000) : 0) + (hasKomodo ? parseInt(komodoBtn.getAttribute('data-value') || 1500) : 0);
      
      // Add Estudio pricing based on button selection
      const selectedEstudioBtn = document.querySelector('#card-estudios .studio-button.selected');
      if (selectedEstudioBtn) {
        const estudioValue = parseFloat(selectedEstudioBtn.getAttribute('data-value')) || 0;
        const estudioId = selectedEstudioBtn.getAttribute('data-studio');
        
        quoteData.selected_studio_size = estudioId;
        quoteData.total_price_estudios = estudioValue;
      } else {
        // Make sure we always set these values even when no studio is selected
        quoteData.selected_studio_size = '';
        quoteData.total_price_estudios = 0;
      }
      
      // Call the original save function
      return originalSaveQuote.call(this, quoteData);
    };
  }
  
  // Add event listeners for Rube Draco buttons to update pricing
  document.querySelectorAll('#card-rube-draco .studio-button').forEach(button => {
    button.addEventListener('click', () => {
      // Force update of proposal summary after button click
      setTimeout(() => {
        const event = new Event('updateProposalSummary');
        document.dispatchEvent(event);
      }, 50);
    });
  });
  
  // Add event listeners for Estudio buttons to update pricing
  document.querySelectorAll('#card-estudios .studio-button').forEach(button => {
    button.addEventListener('click', () => {
      // Force update of proposal summary after button click
      setTimeout(() => {
        const event = new Event('updateProposalSummary');
        document.dispatchEvent(event);
      }, 50);
    });
  });
  
  // Initial update
  const event = new Event('updateProposalSummary');
  document.dispatchEvent(event);
  
  console.log('Rube Draco pricing fixes applied successfully');
  
  // Fix date picker to automatically open Fim calendar after selecting Inicio date
  console.log('Fixing date picker behavior...');
  
  // Check if flatpickr is loaded and the date input exists
  if (typeof flatpickr !== 'undefined' && 
      document.getElementById('shooting-dates-start') && 
      document.getElementById('shooting-dates-end')) {
    
    // Get the current instances (if they exist)
    const startDatepicker = document.querySelector('#shooting-dates-start')._flatpickr;
    const endDatepicker = document.querySelector('#shooting-dates-end')._flatpickr;
    
    // If the datepickers exist, update the start date onChange handler
    if (startDatepicker && endDatepicker) {
      // Add our enhanced onChange handler to the start date
      startDatepicker.set('onChange', function(selectedDates, dateStr, instance) {
        console.log('Start date selected:', dateStr);
        
        // Make sure the end date is at least the same as start date
        endDatepicker.set('minDate', selectedDates[0]);
        
        // Add a slight delay before opening to ensure UI updates
        setTimeout(() => {
          // Open the end date picker
          endDatepicker.open();
          console.log('End date picker opened');
        }, 50);
      });
      
      console.log('Date picker behavior fixed successfully');
    } else {
      applyDatepickerFallback();
    }
  } else {
    applyDatepickerFallback();
  }
  
  // Fallback function for datepicker fix
  function applyDatepickerFallback() {
    console.warn('Could not find flatpickr instances for date pickers');
    
    // Fallback approach: reinitialize the datepickers
    try {
      console.log('Attempting to reinitialize date pickers...');
      
      // Get the input elements
      const startInput = document.getElementById('shooting-dates-start');
      const endInput = document.getElementById('shooting-dates-end');
      
      if (startInput && endInput && typeof flatpickr !== 'undefined') {
        // Reinitialize the start date picker
        flatpickr(startInput, {
          dateFormat: "d/m/Y",
          locale: "pt",
          allowInput: false,
          minDate: "today",
          onChange: function(selectedDates, dateStr, instance) {
            console.log('Start date selected (reinitialized):', dateStr);
            
            // Update end date min date
            const endFlatpickr = document.querySelector("#shooting-dates-end")._flatpickr;
            if (endFlatpickr) {
              endFlatpickr.set('minDate', selectedDates[0]);
            }
            
            // Open end date picker with delay
            setTimeout(() => {
              if (document.querySelector("#shooting-dates-end")._flatpickr) {
                document.querySelector("#shooting-dates-end")._flatpickr.open();
                console.log('End date picker opened (reinitialized)');
              }
            }, 50);
          }
        });
        
        // Reinitialize the end date picker
        flatpickr(endInput, {
          dateFormat: "d/m/Y",
          locale: "pt",
          allowInput: false,
          minDate: "today"
        });
        
        console.log('Date pickers reinitialized successfully');
      }
    } catch (error) {
      console.error('Error reinitializing date pickers:', error);
    }
  }
  
  // Helper function to get the number of days from date pickers
  function getSelectedDays() {
    const startDateInput = document.getElementById('shooting-dates-start');
    const endDateInput = document.getElementById('shooting-dates-end');
    
    // If either date is missing, default to 1 day
    if (!startDateInput || !endDateInput || !startDateInput.value || !endDateInput.value) {
      return 1;
    }
    
    try {
      // Parse dates (assuming format DD/MM/YYYY)
      const parts1 = startDateInput.value.split('/');
      const parts2 = endDateInput.value.split('/');
      
      if (parts1.length !== 3 || parts2.length !== 3) {
        return 1; // Invalid date format
      }
      
      const day1 = parseInt(parts1[0], 10);
      const month1 = parseInt(parts1[1], 10) - 1; // JS months are 0-based
      const year1 = parseInt(parts1[2], 10);
      
      const day2 = parseInt(parts2[0], 10);
      const month2 = parseInt(parts2[1], 10) - 1; // JS months are 0-based
      const year2 = parseInt(parts2[2], 10);
      
      const date1 = new Date(year1, month1, day1);
      const date2 = new Date(year2, month2, day2);
      
      // Calculate difference in days
      const diffTime = date2 - date1;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // +1 because we count both start and end days
      
      return diffDays > 0 ? diffDays : 1;
    } catch (error) {
      console.error('Error calculating days:', error);
      return 1; // Default to 1 day on error
    }
  }
});
