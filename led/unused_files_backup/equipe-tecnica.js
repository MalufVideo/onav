// Equipe Tecnica functionality

document.addEventListener('DOMContentLoaded', function() {
    console.log('Initializing Equipe Tecnica module...');
    
    // Function to update the Equipe Tecnica pricing based on days
    async function updateEquipeTecnicaPricing() {
        const dayCount = getSelectedDays();
        
        // Fetch current price from Supabase
        const { success, data: dailyRate } = await window.quoteService.getEquipeTecnicaPrice();
        const total = dailyRate * dayCount;
        
        // Update the display values
        if (document.getElementById('equipe-tecnica-total')) {
            document.getElementById('equipe-tecnica-total').textContent = formatCurrency(total);
        }
        
        // Update summary if visible
        if (document.getElementById('summary-equipe-tecnica-total')) {
            document.getElementById('summary-equipe-tecnica-total').textContent = formatCurrency(total);
        }
        
        if (document.getElementById('summary-equipe-tecnica-days')) {
            document.getElementById('summary-equipe-tecnica-days').textContent = dayCount;
        }

        // Dispatch event to update proposal summary
        document.dispatchEvent(new Event('updateProposalSummary'));
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
    
    // Format currency helper function (if not already defined globally)
    function formatCurrency(value) {
        if (window.fixedFormatCurrency) {
            // Use the global fixed version if available
            return window.fixedFormatCurrency(value);
        }
        
        // Otherwise fallback to local implementation
        const number = typeof value === 'string' ? 
            parseFloat(value.replace(/\./, '').replace(',', '.')) : value;
            
        if (isNaN(number)) {
            return 'R$ 0,00';
        }
        
        return `R$ ${number.toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
    }
    
    // Watch for date changes to update the pricing
    const startDateInput = document.getElementById('shooting-dates-start');
    const endDateInput = document.getElementById('shooting-dates-end');
    
    if (startDateInput) {
        startDateInput.addEventListener('change', updateEquipeTecnicaPricing);
    }
    
    if (endDateInput) {
        endDateInput.addEventListener('change', updateEquipeTecnicaPricing);
    }
    
    // Listen for the flatpickr change events
    document.addEventListener('updateProposalSummary', updateEquipeTecnicaPricing);
    
    // Initial update
    updateEquipeTecnicaPricing();
    
    // Also update after a short delay to catch async updates
    setTimeout(updateEquipeTecnicaPricing, 500);
    setTimeout(updateEquipeTecnicaPricing, 1500);
});
