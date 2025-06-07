// Function to fetch prices from the server
async function fetchPrices() {
  try {
    const response = await fetch('/api/products');
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const products = await response.json();
    // Convert the array of products into an object where the key is the product name
    const prices = products.reduce((acc, product) => {
      acc[product.name] = product.price;
      return acc;
    }, {});
    return prices;
  } catch (error) {
    console.error('Error fetching prices:', error);
    return {}; // Return an empty object in case of error
  }
}

// Function to update the proposal summary in the modal
async function updateProposalSummary(getPrice) {
  console.log('Updating proposal summary...');
  
  // Update the LED configuration details
  const width = document.getElementById('width-value')?.textContent || '20';
  const height = document.getElementById('height-value')?.textContent || '5';
  const curvature = document.getElementById('curvature-value')?.textContent || '5';
  const moduleCount = document.getElementById('module-count')?.textContent || '400';
  const tetoModuleCount = document.getElementById('teto-module-count')?.textContent || '192';
  
  // Update the summary elements directly
  if (document.getElementById('summary-led-principal-size')) {
    document.getElementById('summary-led-principal-size').textContent = `${width}x${height}m`;
  }
  
  if (document.getElementById('summary-led-principal-curvature')) {
    document.getElementById('summary-led-principal-curvature').textContent = curvature ? `(${curvature} curvatura)` : '';
  }
  
  if (document.getElementById('summary-led-principal-modules')) {
    document.getElementById('summary-led-principal-modules').textContent = moduleCount;
  }
  
  if (document.getElementById('summary-led-principal-resolution')) {
    // Resolution calculation (assuming each module is 192x192 pixels)
    const pixelsWidth = parseInt(width) * 384;
    const pixelsHeight = parseInt(height) * 384;
    const totalPixels = pixelsWidth * pixelsHeight;
    
    // Update resolution and pixels separately
    document.getElementById('summary-led-principal-resolution').textContent = `${pixelsWidth}×${pixelsHeight}`;
    if (document.getElementById('summary-led-principal-pixels')) {
      document.getElementById('summary-led-principal-pixels').textContent = totalPixels.toLocaleString('pt-BR');
    }
  }
  
  if (document.getElementById('summary-led-teto-size')) {
    document.getElementById('summary-led-teto-size').textContent = '8x6m';
  }
  
  if (document.getElementById('summary-led-teto-modules')) {
    document.getElementById('summary-led-teto-modules').textContent = tetoModuleCount;
  }
  
  if (document.getElementById('summary-led-teto-resolution')) {
    // Resolution calculation for teto (assuming each module is 192x192 pixels)
    const pixelsWidth = 8 * 384;
    const pixelsHeight = 6 * 384;
    const totalPixels = pixelsWidth * pixelsHeight;
    
    // Update resolution and pixels separately
    document.getElementById('summary-led-teto-resolution').textContent = `${pixelsWidth}×${pixelsHeight}`;
    if (document.getElementById('summary-led-teto-pixels')) {
      document.getElementById('summary-led-teto-pixels').textContent = totalPixels.toLocaleString('pt-BR');
    }
  }
  
  // Process all service selections and calculate the total
  console.log('Processing services...');
  // await processServices(getPrice); // Removed call to undefined function
}

/* Function to update shopping cart summary based on pricing pods */
function updateShoppingCart(getPrice) {
  // This function is now handled by quoteCartModal
}

// Handle DOM content loaded
document.addEventListener('DOMContentLoaded', () => {
  const startDateInput = document.getElementById('shooting-dates-start');
  const endDateInput = document.getElementById('shooting-dates-end');
  const proposalBtn = document.getElementById('proposal-btn');
  const modal = document.getElementById('proposal-modal');
  const closeBtn = modal?.querySelector('.close-button');

  if (startDateInput) {
    startDateInput.addEventListener('change', () => updateProposalSummary().catch(console.error));
    startDateInput.addEventListener('input', () => updateProposalSummary().catch(console.error));
    startDateInput.addEventListener('keyup', () => updateProposalSummary().catch(console.error));
  }
  
  if (endDateInput) {
    endDateInput.addEventListener('change', () => updateProposalSummary().catch(console.error)); 
    endDateInput.addEventListener('input', () => updateProposalSummary().catch(console.error));
    endDateInput.addEventListener('keyup', () => updateProposalSummary().catch(console.error));
  }

  // QuoteCartModal instantiation moved back to index.optimized.html

  console.log('[modal-summary.js] DOMContentLoaded fired.');
  // Button listener attachment moved to index.optimized.html to ensure button exists
  // Extra closing brace removed here

  // Listen for the 'updateProposalSummary' custom event
  document.addEventListener('updateProposalSummary', async () => {
    await updateProposalSummary(); 
    // Replace call to non-existent function with the correct modal update method
    // addEquipamentosSubtotal(); 
    if (window.quoteCartModal && typeof window.quoteCartModal.updateCart === 'function') {
        console.log('[modal-summary.js] Triggering quoteCartModal.updateCart()');
        await window.quoteCartModal.updateCart(); // Trigger update in QuoteCartModal instance
    } else {
        console.error('[modal-summary.js] window.quoteCartModal or its updateCart method not found!');
    }
    // Calls to removed subtotal functions removed
  });

  // Update proposal summary when the document is loaded
  updateProposalSummary().catch(console.error);

  // Add event listener for the review button  
  document.getElementById('review-btn')?.addEventListener('click', () => {
    updateProposalSummary().catch(console.error);
  });

  // Debug log to check initial value
  setTimeout(() => {
    // Trigger an update of the proposal summary on page load
    updateProposalSummary().catch(console.error);
  }, 1000);
});
