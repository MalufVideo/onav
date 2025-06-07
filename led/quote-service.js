// Service to handle quote submission to Supabase

/**
 * Saves a proposal to Supabase database using the new proposals table
 * @param {Object} quoteData - The quote data to save
 * @returns {Promise<Object>} - The saved proposal or error
 */
async function saveQuote(quoteData) {
  try {
    // Make sure auth is initialized
    if (!window.auth || !window.auth.isAuthenticated()) {
      throw new Error('User must be authenticated to save proposals');
    }
    
    // Get Supabase client from auth module
    const supabase = window.auth.getSupabaseClient();
    if (!supabase) {
      throw new Error('Supabase client not available');
    }
    
    // For debugging - log the raw input data
    // console.log('Raw quote data:', JSON.stringify(quoteData, null, 2));
    
    // Add default values for any missing required fields
    const processedData = {
      // Keep user and session data
      user_id: quoteData.user_id,
      status: quoteData.status || 'pending',
      
      // Client and project info
      project_name: quoteData.project_name || 'Projeto sem nome',
      client_name: quoteData.client_name || 'Nome não disponível',
      client_company: quoteData.client_company || '',
      client_email: quoteData.client_email || '',
      client_phone: quoteData.client_phone || '',
      
      // Shooting dates
      shooting_dates_start: quoteData.shooting_dates_start,
      shooting_dates_end: quoteData.shooting_dates_end,
      days_count: parseInt(quoteData.days_count) || 1,
      
      // LED Principal Configuration
      led_principal_width: quoteData.led_principal_width || 0,
      led_principal_height: quoteData.led_principal_height || 0,
      led_principal_curvature: quoteData.led_principal_curvature || 0,
      led_principal_modules: parseInt(quoteData.led_principal_modules) || 0,
      led_principal_resolution: quoteData.led_principal_resolution || '2.6mm', // Default to 2.6mm if empty
      led_principal_pixels_width: parseInt(quoteData.led_principal_pixels_width) || 0,
      led_principal_pixels_height: parseInt(quoteData.led_principal_pixels_height) || 0,
      led_principal_total_pixels: parseInt(quoteData.led_principal_total_pixels) || 0,
      
      // LED Teto Configuration
      led_teto_width: quoteData.led_teto_width || 0,
      led_teto_height: quoteData.led_teto_height || 0,
      led_teto_modules: parseInt(quoteData.led_teto_modules) || 0,
      led_teto_resolution: quoteData.led_teto_resolution || '2.6mm', // Default to 2.6mm if empty
      led_teto_pixels_width: parseInt(quoteData.led_teto_pixels_width) || 0,
      led_teto_pixels_height: parseInt(quoteData.led_teto_pixels_height) || 0,
      led_teto_total_pixels: parseInt(quoteData.led_teto_total_pixels) || 0,
      
      // Power and Weight data
      principal_power_max: quoteData.principal_power_max || 0,
      principal_power_avg: quoteData.principal_power_avg || 0,
      principal_weight: quoteData.principal_weight || 0,
      teto_power_max: quoteData.teto_power_max || 0,
      teto_power_avg: quoteData.teto_power_avg || 0,
      teto_weight: quoteData.teto_weight || 0,
      
      // Selected services and pricing
      selected_pod_type: quoteData.selected_pod_type || '2d',
      selected_services: Array.isArray(quoteData.selected_services) ? quoteData.selected_services : [],
      daily_rate: parseFloat(quoteData.daily_rate) || 0,
      total_price: quoteData.total_price || 'R$ 0,00',
    };
    
    // Log the processed data that will be saved
    // console.log('Processed quote data:', processedData);
    
    // Save to the Supabase 'proposals' table
    const { data, error } = await supabase
      .from('proposals')
      .insert(processedData)
      .select();
    
    if (error) {
      console.error('Error saving proposal to Supabase:', error);
      return { data: null, error };
    }
    
    // console.log('Proposal saved successfully:', data);
    return { data, error: null };
    
  } catch (error) {
    console.error('Error in saveQuote function:', error);
    return { data: null, error };
  }
}

/**
 * Gets all proposals for the current user
 * @returns {Promise<Object>} - The proposals or error
 */
async function getProposals() {
  try {
    // Make sure auth is initialized
    if (!window.auth || !window.auth.isAuthenticated()) {
      throw new Error('User must be authenticated to view proposals');
    }
    
    // Get Supabase client from auth module
    const supabase = window.auth.getSupabaseClient();
    if (!supabase) {
      throw new Error('Supabase client not available');
    }
    
    // Fetch proposals from the new table
    const { data, error } = await supabase
      .from('proposals')
      .select('*')
      .order('created_at', { ascending: false });
      
    if (error) throw error;
    
    return { success: true, data };
  } catch (error) {
    console.error('Error fetching proposals:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Gets a specific proposal by ID
 * @param {string} proposalId - The ID of the proposal to get
 * @returns {Promise<Object>} - The proposal or error
 */
async function getProposalById(proposalId) {
  try {
    // Make sure auth is initialized
    if (!window.auth || !window.auth.isAuthenticated()) {
      throw new Error('User must be authenticated to view proposals');
    }
    
    // Get Supabase client from auth module
    const supabase = window.auth.getSupabaseClient();
    if (!supabase) {
      throw new Error('Supabase client not available');
    }
    
    // Fetch specific proposal
    const { data, error } = await supabase
      .from('proposals')
      .select('*')
      .eq('id', proposalId)
      .single();
      
    if (error) throw error;
    
    return { success: true, data };
  } catch (error) {
    console.error(`Error fetching proposal ${proposalId}:`, error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Fetches the current price for Equipe Técnica from Supabase
 * @returns {Promise<Object>} - The price data or error
 */
async function getEquipeTecnicaPrice() {
  try {
    // Make sure auth is initialized
    const supabase = window.auth?.getSupabaseClient();
    if (!supabase) {
      throw new Error('Supabase client not available');
    }
    
    // Fetch the price from the prices table
    const { data, error } = await supabase
      .from('prices')
      .select('*')
      .eq('name', 'Equipe Técnica Diária')
      .single();
      
    if (error) throw error;
    
    return { success: true, data: data?.price }; 
  } catch (error) {
    console.error('Error fetching Equipe Técnica price:', error.message);
    return { success: false, error: error.message, data: undefined }; 
  }
   
  /**
   * Fetch the price for the MX-40 Pro processor from Supabase.
   * @returns {Promise<number>} The price of the MX-40 Pro, or 0 if not found.
   */
  async function getProcessorPrice() {
      const supabase = window.auth?.getSupabaseClient();
      if (!supabase) throw new Error('Supabase client not available');
      const { data, error } = await supabase
          .from('prices') 
          .select('price')
          .eq('name', 'MX-40 Pro') 
          .single();
      if (error) {
          console.error('Error fetching MX-40 Pro price:', error);
          return 0; 
      }
      return data?.price || 0;
  }
}

/**
 * Fetches all product prices from the 'products' table.
 * @returns {Promise<Object>} An object mapping product names to their prices, or an error object.
 */
async function getProductPrices() {
  try {
    const supabase = window.auth?.getSupabaseClient();
    if (!supabase) {
      throw new Error('Supabase client not available');
    }

    const { data, error } = await supabase
      .from('products')
      .select('name, price');

    if (error) throw error;

    const prices = data.reduce((acc, product) => {
      acc[product.name] = product.price;
      return acc;
    }, {});

    // console.log('Fetched product prices:', prices); 
    return { success: true, data: prices };
  } catch (error) {
    console.error('Error fetching product prices:', error.message);
    return { success: false, error: error.message, data: {} };
  }
}

// Export the service
window.quoteService = {
  saveQuote,
  getProposals,
  getProposalById,
  getEquipeTecnicaPrice,
  getProductPrices 
};
