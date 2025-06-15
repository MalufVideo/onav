// Dashboard Integration for LED Calculator
// This script handles communication between the LED calculator and the dashboard

(function() {
    'use strict';
    
    let isDashboardMode = false;
    let clientInfo = null;
    
    // Check if running in dashboard mode
    function checkDashboardMode() {
        const urlParams = new URLSearchParams(window.location.search);
        isDashboardMode = urlParams.get('dashboard') === 'true';
        
        if (isDashboardMode) {
            console.log('[Dashboard Integration] Running in dashboard mode');
            setupDashboardMode();
        }
    }
    
    // Setup dashboard-specific behavior
    function setupDashboardMode() {
        // Hide authentication elements since user is already authenticated via dashboard
        hideAuthElements();
        
        // Modify the quote submission behavior
        modifyQuoteSubmission();
        
        // Listen for messages from parent window
        window.addEventListener('message', handleParentMessage);
        
        // Notify parent that calculator is loaded
        window.parent.postMessage({
            type: 'CALCULATOR_LOADED'
        }, window.location.origin);
        
        console.log('[Dashboard Integration] Dashboard mode setup complete');
    }
    
    // Hide authentication-related elements
    function hideAuthElements() {
        // Hide login/signup buttons or modals if they exist
        const authElements = [
            '.auth-modal',
            '.login-modal', 
            '.signup-modal',
            '.auth-buttons'
        ];
        
        authElements.forEach(selector => {
            const elements = document.querySelectorAll(selector);
            elements.forEach(el => {
                el.style.display = 'none';
            });
        });
    }
    
    // Handle messages from parent dashboard window
    function handleParentMessage(event) {
        if (event.origin !== window.location.origin) return;
        
        const { type, clientInfo: receivedClientInfo } = event.data;
        
        if (type === 'SET_CLIENT_INFO') {
            clientInfo = receivedClientInfo;
            console.log('[Dashboard Integration] Received client info:', clientInfo);
            
            // Pre-populate any client fields if they exist in the calculator
            populateClientFields();
        }
    }
    
    // Pre-populate client information in the calculator
    function populateClientFields() {
        if (!clientInfo) return;
        
        // Map of field IDs to client info properties
        const fieldMappings = {
            'cart-project-name': '', // This should be filled by sales rep
            'client-name': clientInfo.name,
            'client-email': clientInfo.email,
            'client-company': clientInfo.company,
            'client-phone': clientInfo.phone
        };
        
        Object.entries(fieldMappings).forEach(([fieldId, value]) => {
            const field = document.getElementById(fieldId);
            if (field && value) {
                field.value = value;
                // Mark as readonly if it's client info
                if (fieldId !== 'cart-project-name') {
                    field.readOnly = true;
                    field.style.backgroundColor = '#f5f5f5';
                }
            }
        });
    }
    
    // Modify quote submission to communicate with dashboard
    function modifyQuoteSubmission() {
        // Wait for the QuoteCartModal to be initialized
        const waitForModal = () => {
            if (window.quoteCartModal && window.quoteCartModal.submitButton) {
                interceptSubmitButton();
            } else {
                setTimeout(waitForModal, 100);
            }
        };
        
        setTimeout(waitForModal, 1000);
    }
    
    // Intercept the submit button to handle dashboard submission
    function interceptSubmitButton() {
        const modal = window.quoteCartModal;
        if (!modal || !modal.submitButton) return;
        
        // Store original submit handler
        const originalSubmit = modal.submitQuote.bind(modal);
        
        // Override submit method for dashboard mode
        modal.submitQuote = async function() {
            if (isDashboardMode) {
                await handleDashboardQuoteSubmission.call(this);
            } else {
                await originalSubmit.call(this);
            }
        };
        
        console.log('[Dashboard Integration] Submit button intercepted');
    }
    
    // Handle quote submission in dashboard mode
    async function handleDashboardQuoteSubmission() {
        try {
            console.log('[Dashboard Integration] Handling dashboard quote submission');
            
            // Disable submit button
            if (this.submitButton) {
                this.submitButton.disabled = true;
                this.submitButton.textContent = 'Processando...';
            }
            
            // Get project name
            const projectName = document.getElementById('cart-project-name')?.value?.trim();
            if (!projectName) {
                alert('Por favor, insira o nome do projeto.');
                return;
            }
            
            // Get dates
            const startDateInput = document.getElementById('cart-shooting-dates-start');
            const endDateInput = document.getElementById('cart-shooting-dates-end');
            
            if (!startDateInput?.value || !endDateInput?.value) {
                alert('Por favor, selecione as datas de início e fim da locação.');
                return;
            }
            
            // Collect all the quote data (same as original submitQuote but without saving)
            const quoteData = await collectQuoteData(projectName, startDateInput.value, endDateInput.value);
            
            // Send quote data to parent dashboard
            window.parent.postMessage({
                type: 'QUOTE_READY_FOR_SUBMISSION',
                quoteData: quoteData
            }, window.location.origin);
            
            console.log('[Dashboard Integration] Quote data sent to dashboard');
            
        } catch (error) {
            console.error('[Dashboard Integration] Error during dashboard submission:', error);
            alert('Erro ao processar orçamento: ' + error.message);
        } finally {
            // Re-enable submit button
            if (this.submitButton) {
                this.submitButton.disabled = false;
                this.submitButton.textContent = 'Requisitar Proposta';
            }
        }
    }
    
    // Collect quote data (extracted from original submitQuote logic)
    async function collectQuoteData(projectName, startDate, endDate) {
        // Helper functions (same as in quote-cart-modal.js)
        function getValueOrTextById(id) {
            const element = document.getElementById(id);
            if (!element) return '';
            return (element.value !== undefined ? element.value : element.textContent) || '';
        }
        
        function getNumberById(id) {
            const value = getValueOrTextById(id);
            const cleanedValue = value.replace(/R\$\s?/g, '').replace(/\./g, '').replace(',', '.');
            const number = parseFloat(cleanedValue);
            return isNaN(number) ? 0 : number;
        }
        
        function getIntegerById(id) {
            const value = getValueOrTextById(id);
            const integer = parseInt(value.replace(/\D/g, ''), 10);
            return isNaN(integer) ? 0 : integer;
        }
        
        function parseDate(dateString) {
            if (!dateString) return null;
            const parts = dateString.split('/');
            if (parts.length === 3) {
                return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
            }
            return dateString;
        }
        
        function parseCurrency(value) {
            if (typeof value !== 'string') return 0;
            const cleanedValue = value.replace(/R\$\s?/g, '').replace(/\./g, '').replace(',', '.');
            const number = parseFloat(cleanedValue);
            return isNaN(number) ? 0 : number;
        }
        
        // Parse dates
        const shootingStartDate = parseDate(startDate);
        const shootingEndDate = parseDate(endDate);
        
        const startDateObj = new Date(shootingStartDate);
        const endDateObj = new Date(shootingEndDate);
        const timeDiff = endDateObj.getTime() - startDateObj.getTime();
        const daysCount = Math.max(1, Math.ceil(timeDiff / (1000 * 3600 * 24)) + 1);
        
        // Get LED configuration
        const ledPrincipalWidth = getValueOrTextById('width-value');
        const ledPrincipalHeight = getValueOrTextById('height-value');
        const ledPrincipalCurvature = getNumberById('curvature-value');
        const ledPrincipalModules = getIntegerById('module-count');
        const ledPrincipalResolution = getValueOrTextById('resolution');
        
        // Calculate pixels
        const widthValue = getNumberById('width-value');
        const heightValue = getNumberById('height-value');
        const ledPrincipalPixelsWidth = Math.round(widthValue * 2 * 192);
        const ledPrincipalPixelsHeight = Math.round(heightValue * 2 * 192);
        const ledPrincipalTotalPixels = ledPrincipalPixelsWidth * ledPrincipalPixelsHeight;
        
        // Get teto configuration
        const ledTetoWidth = getValueOrTextById('roof-width-value');
        const ledTetoHeight = getValueOrTextById('roof-height-value');
        const ledTetoModules = getIntegerById('teto-module-count');
        const ledTetoResolution = getValueOrTextById('teto-resolution') || ledPrincipalResolution;
        
        const roofWidthValue = getNumberById('roof-width-value');
        const roofHeightValue = getNumberById('roof-height-value');
        const ledTetoPixelsWidth = Math.round(roofWidthValue * 2 * 192);
        const ledTetoPixelsHeight = Math.round(roofHeightValue * 2 * 192);
        const ledTetoTotalPixels = ledTetoPixelsWidth * ledTetoPixelsHeight;
        
        // Get power and weight
        const principalPowerMax = getValueOrTextById('power-max');
        const principalPowerAvg = getValueOrTextById('power-avg');
        const principalWeight = getValueOrTextById('total-weight');
        const tetoPowerMax = getValueOrTextById('teto-power-max');
        const tetoPowerAvg = getValueOrTextById('teto-power-avg');
        const tetoWeight = getValueOrTextById('teto-total-weight');
        
        // Get selected services from cart
        const selectedServices = [];
        const cartItemElements = document.querySelectorAll('#cart-items-container .cart-item:not(.cart-header):not(.cart-info-item)');
        
        cartItemElements.forEach(element => {
            const nameElement = element.querySelector('.cart-item-name');
            const qtyElement = element.querySelector('.cart-item-qty');
            const unitPriceElement = element.querySelector('.cart-item-price');
            const subtotalElement = element.querySelector('.cart-item-subtotal');
            
            if (nameElement && qtyElement && unitPriceElement && subtotalElement) {
                const name = nameElement.textContent.trim();
                const quantity = parseInt(qtyElement.textContent.trim(), 10) || 0;
                const unitPrice = parseCurrency(unitPriceElement.textContent.trim());
                const subtotal = parseCurrency(subtotalElement.textContent.trim());
                
                if (!name.startsWith('Config:') && subtotal > 0 && quantity > 0) {
                    selectedServices.push({
                        name: name,
                        quantity: quantity,
                        unit_price: unitPrice
                    });
                }
            }
        });
        
        // Get pod type and pricing
        const selectedPodType = document.querySelector('input[name="disguise-mode"]:checked')?.value || '2d';
        const dailyRate = getNumberById('total-price');
        const rawTotalPriceString = getValueOrTextById('cart-total-price') || '';
        const totalPriceMatch = rawTotalPriceString.match(/R\$\s?[\d.,]+/);
        const totalPrice = totalPriceMatch ? totalPriceMatch[0] : 'R$ 0,00';
        
        return {
            project_name: projectName,
            shooting_dates_start: shootingStartDate,
            shooting_dates_end: shootingEndDate,
            days_count: daysCount,
            
            // LED Principal Configuration
            led_principal_width: ledPrincipalWidth,
            led_principal_height: ledPrincipalHeight,
            led_principal_curvature: ledPrincipalCurvature,
            led_principal_modules: ledPrincipalModules,
            led_principal_resolution: ledPrincipalResolution,
            led_principal_pixels_width: ledPrincipalPixelsWidth,
            led_principal_pixels_height: ledPrincipalPixelsHeight,
            led_principal_total_pixels: ledPrincipalTotalPixels,
            
            // LED Teto Configuration
            led_teto_width: ledTetoWidth,
            led_teto_height: ledTetoHeight,
            led_teto_modules: ledTetoModules,
            led_teto_resolution: ledTetoResolution,
            led_teto_pixels_width: ledTetoPixelsWidth,
            led_teto_pixels_height: ledTetoPixelsHeight,
            led_teto_total_pixels: ledTetoTotalPixels,
            
            // Power and Weight data
            principal_power_max: principalPowerMax,
            principal_power_avg: principalPowerAvg,
            principal_weight: principalWeight,
            teto_power_max: tetoPowerMax,
            teto_power_avg: tetoPowerAvg,
            teto_weight: tetoWeight,
            
            // Service and Pricing data
            selected_pod_type: selectedPodType,
            selected_services: selectedServices,
            daily_rate: dailyRate,
            total_price: totalPrice
        };
    }
    
    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', checkDashboardMode);
    } else {
        checkDashboardMode();
    }
    
})();