// Modal functionality
document.addEventListener('DOMContentLoaded', () => {
  const modal = document.getElementById('proposal-modal');
  const proposalBtn = document.getElementById('proposta-btn');
  const closeBtn = modal.querySelector('.modal-close');
  const form = document.getElementById('proposal-form');
  const prelightToggle = document.getElementById('prelight-toggle');
  const prelightDaysGroup = document.getElementById('prelight-days-group');
  const configSummary = document.getElementById('config-summary');

  // Handle prelight toggle
  prelightToggle?.addEventListener('change', () => {
    prelightDaysGroup.style.display = prelightToggle.checked ? 'block' : 'none';
  });

  // Update configuration summary when modal opens
  proposalBtn?.addEventListener('click', () => {
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
    
    // Update configuration summary
    const width = document.getElementById('width').value;
    const height = document.getElementById('height').value;
    const curvature = document.getElementById('curvature').value;
    const resolution = document.getElementById('resolution').textContent;
    const roofWidth = document.getElementById('roof-width').value;
    const roofHeight = document.getElementById('roof-height').value;
    const roofResolution = document.getElementById('teto-resolution').textContent;

    configSummary.innerHTML = '';
  });

  closeBtn?.addEventListener('click', () => {
    modal.classList.remove('active');
    document.body.style.overflow = '';
  });

  modal?.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.classList.remove('active');
      document.body.style.overflow = '';
    }
  });

  // Update slider value displays dynamically
  document.querySelectorAll('input[type="range"]').forEach(input => {
    const disp = document.getElementById(input.id + '-value');
    if (disp) {
      input.addEventListener('input', () => {
        disp.textContent = input.value;
      });
    }
  });

  // Function to update all subtotals
  function updateSubtotals() {
    // 2D prices (keeping this for compatibility)
    const modulePrice2D = parseFloat(document.getElementById('modules-price')?.textContent?.replace(/\./g, '').replace(',', '.') || '0');
    const processorPrice2D = parseFloat(document.getElementById('processors-price')?.textContent?.replace(/\./g, '').replace(',', '.') || '0');
    const serverPrice2D = parseFloat(document.getElementById('server-price')?.textContent?.replace(/\./g, '').replace(',', '.') || '0');
    const directorPrice2D = parseFloat(document.getElementById('director-price')?.textContent?.replace(/\./g, '').replace(',', '.') || '0');
    const base2DTotal = modulePrice2D + processorPrice2D + serverPrice2D + directorPrice2D;

    // Update 2D total if it exists
    if (document.getElementById('total-price')) {
      document.getElementById('total-price').textContent = base2DTotal.toLocaleString('pt-BR').replace(/,/g, '.');
    }
    
    // 3D prices
    const modulePrice = parseFloat(document.getElementById('modules-price-3d').textContent.replace(/\./g, '').replace(',', '.'));
    const processorPrice = parseFloat(document.getElementById('processors-price-3d').textContent.replace(/\./g, '').replace(',', '.'));
    const serverPrice = parseFloat(document.getElementById('server-price-3d').textContent.replace(/\./g, '').replace(',', '.'));
    
    // Get RXII units and calculate price
    const rxiiUnits = parseInt(document.getElementById('rxii-units-value').textContent) || 3;
    const rxiiUnitPrice = 7500; // Price per RXII unit
    const rxiiPrice = rxiiUnitPrice * rxiiUnits;
    
    const trackingPrice = parseFloat(document.getElementById('tracking-price').textContent.replace(/\./g, '').replace(',', '.'));
    
    // Update 3D total - manually calculate the sum
    const total3D = modulePrice + processorPrice + serverPrice + rxiiPrice + trackingPrice;
    document.getElementById('total-3d-price').textContent = total3D.toLocaleString('pt-BR').replace(/,/g, '.');
    
    // Rube Draco Pod subtotal
    let rubeDracoTotal = 0;
    const cinebotBtn = document.getElementById('cinebot-btn');
    const trilhoBtn = document.getElementById('trilho-btn');
    const komodoBtn = document.getElementById('komodo-btn');

    if (cinebotBtn?.classList.contains('selected')) {
      const cinebotPrice = parseInt(cinebotBtn.getAttribute('data-value') || 15000);
      rubeDracoTotal += cinebotPrice;
    }
    if (trilhoBtn?.classList.contains('selected')) {
      const trilhoPrice = parseInt(trilhoBtn.getAttribute('data-value') || 5000);
      rubeDracoTotal += trilhoPrice;
    }
    if (komodoBtn?.classList.contains('selected')) {
      const komodoPrice = parseInt(komodoBtn.getAttribute('data-value') || 1500);
      rubeDracoTotal += komodoPrice;
    }

    document.getElementById('rube-draco-total').textContent = rubeDracoTotal.toLocaleString('pt-BR').replace(/,/g, '.');

    // Estudios SP subtotal
    const estudioButtons = document.querySelectorAll('.studio-button[data-studio]');
    let estudiosTotal = 0;

    estudioButtons.forEach(button => {
      if (button.classList.contains('selected')) {
        estudiosTotal = parseInt(button.getAttribute('data-value'));
      }
    });

    document.getElementById('estudios-total').textContent = estudiosTotal.toLocaleString('pt-BR').replace(/,/g, '.');
  }

  // Add click handlers for Rube Draco buttons
  document.querySelectorAll('#card-rube-draco .studio-button').forEach(button => {
    button.addEventListener('click', () => {
      const wasSelected = button.classList.contains('selected');
      button.classList.toggle('selected');
      
      // Update the total based on selection state
      const buttonValue = parseInt(button.querySelector('span:last-child').textContent.replace(/[^0-9]/g, ''));
      let currentTotal = parseInt(document.getElementById('rube-draco-total').textContent.replace(/[^0-9]/g, '')) || 0;
      
      if (wasSelected) {
        currentTotal -= buttonValue; // Subtract if it was previously selected
      } else {
        currentTotal += buttonValue; // Add if it was previously unselected
      }
      
      document.getElementById('rube-draco-total').textContent = currentTotal.toLocaleString('pt-BR').replace(/,/g, '.');
      updateSubtotals();
    });
  });

  // Add click handlers for Estudios SP buttons
  document.querySelectorAll('#card-estudios .studio-button').forEach(button => {
    button.addEventListener('click', () => {
      // Remove selected class from all studio buttons
      document.querySelectorAll('#card-estudios .studio-button').forEach(btn => {
        btn.classList.remove('selected');
      });
      // Add selected class to clicked button
      button.classList.add('selected');
      updateSubtotals();
    });
  });

  // Initial update
  updateSubtotals();

  // Add event listeners for all inputs that affect pricing
  document.querySelectorAll('input[type="range"], .studio-button').forEach(input => {
    input.addEventListener('input', updateSubtotals);
    input.addEventListener('click', updateSubtotals);
  });

  // Studio button handlers
  document.querySelectorAll('.studio-button').forEach(button => {
    button.addEventListener('click', () => {
      const group = button.getAttribute('data-group');
      if (group) {
        // Remove selected class from buttons in the same group
        document.querySelectorAll(`.studio-button[data-group="${group}"]`).forEach(btn => {
          btn.classList.remove('selected');
        });
      }
      // Add selected class to clicked button
      button.classList.add('selected');
      // Update totals
      updateSubtotals();
    });
  });

  // Estudios São Paulo pricing calculations
  const estudioInputs = document.querySelectorAll('input[name="estudio"]');
  const estudiosTotal = document.getElementById('estudios-total');

  function updateEstudiosTotal() {
    const selectedEstudio = document.querySelector('input[name="estudio"]:checked');
    const total = selectedEstudio ? parseInt(selectedEstudio.value) : 0;
    estudiosTotal.textContent = total.toLocaleString().replace(/,/g, '.');
  }

  estudioInputs.forEach(input => {
    input.addEventListener('change', updateEstudiosTotal);
  });

  // Form submission
  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    // Hide step 1 and show step 2 immediately for now
    document.getElementById('step-1').style.display = 'none';
    document.getElementById('step-2').style.display = 'block';
    
    // Initialize Cal.com with proper configuration
    Cal("inline", {
      elementOrSelector: "#my-cal-inline",
      calLink: "30min",
      config: {
        name: document.getElementById('client-name').value,
        email: document.getElementById('client-email').value,
        theme: "light",
        layout: "month_view",
        hideEventTypeDetails: false
      }
    });
  });

  // Initialize flatpickr for date inputs
  if (typeof flatpickr !== 'undefined') {
    flatpickr("#shooting-dates-start", {
      dateFormat: "d/m/Y",
      locale: "pt",
      allowInput: false,
      minDate: "today",
      onChange: function(selectedDates, dateStr, instance) {
        document.querySelector("#shooting-dates-end")._flatpickr.open();
      }
    });
    
    flatpickr("#shooting-dates-end", {
      dateFormat: "d/m/Y",
      locale: "pt",
      allowInput: false,
      minDate: "today"
    });
  }
});

// Cal.com initialization
(function (C, A, L) { 
  let p = function (a, ar) { a.q.push(ar); }; 
  let d = C.document; 
  C.Cal = C.Cal || function () { 
    let cal = C.Cal; 
    let ar = arguments; 
    if (!cal.loaded) { 
      cal.ns = {}; 
      cal.q = cal.q || []; 
      d.head.appendChild(d.createElement("script")).src = A; 
      cal.loaded = true; 
    } 
    if (ar[0] === L) { 
      const api = function () { p(api, arguments); }; 
      const namespace = ar[1]; 
      api.q = api.q || []; 
      if(typeof namespace === "string"){
        cal.ns[namespace] = cal.ns[namespace] || api;
        p(cal.ns[namespace], ar);
        p(cal, ["initNamespace", namespace]);
      } else p(cal, ar); 
      return;
    } 
    p(cal, ar); 
  }; 
})(window, "https://app.cal.com/embed/embed.js", "init");
