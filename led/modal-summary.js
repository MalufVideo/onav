// led/modal-summary.js
// Uses shared-utils.js: ledLog

// Update the proposal summary elements (LED config details)
async function updateProposalSummary() {
  ledLog('[modal-summary] Updating proposal summary...');

  // Read current values from DOM (set by led-wall.js)
  const width = document.getElementById('width-value')?.textContent || '16';
  const height = document.getElementById('height-value')?.textContent || '5';
  const curvature = document.getElementById('curvature-value')?.textContent || '5';
  const moduleCount = document.getElementById('module-count')?.textContent || '0';
  const tetoModuleCount = document.getElementById('teto-module-count')?.textContent || '0';

  // Read teto dimensions from DOM (not hardcoded)
  const tetoWidth = document.getElementById('roof-width-value')?.textContent || '0';
  const tetoHeight = document.getElementById('roof-height-value')?.textContent || '0';

  // Update summary elements if they exist
  const setEl = (id, text) => {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
  };

  setEl('summary-led-principal-size', `${width}x${height}m`);
  setEl('summary-led-principal-curvature', curvature ? `(${curvature} curvatura)` : '');
  setEl('summary-led-principal-modules', moduleCount);

  // Resolution calculation for principal (each module is 0.5m, pixel pitch ~1.3mm => 384px per meter)
  if (document.getElementById('summary-led-principal-resolution')) {
    const pixelsWidth = parseInt(width) * 384;
    const pixelsHeight = parseInt(height) * 384;
    setEl('summary-led-principal-resolution', `${pixelsWidth}×${pixelsHeight}`);
    setEl('summary-led-principal-pixels', (pixelsWidth * pixelsHeight).toLocaleString('pt-BR'));
  }

  // Teto summary — read from DOM, not hardcoded
  setEl('summary-led-teto-size', `${tetoWidth}x${tetoHeight}m`);
  setEl('summary-led-teto-modules', tetoModuleCount);

  if (document.getElementById('summary-led-teto-resolution')) {
    const tW = parseInt(tetoWidth) || 0;
    const tH = parseInt(tetoHeight) || 0;
    const pixelsWidth = tW * 384;
    const pixelsHeight = tH * 384;
    setEl('summary-led-teto-resolution', `${pixelsWidth}×${pixelsHeight}`);
    setEl('summary-led-teto-pixels', (pixelsWidth * pixelsHeight).toLocaleString('pt-BR'));
  }
}

// Handle DOM content loaded
document.addEventListener('DOMContentLoaded', () => {
  const startDateInput = document.getElementById('shooting-dates-start');
  const endDateInput = document.getElementById('shooting-dates-end');

  // Update summary when dates change
  if (startDateInput) {
    startDateInput.addEventListener('change', () => updateProposalSummary().catch(console.error));
  }
  if (endDateInput) {
    endDateInput.addEventListener('change', () => updateProposalSummary().catch(console.error));
  }

  // Listen for the 'updateProposalSummary' custom event (dispatched by led-wall.js)
  document.addEventListener('updateProposalSummary', async () => {
    await updateProposalSummary();
    if (window.quoteCartModal && typeof window.quoteCartModal.updateCart === 'function') {
      ledLog('[modal-summary] Triggering quoteCartModal.updateCart()');
      await window.quoteCartModal.updateCart();
    }
  });

  // Initial update
  updateProposalSummary().catch(console.error);
});
