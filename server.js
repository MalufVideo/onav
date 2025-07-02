require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const { createClient } = require('@supabase/supabase-js'); // Import Supabase client
const cors = require('cors'); // Import CORS middleware

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Error: SUPABASE_URL and SUPABASE_ANON_KEY must be provided in .env file');
  process.exit(1); // Exit if keys are missing
}

// Create both clients - anon for regular operations, service for admin operations
const supabase = createClient(supabaseUrl, supabaseAnonKey);
const supabaseAdmin = supabaseServiceKey ? createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
}) : supabase;

// Warning if service key is missing
if (!supabaseServiceKey) {
  console.warn('WARNING: SUPABASE_SERVICE_ROLE_KEY not found. Admin functions (user creation from dashboard) will not work.');
  console.warn('Please add SUPABASE_SERVICE_ROLE_KEY to your .env file for full functionality.');
}

// Middleware to parse JSON bodies
app.use(express.json());

// Enable CORS for all origins (adjust for production later if needed)
app.use(cors());

// Serve static files from root directory
app.use(express.static(path.join(__dirname)));

// Serve static files from 'admin' directory under the /admin path
app.use('/admin', express.static(path.join(__dirname, 'admin')));

// Serve static files from 'led' directory under the /led path
app.use('/led', express.static(path.join(__dirname, 'led')));

// Serve static files from 'img' directory under the /img path
app.use('/img', express.static(path.join(__dirname, 'img')));

// Route to serve the admin HTML page (old product admin)
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'admin', 'admin.html'));
});

// Route to serve the dashboard HTML page (new comprehensive dashboard)
app.get('/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'admin', 'dashboard.html'));
});

// --- API Routes for Products ---

// GET all products
app.get('/api/products', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('category', { ascending: true })
      .order('name', { ascending: true });

    if (error) throw error;
    res.json(data);
  } catch (error) {
    console.error('Error fetching products:', error.message);
    res.status(500).json({ error: 'Failed to fetch products', details: error.message });
  }
});

// POST a new product
app.post('/api/products', async (req, res) => {
  try {
    const { name, description, price, category, unit_type } = req.body;
    // Basic validation
    if (!name || price === undefined || !category || !unit_type) {
      return res.status(400).json({ error: 'Missing required fields: name, price, category, unit_type' });
    }

    const { data, error } = await supabase
      .from('products')
      .insert([{ name, description, price, category, unit_type }])
      .select(); // Return the inserted row

    if (error) throw error;
    res.status(201).json(data[0]); // Return the newly created product
  } catch (error) {
    console.error('Error adding product:', error.message);
    res.status(500).json({ error: 'Failed to add product', details: error.message });
  }
});

// PUT (update) a product by ID
app.put('/api/products/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, price, category, unit_type } = req.body;

    console.log('PUT request received for product ID:', id);
    console.log('Update data:', { name, description, price, category, unit_type });

    // First, check if the product exists
    const { data: existingProduct, error: fetchError } = await supabase
      .from('products')
      .select('*')
      .eq('id', id)
      .single();

    console.log('Existing product check:', existingProduct, 'Error:', fetchError);

    if (fetchError || !existingProduct) {
      console.log('Product not found in database');
      return res.status(404).json({ error: 'Product not found' });
    }

    // Construct update object only with provided fields
    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (price !== undefined) updateData.price = price;
    if (category !== undefined) updateData.category = category;
    if (unit_type !== undefined) updateData.unit_type = unit_type;
    // updated_at is handled by the trigger

    if (Object.keys(updateData).length === 0) {
        return res.status(400).json({ error: 'No fields provided for update' });
    }

    console.log('Performing update with data:', updateData);

    const { data, error } = await supabase
      .from('products')
      .update(updateData)
      .eq('id', id)
      .select(); // Return the updated row

    console.log('Update result - data:', data, 'error:', error);

    if (error) throw error;
    if (!data || data.length === 0) {
        return res.status(404).json({ error: 'Product update failed - no rows affected' });
    }
    res.json(data[0]); // Return the updated product
  } catch (error) {
    console.error('Error updating product:', error.message);
    res.status(500).json({ error: 'Failed to update product', details: error.message });
  }
});

// DELETE a product by ID
app.delete('/api/products/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', id);

    if (error) throw error;
    res.status(204).send(); // No content on successful deletion
  } catch (error) {
    console.error('Error deleting product:', error.message);
    res.status(500).json({ error: 'Failed to delete product', details: error.message });
  }
});

// --- Quote History API Routes ---

// Test endpoint to verify server is working
app.get('/api/test', (req, res) => {
  res.json({ 
    message: 'Server is working!', 
    timestamp: new Date().toISOString(),
    supabase_configured: !!supabaseUrl && !!supabaseAnonKey,
    admin_client_available: !!supabaseServiceKey
  });
});

// Debug endpoint to check quote data structure
app.get('/api/debug/quote/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const { data, error } = await supabaseAdmin
      .from('proposals')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;

    // Parse the JSON data to see what's stored
    let parsedDiscountDescription = null;
    try {
      if (data.discount_description) {
        parsedDiscountDescription = JSON.parse(data.discount_description);
      }
    } catch (e) {
      parsedDiscountDescription = { error: 'Failed to parse JSON' };
    }

    res.json({
      success: true,
      raw_data: data,
      parsed_discount_description: parsedDiscountDescription
    });

  } catch (error) {
    console.error('Error fetching quote debug data:', error);
    res.status(500).json({ error: 'Failed to fetch quote debug data', details: error.message });
  }
});

// Test endpoint to validate proposal data structure
app.post('/api/test-proposal-data', async (req, res) => {
  try {
    const rawData = req.body;
    
    // Helper functions (same as in save-proposal)
    function safeNumber(value) {
      if (value === null || value === undefined || value === '') return null;
      if (typeof value === 'number') return value;
      const cleanedValue = String(value).replace(/[^\d.,]/g, '').replace(',', '.');
      const num = parseFloat(cleanedValue);
      return isNaN(num) ? null : num;
    }

    function safeInteger(value) {
      if (value === null || value === undefined || value === '') return null;
      if (typeof value === 'number') return Math.round(value);
      const cleanedValue = String(value).replace(/\D/g, '');
      const num = parseInt(cleanedValue, 10);
      return isNaN(num) ? null : num;
    }
    
    // Process data same as save-proposal but don't save
    const processedData = {
      user_id: rawData.user_id,
      project_name: rawData.project_name,
      led_principal_width: safeNumber(rawData.led_principal_width),
      led_principal_height: safeNumber(rawData.led_principal_height),
      principal_power_max: safeInteger(rawData.principal_power_max),
      principal_power_avg: safeInteger(rawData.principal_power_avg)
    };
    
    res.json({
      success: true,
      raw_data_sample: {
        user_id: rawData.user_id,
        project_name: rawData.project_name,
        led_principal_width: rawData.led_principal_width,
        principal_power_max: rawData.principal_power_max
      },
      processed_data_sample: processedData,
      data_types: {
        led_principal_width: typeof processedData.led_principal_width,
        principal_power_max: typeof processedData.principal_power_max
      }
    });
  } catch (error) {
    console.error('Error testing proposal data:', error);
    res.status(500).json({ error: 'Test failed', details: error.message });
  }
});

// Setup database schema for quote history and missing columns
app.post('/api/setup-quote-history', async (req, res) => {
  try {
    // Add columns to proposals table if they don't exist
    const alterQueries = [
      `ALTER TABLE proposals ADD COLUMN IF NOT EXISTS original_total_price TEXT`,
      `ALTER TABLE proposals ADD COLUMN IF NOT EXISTS total_discount_percentage DECIMAL(5,2) DEFAULT 0`,
      `ALTER TABLE proposals ADD COLUMN IF NOT EXISTS total_discount_amount DECIMAL(10,2) DEFAULT 0`,
      `ALTER TABLE proposals ADD COLUMN IF NOT EXISTS discount_reason TEXT`,
      `ALTER TABLE proposals ADD COLUMN IF NOT EXISTS last_modified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP`,
      `ALTER TABLE proposals ADD COLUMN IF NOT EXISTS last_modified_by TEXT`,
      // Add missing columns for complete quote display
      `ALTER TABLE proposals ADD COLUMN IF NOT EXISTS comercial TEXT`,
      `ALTER TABLE proposals ADD COLUMN IF NOT EXISTS sales_rep_name TEXT`,
      `ALTER TABLE proposals ADD COLUMN IF NOT EXISTS sales_rep_id UUID`,
      `ALTER TABLE proposals ADD COLUMN IF NOT EXISTS principal_power_max INTEGER`,
      `ALTER TABLE proposals ADD COLUMN IF NOT EXISTS principal_power_avg INTEGER`,
      `ALTER TABLE proposals ADD COLUMN IF NOT EXISTS principal_weight INTEGER`,
      `ALTER TABLE proposals ADD COLUMN IF NOT EXISTS teto_power_max INTEGER`,
      `ALTER TABLE proposals ADD COLUMN IF NOT EXISTS teto_power_avg INTEGER`,
      `ALTER TABLE proposals ADD COLUMN IF NOT EXISTS teto_weight INTEGER`,
      `ALTER TABLE proposals ADD COLUMN IF NOT EXISTS led_principal_pixels_width INTEGER`,
      `ALTER TABLE proposals ADD COLUMN IF NOT EXISTS led_principal_pixels_height INTEGER`,
      `ALTER TABLE proposals ADD COLUMN IF NOT EXISTS led_principal_total_pixels BIGINT`,
      `ALTER TABLE proposals ADD COLUMN IF NOT EXISTS led_teto_pixels_width INTEGER`,
      `ALTER TABLE proposals ADD COLUMN IF NOT EXISTS led_teto_pixels_height INTEGER`,
      `ALTER TABLE proposals ADD COLUMN IF NOT EXISTS led_teto_total_pixels BIGINT`,
      `ALTER TABLE proposals ADD COLUMN IF NOT EXISTS led_teto_resolution TEXT`
    ];

    for (const query of alterQueries) {
      const { error } = await supabase.rpc('execute_sql', { sql_query: query });
      if (error && !error.message.includes('already exists')) {
        console.error('Error altering proposals table:', error);
      }
    }

    // Create quote_history table
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS quote_history (
        id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
        proposal_id UUID NOT NULL,
        change_type VARCHAR(50) NOT NULL,
        old_total_price TEXT,
        old_status VARCHAR(20),
        old_discount_percentage DECIMAL(5,2),
        old_discount_amount DECIMAL(10,2),
        new_total_price TEXT,
        new_status VARCHAR(20),
        new_discount_percentage DECIMAL(5,2),
        new_discount_amount DECIMAL(10,2),
        discount_type VARCHAR(20),
        discount_value DECIMAL(10,2),
        discount_reason TEXT,
        changed_by TEXT,
        change_description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        client_notified BOOLEAN DEFAULT FALSE,
        admin_notes TEXT
      )
    `;

    const { error: createError } = await supabase.rpc('execute_sql', { sql_query: createTableQuery });
    if (createError) {
      console.error('Error creating quote_history table:', createError);
    }

    res.json({ success: true, message: 'Quote history schema setup completed' });
  } catch (error) {
    console.error('Error setting up quote history schema:', error);
    res.status(500).json({ error: 'Failed to setup quote history schema', details: error.message });
  }
});

// Get quote history for a specific proposal
app.get('/api/quote-history/:proposalId', async (req, res) => {
  try {
    const { proposalId } = req.params;
    
    const { data, error } = await supabase
      .from('quote_history')
      .select('*')
      .eq('proposal_id', proposalId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    res.json(data);
  } catch (error) {
    console.error('Error fetching quote history:', error);
    res.status(500).json({ error: 'Failed to fetch quote history', details: error.message });
  }
});

// Create a new quote history entry
app.post('/api/quote-history', async (req, res) => {
  try {
    const historyEntry = req.body;
    
    const { data, error } = await supabase
      .from('quote_history')
      .insert([historyEntry])
      .select();

    if (error) throw error;
    res.status(201).json(data[0]);
  } catch (error) {
    console.error('Error creating quote history entry:', error);
    res.status(500).json({ error: 'Failed to create quote history entry', details: error.message });
  }
});

// Update proposal with discount and create history entry
app.put('/api/proposals/:id/apply-discount', async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      discountType, 
      discountValue, 
      discountReason, 
      newStatus, 
      changedBy 
    } = req.body;

    // First, get the current proposal
    const { data: currentProposal, error: fetchError } = await supabase
      .from('proposals')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError) throw fetchError;
    if (!currentProposal) {
      return res.status(404).json({ error: 'Proposal not found' });
    }

    // Set original price if not set
    const originalPrice = currentProposal.original_total_price || currentProposal.total_price;
    
    // Parse current price
    const currentPriceStr = currentProposal.total_price || 'R$ 0,00';
    const currentPriceNum = parseFloat(currentPriceStr.replace(/[^\d,]/g, '').replace(',', '.')) || 0;
    
    // Calculate new price and discount amounts
    let newPrice = currentPriceNum;
    let discountAmount = 0;
    
    if (discountValue > 0) {
      if (discountType === 'percentage') {
        discountAmount = currentPriceNum * (discountValue / 100);
        newPrice = currentPriceNum - discountAmount;
      } else {
        discountAmount = discountValue;
        newPrice = currentPriceNum - discountValue;
      }
    }

    // Format new price
    const formattedNewPrice = `R$ ${newPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
    
    // Calculate total discount from original
    const originalPriceNum = parseFloat(originalPrice.replace(/[^\d,]/g, '').replace(',', '.')) || 0;
    const totalDiscountAmount = originalPriceNum - newPrice;
    const totalDiscountPercentage = originalPriceNum > 0 ? (totalDiscountAmount / originalPriceNum) * 100 : 0;

    // Update proposal
    const updateData = {
      total_price: formattedNewPrice,
      status: newStatus || currentProposal.status,
      original_total_price: originalPrice,
      total_discount_percentage: totalDiscountPercentage,
      total_discount_amount: totalDiscountAmount,
      discount_reason: discountReason,
      last_modified_at: new Date().toISOString(),
      last_modified_by: changedBy
    };

    const { error: updateError } = await supabase
      .from('proposals')
      .update(updateData)
      .eq('id', id);

    if (updateError) throw updateError;

    // Create history entry
    const historyEntry = {
      proposal_id: id,
      change_type: 'discount_applied',
      old_total_price: currentProposal.total_price,
      old_status: currentProposal.status,
      old_discount_percentage: currentProposal.total_discount_percentage || 0,
      old_discount_amount: currentProposal.total_discount_amount || 0,
      new_total_price: formattedNewPrice,
      new_status: newStatus || currentProposal.status,
      new_discount_percentage: totalDiscountPercentage,
      new_discount_amount: totalDiscountAmount,
      discount_type: discountType,
      discount_value: discountValue,
      discount_reason: discountReason,
      changed_by: changedBy,
      change_description: `Applied ${discountType === 'percentage' ? discountValue + '%' : 'R$ ' + discountValue} discount`,
      created_at: new Date().toISOString()
    };

    const { error: historyError } = await supabase
      .from('quote_history')
      .insert([historyEntry]);

    if (historyError) {
      console.error('Error creating history entry:', historyError);
    }

    // Call the discount email Edge Function
    console.log('About to call discount email function for proposal ID:', id);
    console.log('SUPABASE_URL:', process.env.SUPABASE_URL);
    console.log('SERVICE_ROLE_KEY exists:', !!process.env.SUPABASE_SERVICE_ROLE_KEY);
    
    try {
      const functionUrl = `${process.env.SUPABASE_URL}/functions/v1/send-discount-email`;
      console.log('Calling Edge Function at:', functionUrl);
      
      const discountEmailResponse = await fetch(functionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`
        },
        body: JSON.stringify({ proposalId: id })
      });

      console.log('Edge Function response status:', discountEmailResponse.status);
      
      if (!discountEmailResponse.ok) {
        const errorText = await discountEmailResponse.text();
        console.error('Failed to send discount email:', errorText);
      } else {
        const emailResult = await discountEmailResponse.json();
        console.log('Discount email sent successfully:', emailResult);
      }
    } catch (emailError) {
      console.error('Error calling discount email function:', emailError);
      // Don't fail the discount application if email fails
    }

    res.json({ 
      success: true, 
      message: 'Discount applied successfully',
      newPrice: formattedNewPrice,
      totalDiscountPercentage: totalDiscountPercentage.toFixed(2),
      totalDiscountAmount: totalDiscountAmount.toFixed(2)
    });

  } catch (error) {
    console.error('Error applying discount:', error);
    res.status(500).json({ error: 'Failed to apply discount', details: error.message });
  }
});

// --- End Quote History API Routes ---

// --- User Management API Routes ---

// Get current user profile
app.get('/api/auth/profile', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'No authorization header' });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profileError) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    res.json(profile);
  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// Get all users (admin only)
app.get('/api/users', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json(data);
  } catch (error) {
    console.error('Error fetching users:', error.message);
    res.status(500).json({ error: 'Failed to fetch users', details: error.message });
  }
});

// Get auth data for users (admin only) - Uses service role key
app.get('/api/users/auth-data', async (req, res) => {
  try {
    console.log('Auth data endpoint called with service role access');
    
    // Verify user has admin role
    const authHeader = req.headers.authorization;
    console.log('Auth header present:', !!authHeader);
    
    if (!authHeader) {
      console.log('No authorization header provided');
      return res.status(401).json({ error: 'No authorization header' });
    }

    const token = authHeader.replace('Bearer ', '');
    console.log('Token length:', token.length);
    
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      console.log('Auth error:', authError?.message || 'No user found');
      return res.status(401).json({ error: 'Invalid token', details: authError?.message });
    }

    console.log('Authenticated user:', user.email);

    // Check if user is admin - special handling for master admin
    if (user.email === 'nelson.maluf@onprojecoes.com.br') {
      console.log('Master admin access granted for:', user.email);
    } else {
      // Check if user is admin via user_profiles table
      const { data: profile, error: profileError } = await supabaseAdmin
        .from('user_profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      console.log('Profile lookup result:', profile, 'Error:', profileError?.message);

      if (!profile || profile.role !== 'admin') {
        console.log('Access denied - not admin:', profile?.role, user.email);
        return res.status(403).json({ error: 'Admin access required' });
      }
    }

    console.log('Admin access confirmed for:', user.email);

    // Use service role client to get all auth users
    const { data: authData, error: listError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (listError) {
      console.error('Error listing users:', listError);
      return res.status(500).json({ error: 'Failed to fetch auth users', details: listError.message });
    }

    console.log(`Successfully fetched ${authData.users.length} auth users`);
    res.json(authData.users);
    
  } catch (error) {
    console.error('Error fetching auth data:', error.message);
    res.status(500).json({ error: 'Failed to fetch auth data', details: error.message });
  }
});

// Create new user (admin only)
app.post('/api/users', async (req, res) => {
  try {
    const { email, full_name, password, role, phone } = req.body;
    
    if (!email || !full_name || !password) {
      return res.status(400).json({ error: 'Email, full name, and password are required' });
    }

    // Create user in Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        name: full_name,
        phone: phone || ''
      }
    });

    if (authError) throw authError;

    // Create user profile
    const { data: profileData, error: profileError } = await supabase
      .from('user_profiles')
      .insert([{
        id: authData.user.id,
        email,
        full_name,
        phone: phone || '',
        role: role || 'end_user'
      }])
      .select()
      .single();

    if (profileError) throw profileError;

    res.status(201).json(profileData);
  } catch (error) {
    console.error('Error creating user:', error.message);
    res.status(500).json({ error: 'Failed to create user', details: error.message });
  }
});

// Update user profile (admin only)
app.put('/api/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { full_name, role, is_active, phone } = req.body;

    const updateData = {};
    if (full_name !== undefined) updateData.full_name = full_name;
    if (role !== undefined) updateData.role = role;
    if (is_active !== undefined) updateData.is_active = is_active;
    if (phone !== undefined) updateData.phone = phone;
    updateData.updated_at = new Date().toISOString();

    // Update user profile table
    const { data, error } = await supabase
      .from('user_profiles')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    // If phone number was updated, also update auth metadata and existing quotes
    if (phone !== undefined && supabaseServiceKey) {
      try {
        // Update Supabase Auth user metadata
        const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(id, {
          user_metadata: {
            phone: phone
          }
        });

        if (authError) {
          console.warn('Failed to update auth metadata for user:', id, authError.message);
        }

        // Update existing quotes with new phone number
        const { error: quotesError } = await supabase
          .from('proposals')
          .update({ client_phone: phone })
          .eq('user_id', id);

        if (quotesError) {
          console.warn('Failed to update quotes phone number for user:', id, quotesError.message);
        }

        console.log(`Successfully synced phone number ${phone} for user ${id} across all systems`);
      } catch (syncError) {
        console.warn('Error syncing phone number:', syncError.message);
        // Don't fail the main update if sync fails
      }
    }

    res.json(data);
  } catch (error) {
    console.error('Error updating user:', error.message);
    res.status(500).json({ error: 'Failed to update user', details: error.message });
  }
});

// Delete user (admin only) - deletes from both user_profiles and Supabase auth
app.delete('/api/users/:id', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'No authorization header' });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    // Get user profile to determine role
    const { data: userProfile, error: profileError } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    // Special handling for master admin
    let userRole = userProfile?.role;
    
    if (user.email === 'nelson.maluf@onprojecoes.com.br') {
      userRole = 'admin';
      console.log('Master admin detected, granting admin role');
    }

    // If no profile found but user exists, and it's a known sales rep email, grant sales_rep role
    if (!userRole && user.email === 'nelson@avdesign.video') {
      userRole = 'sales_rep';
      console.log('Known sales rep email detected, granting sales_rep role');
    }

    if (!userRole || !['admin', 'sales_rep'].includes(userRole)) {
      console.error('Authorization failed for user deletion:', {
        user_email: user.email,
        user_role: userRole,
        profile_found: !!userProfile,
        profile_error: profileError
      });
      return res.status(403).json({ 
        error: 'Unauthorized: Only admins and sales reps can delete users',
        debug: {
          user_email: user.email,
          user_role: userRole,
          profile_found: !!userProfile,
          profile_error: profileError?.message
        }
      });
    }

    const { id } = req.params;

    // Get user to delete for validation
    const { data: userToDelete, error: fetchError } = await supabase
      .from('user_profiles')
      .select('email, role')
      .eq('id', id)
      .single();

    if (fetchError || !userToDelete) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Prevent deletion of master admin
    if (userToDelete.email === 'nelson.maluf@onprojecoes.com.br') {
      return res.status(403).json({ error: 'Cannot delete master admin account' });
    }

    // Delete from user_profiles table first
    const { error: profileDeleteError } = await supabase
      .from('user_profiles')
      .delete()
      .eq('id', id);

    if (profileDeleteError) {
      console.error('Error deleting user profile:', profileDeleteError);
      throw profileDeleteError;
    }

    // Delete from Supabase auth if service key is available
    if (supabaseServiceKey) {
      try {
        const { error: authDeleteError } = await supabaseAdmin.auth.admin.deleteUser(id);
        
        if (authDeleteError) {
          console.error('Error deleting user from auth:', authDeleteError);
          // Don't throw here - profile is already deleted, just log the auth error
          console.warn(`User profile deleted but auth deletion failed for user ${id}:`, authDeleteError.message);
        } else {
          console.log(`Successfully deleted user ${id} from both profile and auth`);
        }
      } catch (authError) {
        console.error('Error during auth deletion:', authError);
        // Don't throw here - profile is already deleted
      }
    } else {
      console.warn('Service role key not available - user deleted from profiles only');
    }

    res.json({ 
      success: true, 
      message: 'User deleted successfully',
      deletedFromAuth: !!supabaseServiceKey
    });
  } catch (error) {
    console.error('Error deleting user:', error.message);
    res.status(500).json({ error: 'Failed to delete user', details: error.message });
  }
});

// Sync phone numbers between user profiles and auth metadata (admin only)
app.post('/api/users/sync-phone-numbers', async (req, res) => {
  try {
    if (!supabaseServiceKey) {
      return res.status(500).json({ error: 'Service role key required for this operation' });
    }

    // Get all user profiles with phone numbers
    const { data: profiles, error: profilesError } = await supabase
      .from('user_profiles')
      .select('id, phone, email')
      .not('phone', 'is', null)
      .neq('phone', '');

    if (profilesError) throw profilesError;

    let syncedCount = 0;
    let errors = [];

    for (const profile of profiles) {
      try {
        // Update auth metadata
        const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(profile.id, {
          user_metadata: {
            phone: profile.phone
          }
        });

        if (authError) {
          errors.push(`Failed to update auth metadata for ${profile.email}: ${authError.message}`);
          continue;
        }

        // Update existing quotes
        const { error: quotesError } = await supabase
          .from('proposals')
          .update({ client_phone: profile.phone })
          .eq('user_id', profile.id);

        if (quotesError) {
          errors.push(`Failed to update quotes for ${profile.email}: ${quotesError.message}`);
          continue;
        }

        syncedCount++;
        console.log(`Synced phone number for user: ${profile.email} (${profile.phone})`);

      } catch (error) {
        errors.push(`Error syncing ${profile.email}: ${error.message}`);
      }
    }

    res.json({
      success: true,
      message: `Synced phone numbers for ${syncedCount} users`,
      totalUsers: profiles.length,
      syncedCount,
      errors: errors.length > 0 ? errors : undefined
    });

  } catch (error) {
    console.error('Error syncing phone numbers:', error.message);
    res.status(500).json({ error: 'Failed to sync phone numbers', details: error.message });
  }
});

// --- Lead Management API Routes ---

// Get all leads (with role-based filtering)
app.get('/api/leads', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('leads')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json(data);
  } catch (error) {
    console.error('Error fetching leads:', error.message);
    res.status(500).json({ error: 'Failed to fetch leads', details: error.message });
  }
});

// Search leads by name
app.get('/api/leads/search', async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) {
      return res.json([]);
    }

    const { data, error } = await supabase
      .from('leads')
      .select('*')
      .ilike('name', `%${q}%`)
      .limit(10);

    if (error) throw error;
    res.json(data);
  } catch (error) {
    console.error('Error searching leads:', error.message);
    res.status(500).json({ error: 'Failed to search leads', details: error.message });
  }
});

// Create new lead
app.post('/api/leads', async (req, res) => {
  try {
    const { name, email, phone, company, created_by } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }

    const { data, error } = await supabase
      .from('leads')
      .insert([{ name, email, phone, company, created_by }])
      .select()
      .single();

    if (error) throw error;
    res.status(201).json(data);
  } catch (error) {
    console.error('Error creating lead:', error.message);
    res.status(500).json({ error: 'Failed to create lead', details: error.message });
  }
});

// Update lead
app.put('/api/leads/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, phone, company } = req.body;

    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (email !== undefined) updateData.email = email;
    if (phone !== undefined) updateData.phone = phone;
    if (company !== undefined) updateData.company = company;
    updateData.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('leads')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (error) {
    console.error('Error updating lead:', error.message);
    res.status(500).json({ error: 'Failed to update lead', details: error.message });
  }
});

// Get proposals with role-based filtering
app.get('/api/proposals', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'No authorization header' });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    // Get user profile to determine role
    const { data: userProfile, error: profileError } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    // Special handling for master admin
    let userRole = userProfile?.role;
    
    if (user.email === 'nelson.maluf@onprojecoes.com.br') {
      userRole = 'admin';
      console.log('Master admin detected, granting admin role for proposals');
    }

    // If no profile found but user exists, and it's a known sales rep email, grant sales_rep role
    if (!userRole && user.email === 'nelson@avdesign.video') {
      userRole = 'sales_rep';
      console.log('Known sales rep email detected, granting sales_rep role for proposals');
      
      // Auto-create profile for known sales rep
      try {
        const { error: createError } = await supabase
          .from('user_profiles')
          .insert([{
            id: user.id,
            email: user.email,
            full_name: 'Nelson (Sales Rep)',
            role: 'sales_rep',
            is_active: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }]);
        
        if (!createError) {
          console.log('Created user profile for sales rep:', user.email);
        }
      } catch (err) {
        console.warn('Could not auto-create sales rep profile:', err.message);
      }
    }

    const context = req.query.context || 'my-quotes';
    
    // For admin users in dashboard context, use service role client to bypass RLS
    const clientToUse = (userRole === 'admin' && context === 'dashboard') ? supabaseAdmin : supabase;
    console.log(`[DEBUG] Using ${clientToUse === supabaseAdmin ? 'ADMIN' : 'ANON'} client for query`);
    
    let query = clientToUse
      .from('proposals')
      .select('*');

    // Apply filtering based on user role and context
    console.log(`[DEBUG] Applying filters - Role: ${userRole}, Context: ${context}, User ID: ${user.id}`);
    
    if (context === 'my-quotes') {
      if (userRole === 'sales_rep') {
        // Sales reps see quotes they created
        console.log('[DEBUG] Sales rep - filtering by sales_rep_id');
        query = query.eq('sales_rep_id', user.id);
      } else if (userRole === 'admin') {
        // Admins accessing my-quotes should see their own quotes only
        console.log('[DEBUG] Admin in my-quotes - filtering by user_id OR sales_rep_id');
        query = query.or(`user_id.eq.${user.id},sales_rep_id.eq.${user.id}`);
      } else {
        // End users see only their own quotes
        console.log('[DEBUG] End user - filtering by user_id');
        query = query.eq('user_id', user.id);
      }
    } else if (context === 'dashboard') {
      // Dashboard context - only admins and sales reps should access this
      if (!['admin', 'sales_rep'].includes(userRole)) {
        return res.status(403).json({ error: 'Unauthorized: Only admins and sales reps can access dashboard view' });
      }
      // Admins see all quotes, sales reps see quotes they created
      if (userRole === 'sales_rep') {
        console.log('[DEBUG] Sales rep in dashboard - filtering by sales_rep_id');
        query = query.eq('sales_rep_id', user.id);
      } else if (userRole === 'admin') {
        console.log('[DEBUG] ADMIN in dashboard - NO FILTER applied, should see ALL quotes');
      }
      // Note: For admin users, we don't add any filter - they see ALL quotes
    } else {
      // Default: user sees only their own quotes
      console.log('[DEBUG] Default context - filtering by user_id');
      query = query.eq('user_id', user.id);
    }

    const { data, error: queryError } = await query.order('created_at', { ascending: false });
    
    if (queryError) throw queryError;
    
    console.log(`[/api/proposals] User: ${user.email} (${user.id}), Role: ${userRole}, Context: ${context}, Found ${data.length} quotes`);
    
    res.json(data);
  } catch (error) {
    console.error('Error fetching proposals:', error.message);
    res.status(500).json({ error: 'Failed to fetch proposals', details: error.message });
  }
});

// POST save proposal endpoint for dashboard quotes
app.post('/api/save-proposal', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'No authorization header' });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    const rawProposalData = req.body;
    
    console.log('Received proposal data:', JSON.stringify(rawProposalData, null, 2));
    
    // Ensure required fields are present
    if (!rawProposalData.user_id || !rawProposalData.project_name) {
      return res.status(400).json({ error: 'Missing required fields: user_id and project_name' });
    }

    // Helper function to safely convert string to number
    function safeNumber(value) {
      if (value === null || value === undefined || value === '') return null;
      if (typeof value === 'number') return value;
      const cleanedValue = String(value).replace(/[^\d.,]/g, '').replace(',', '.');
      const num = parseFloat(cleanedValue);
      return isNaN(num) ? null : num;
    }

    // Helper function to safely convert string to integer
    function safeInteger(value) {
      if (value === null || value === undefined || value === '') return null;
      if (typeof value === 'number') return Math.round(value);
      const cleanedValue = String(value).replace(/\D/g, '');
      const num = parseInt(cleanedValue, 10);
      return isNaN(num) ? null : num;
    }

    // Map and validate proposal data to match database schema
    // Start with core required fields only, then add others if they exist
    const proposalData = {
      // Core required fields
      user_id: rawProposalData.user_id,
      project_name: rawProposalData.project_name,
      status: rawProposalData.status || 'pending',
      
      // Client Information
      client_name: rawProposalData.client_name,
      client_company: rawProposalData.client_company,
      client_email: rawProposalData.client_email,
      client_phone: rawProposalData.client_phone,
      
      // Date fields
      shooting_dates_start: rawProposalData.shooting_dates_start,
      shooting_dates_end: rawProposalData.shooting_dates_end,
      
      // Basic pricing
      days_count: safeInteger(rawProposalData.days_count) || 1,
      total_price: rawProposalData.total_price,
      
      // Service Selection
      selected_pod_type: rawProposalData.selected_pod_type
    };

    // Add LED configuration fields if they exist
    if (rawProposalData.led_principal_width !== undefined) {
      proposalData.led_principal_width = safeNumber(rawProposalData.led_principal_width);
    }
    if (rawProposalData.led_principal_height !== undefined) {
      proposalData.led_principal_height = safeNumber(rawProposalData.led_principal_height);
    }
    if (rawProposalData.led_principal_curvature !== undefined) {
      proposalData.led_principal_curvature = safeInteger(rawProposalData.led_principal_curvature);
    }
    if (rawProposalData.led_principal_modules !== undefined) {
      proposalData.led_principal_modules = safeInteger(rawProposalData.led_principal_modules);
    }
    if (rawProposalData.led_principal_resolution !== undefined) {
      proposalData.led_principal_resolution = rawProposalData.led_principal_resolution;
    }
    
    // Add LED Teto configuration if exists
    if (rawProposalData.led_teto_width !== undefined) {
      proposalData.led_teto_width = safeNumber(rawProposalData.led_teto_width);
    }
    if (rawProposalData.led_teto_height !== undefined) {
      proposalData.led_teto_height = safeNumber(rawProposalData.led_teto_height);
    }
    if (rawProposalData.led_teto_modules !== undefined) {
      proposalData.led_teto_modules = safeInteger(rawProposalData.led_teto_modules);
    }
    
    // Add power/weight data only if columns exist (they might not be in the actual DB)
    if (rawProposalData.daily_rate !== undefined) {
      proposalData.daily_rate = safeNumber(rawProposalData.daily_rate);
    }
    
    // Add progressive discount information if provided
    if (rawProposalData.discount_percentage !== undefined) {
      proposalData.discount_percentage = safeNumber(rawProposalData.discount_percentage);
    }
    if (rawProposalData.discount_amount !== undefined) {
      proposalData.discount_amount = safeNumber(rawProposalData.discount_amount);
    }
    if (rawProposalData.original_total_price !== undefined) {
      proposalData.original_total_price = rawProposalData.original_total_price;
    }
    if (rawProposalData.discount_reason !== undefined) {
      proposalData.discount_reason = rawProposalData.discount_reason;
    }
    
    // Add selected services if provided
    if (rawProposalData.selected_services && Array.isArray(rawProposalData.selected_services)) {
      proposalData.selected_services = JSON.stringify(rawProposalData.selected_services);
    }
    
    // Add sales rep information directly (using existing discount_description field to store structured data)
    if (rawProposalData.sales_rep_name) {
      // Store sales rep name in an existing column that we know exists
      // We'll put it in the discount_description as structured data and also try other existing fields
    }
    
    // Store all additional data in discount_description as JSON
    // This includes power, weight, pixels, and sales rep data
    
    // Store sales rep information in dedicated columns
    if (rawProposalData.sales_rep_id) {
      proposalData.sales_rep_id = rawProposalData.sales_rep_id;
    } else {
      proposalData.sales_rep_id = user.id; // Default to current user
    }
    if (rawProposalData.sales_rep_name) {
      proposalData.sales_rep_name = rawProposalData.sales_rep_name;
    }
    
    console.log(`[save-proposal] Setting sales_rep_id: ${proposalData.sales_rep_id} for user: ${user.email} (${user.id})`);
    
    // Store dashboard-specific data as JSON in discount_description
    const dashboardData = {
      created_by_dashboard: rawProposalData.created_by_dashboard || false,
      
      // Power and weight data
      principal_power_max: safeInteger(rawProposalData.principal_power_max),
      principal_power_avg: safeInteger(rawProposalData.principal_power_avg),
      principal_weight: safeInteger(rawProposalData.principal_weight),
      teto_power_max: safeInteger(rawProposalData.teto_power_max),
      teto_power_avg: safeInteger(rawProposalData.teto_power_avg),
      teto_weight: safeInteger(rawProposalData.teto_weight),
      
      // Pixel data
      led_principal_pixels_width: safeInteger(rawProposalData.led_principal_pixels_width),
      led_principal_pixels_height: safeInteger(rawProposalData.led_principal_pixels_height),
      led_principal_total_pixels: safeInteger(rawProposalData.led_principal_total_pixels),
      led_teto_pixels_width: safeInteger(rawProposalData.led_teto_pixels_width),
      led_teto_pixels_height: safeInteger(rawProposalData.led_teto_pixels_height),
      led_teto_total_pixels: safeInteger(rawProposalData.led_teto_total_pixels),
      led_teto_resolution: rawProposalData.led_teto_resolution
    };
    
    if (rawProposalData.selected_services && Array.isArray(rawProposalData.selected_services)) {
      dashboardData.services = rawProposalData.selected_services;
    }
    
    proposalData.discount_description = JSON.stringify(dashboardData);
    
    // Remove null/undefined values to avoid database issues
    Object.keys(proposalData).forEach(key => {
      if (proposalData[key] === null || proposalData[key] === undefined) {
        delete proposalData[key];
      }
    });
    
    console.log('Final proposal data to insert:', JSON.stringify(proposalData, null, 2));
    console.log('Discount description content:', proposalData.discount_description);
    
    // Log progressive discount fields specifically for debugging
    if (proposalData.discount_percentage > 0) {
      console.log('Progressive discount applied:', {
        percentage: proposalData.discount_percentage,
        amount: proposalData.discount_amount,
        original: proposalData.original_total_price,
        final: proposalData.total_price,
        reason: proposalData.discount_reason
      });
    }

    const { data, error } = await supabaseAdmin
      .from('proposals')
      .insert([proposalData])
      .select()
      .single();

    if (error) {
      console.error('Database error details:', error);
      throw error;
    }
    
    res.status(201).json({ 
      success: true, 
      message: 'Proposal saved successfully',
      data: data 
    });
    
  } catch (error) {
    console.error('Error saving proposal:', error.message);
    console.error('Full error object:', error);
    res.status(500).json({ 
      error: 'Failed to save proposal', 
      details: error.message,
      hint: error.hint || 'Check server logs for more details'
    });
  }
});

// Check if user exists by email (for dashboard client selection)
app.post('/api/check-user-by-email', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'No authorization header' });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    // Check if current user is admin or sales_rep
    const { data: userProfile, error: profileError } = await supabase
      .from('user_profiles')
      .select('role, email')
      .eq('id', user.id)
      .single();

    console.log('User profile check:', { user_id: user.id, email: user.email, profile: userProfile, error: profileError });

    // Special handling for master admin
    let userRole = userProfile?.role;
    
    if (user.email === 'nelson.maluf@onprojecoes.com.br') {
      userRole = 'admin';
      console.log('Master admin detected, granting admin role');
    }

    // If no profile found but user exists, and it's a known sales rep email, grant sales_rep role
    if (!userRole && user.email === 'nelson@avdesign.video') {
      userRole = 'sales_rep';
      console.log('Known sales rep email detected, granting sales_rep role');
      
      // Auto-create profile for known sales rep
      try {
        const { error: createError } = await supabase
          .from('user_profiles')
          .insert([{
            id: user.id,
            email: user.email,
            full_name: 'Nelson (Sales Rep)',
            role: 'sales_rep',
            is_active: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }]);
        
        if (!createError) {
          console.log('Created user profile for sales rep in check-user-by-email:', user.email);
        }
      } catch (err) {
        console.warn('Could not auto-create sales rep profile in check-user-by-email:', err.message);
      }
    }

    if (!userRole || !['admin', 'sales_rep'].includes(userRole)) {
      console.error('Authorization failed:', {
        user_email: user.email,
        user_role: userRole,
        profile_found: !!userProfile,
        profile_error: profileError
      });
      return res.status(403).json({ 
        error: 'Unauthorized: Only admins and sales reps can check users',
        debug: {
          user_email: user.email,
          user_role: userRole,
          profile_found: !!userProfile,
          profile_error: profileError?.message
        }
      });
    }

    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    // Check if user exists in auth.users
    let existingUser = null;
    try {
      const { data: authUsers, error: listError } = await supabaseAdmin.auth.admin.listUsers();
      if (listError) throw listError;
      existingUser = authUsers.users.find(u => u.email === email);
    } catch (error) {
      // If admin functions don't work, check user_profiles table instead
      console.log('Admin listUsers failed, checking profiles table:', error.message);
      const { data: profileUser } = await supabase
        .from('user_profiles')
        .select('id, email')
        .eq('email', email)
        .single();
      
      if (profileUser) {
        existingUser = { id: profileUser.id };
      }
    }
    
    if (existingUser) {
      // Check for profile data
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', existingUser.id)
        .single();

      res.json({
        exists: true,
        user_id: existingUser.id,
        profile: profile || null
      });
    } else {
      res.json({
        exists: false,
        user_id: null,
        profile: null
      });
    }

  } catch (error) {
    console.error('Error checking user by email:', error.message);
    res.status(500).json({ error: 'Failed to check user', details: error.message });
  }
});

// Create new user (for dashboard client creation)
app.post('/api/create-client-user', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'No authorization header' });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    // Check if current user is admin or sales_rep
    const { data: userProfile, error: userProfileError } = await supabase
      .from('user_profiles')
      .select('role, email')
      .eq('id', user.id)
      .single();

    // Special handling for master admin
    let userRole = userProfile?.role;
    
    if (user.email === 'nelson.maluf@onprojecoes.com.br') {
      userRole = 'admin';
      console.log('Master admin detected, granting admin role');
    }

    // If no profile found but user exists, and it's a known sales rep email, grant sales_rep role
    if (!userRole && user.email === 'nelson@avdesign.video') {
      userRole = 'sales_rep';
      console.log('Known sales rep email detected, granting sales_rep role');
    }

    if (!userRole || !['admin', 'sales_rep'].includes(userRole)) {
      console.error('Authorization failed:', {
        user_email: user.email,
        user_role: userRole,
        profile_found: !!userProfile,
        profile_error: userProfileError
      });
      return res.status(403).json({ 
        error: 'Unauthorized: Only admins and sales reps can create users',
        debug: {
          user_email: user.email,
          user_role: userRole,
          profile_found: !!userProfile,
          profile_error: userProfileError?.message
        }
      });
    }

    const { email, password, full_name, company, phone } = req.body;
    
    if (!email || !password || !full_name) {
      return res.status(400).json({ error: 'Email, password, and full_name are required' });
    }

    // Create user in auth
    let newUser = null;
    try {
      const { data: userData, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: email,
        password: password,
        email_confirm: true
      });
      if (createError) throw createError;
      newUser = userData;
    } catch (error) {
      // If admin createUser doesn't work, return an error with instructions
      if (!supabaseServiceKey) {
        return res.status(500).json({ 
          error: 'Cannot create users without service role key',
          message: 'Please add SUPABASE_SERVICE_ROLE_KEY to your .env file to enable user creation from dashboard',
          details: error.message
        });
      }
      throw error;
    }

    // Create profile (only using columns we know exist)
    const profileData = {
      id: newUser.user.id,
      email: email,
      full_name: full_name,
      role: 'end_user',
      is_active: true
    };

    // Add optional fields if they're provided
    if (phone) profileData.phone = phone;

    const { data: profile, error: insertProfileError } = await supabaseAdmin
      .from('user_profiles')
      .insert(profileData)
      .select()
      .single();

    if (insertProfileError) {
      console.error('Error creating profile:', insertProfileError);
      // Try to clean up the created user if profile creation fails
      await supabaseAdmin.auth.admin.deleteUser(newUser.user.id);
      throw new Error('Failed to create user profile');
    }

    res.status(201).json({
      success: true,
      user_id: newUser.user.id,
      profile: profile
    });

  } catch (error) {
    console.error('Error creating client user:', error.message);
    res.status(500).json({ error: 'Failed to create client user', details: error.message });
  }
});

// Update user profile (for existing users without complete profiles)
app.put('/api/update-user-profile', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'No authorization header' });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    // Check if current user is admin or sales_rep
    const { data: userProfile, error: userProfileError } = await supabase
      .from('user_profiles')
      .select('role, email')
      .eq('id', user.id)
      .single();

    // Special handling for master admin
    let userRole = userProfile?.role;
    
    if (user.email === 'nelson.maluf@onprojecoes.com.br') {
      userRole = 'admin';
    }

    if (!userRole || !['admin', 'sales_rep'].includes(userRole)) {
      return res.status(403).json({ 
        error: 'Unauthorized: Only admins and sales reps can update user profiles',
        debug: {
          user_email: user.email,
          user_role: userRole,
          profile_found: !!userProfile
        }
      });
    }

    const { user_id, email, full_name, company, phone } = req.body;
    
    if (!user_id || !email || !full_name) {
      return res.status(400).json({ error: 'user_id, email, and full_name are required' });
    }

    // Update or create profile (only using columns we know exist)
    const profileData = {
      id: user_id,
      email: email,
      full_name: full_name,
      role: 'end_user',
      is_active: true,
      updated_at: new Date().toISOString()
    };

    // Add optional fields if they're provided
    if (phone) profileData.phone = phone;

    const { data: profile, error: updateProfileError } = await supabaseAdmin
      .from('user_profiles')
      .upsert(profileData, { onConflict: 'id' })
      .select()
      .single();

    if (updateProfileError) throw updateProfileError;

    res.json({
      success: true,
      profile: profile
    });

  } catch (error) {
    console.error('Error updating user profile:', error.message);
    res.status(500).json({ error: 'Failed to update user profile', details: error.message });
  }
});

// Debug endpoint to check current user profile
app.get('/api/debug/current-user', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'No authorization header' });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    // Get user profile
    const { data: userProfile, error: debugProfileError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    res.json({
      auth_user: {
        id: user.id,
        email: user.email,
        created_at: user.created_at
      },
      profile: userProfile,
      profile_error: debugProfileError,
      is_master_admin: user.email === 'nelson.maluf@onprojecoes.com.br'
    });

  } catch (error) {
    console.error('Error checking current user:', error.message);
    res.status(500).json({ error: 'Failed to check current user', details: error.message });
  }
});

// Helper endpoint to create/update admin profile
app.post('/api/setup-admin-profile', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'No authorization header' });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    // Only allow master admin to set up profiles
    
    if (user.email !== 'nelson.maluf@onprojecoes.com.br') {
      return res.status(403).json({ error: 'Only master admin can setup profiles' });
    }

    // Create or update profile for current user
    const adminName = 'Nelson Maluf (Master Admin)';
    
    const { data: profile, error: setupProfileError } = await supabaseAdmin
      .from('user_profiles')
      .upsert({
        id: user.id,
        email: user.email,
        full_name: adminName,
        role: 'admin',
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }, { onConflict: 'id' })
      .select()
      .single();

    if (setupProfileError) throw setupProfileError;

    res.json({
      success: true,
      message: 'Admin profile created/updated successfully',
      profile: profile
    });

  } catch (error) {
    console.error('Error setting up admin profile:', error.message);
    res.status(500).json({ error: 'Failed to setup admin profile', details: error.message });
  }
});

// Simplified endpoint to create admin profile without auth restrictions
app.post('/api/bootstrap-admin', async (req, res) => {
  try {
    const { user_id, email } = req.body;
    
    if (!user_id || !email) {
      return res.status(400).json({ error: 'user_id and email are required' });
    }

    // Only allow for master admin emails
    
    if (email !== 'nelson.maluf@onprojecoes.com.br') {
      return res.status(403).json({ error: 'Only master admin can be bootstrapped' });
    }

    // Create or update profile for the user
    const adminName = 'Nelson Maluf (Master Admin)';
    
    const { data: profile, error: bootstrapError } = await supabaseAdmin
      .from('user_profiles')
      .upsert({
        id: user_id,
        email: email,
        full_name: adminName,
        role: 'admin',
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }, { onConflict: 'id' })
      .select()
      .single();

    if (bootstrapError) throw bootstrapError;

    res.json({
      success: true,
      message: 'Admin profile bootstrapped successfully',
      profile: profile
    });

  } catch (error) {
    console.error('Error bootstrapping admin profile:', error.message);
    res.status(500).json({ error: 'Failed to bootstrap admin profile', details: error.message });
  }
});

// Debug endpoint to check table structure
app.get('/api/debug/table-structure', async (req, res) => {
  try {
    // Try to get table info by querying with all possible columns
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .limit(1);

    if (error) {
      console.error('Error querying user_profiles:', error);
      
      // Try basic query to see what columns exist
      const { data: basicData, error: basicError } = await supabase
        .from('user_profiles')
        .select()
        .limit(1);
      
      return res.json({
        error: error,
        basic_query: basicData,
        basic_error: basicError
      });
    }

    res.json({
      success: true,
      sample_data: data,
      message: 'Query successful'
    });

  } catch (error) {
    console.error('Error checking table structure:', error.message);
    res.status(500).json({ error: 'Failed to check table structure', details: error.message });
  }
});

// Setup database tables and RLS policies
app.post('/api/setup-database', async (req, res) => {
  try {
    // Create user_profiles table if it doesn't exist
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS user_profiles (
        id UUID PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        full_name TEXT,
        phone TEXT,
        role TEXT DEFAULT 'end_user',
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `;

    const { error: createError } = await supabaseAdmin.rpc('exec_sql', { 
      sql: createTableSQL 
    });
    
    if (createError) {
      console.log('Table creation error (may already exist):', createError);
    }

    // Enable RLS
    const enableRLSSQL = `ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;`;
    const { error: rlsError } = await supabaseAdmin.rpc('exec_sql', { 
      sql: enableRLSSQL 
    });
    
    if (rlsError) {
      console.log('RLS enable error (may already be enabled):', rlsError);
    }

    // Create policies
    const policies = [
      // Allow service role to do everything
      `CREATE POLICY IF NOT EXISTS "Service role can do everything" ON user_profiles FOR ALL USING (true);`,
      
      // Allow users to read their own profile
      `CREATE POLICY IF NOT EXISTS "Users can read own profile" ON user_profiles FOR SELECT USING (auth.uid() = id);`,
      
      // Allow users to update their own profile
      `CREATE POLICY IF NOT EXISTS "Users can update own profile" ON user_profiles FOR UPDATE USING (auth.uid() = id);`,
      
      // Allow admins to do everything
      `CREATE POLICY IF NOT EXISTS "Admins can do everything" ON user_profiles FOR ALL USING (
        EXISTS (
          SELECT 1 FROM user_profiles up 
          WHERE up.id = auth.uid() AND up.role = 'admin'
        )
      );`
    ];

    for (const policy of policies) {
      const { error: policyError } = await supabaseAdmin.rpc('exec_sql', { 
        sql: policy 
      });
      
      if (policyError) {
        console.log('Policy creation error (may already exist):', policyError);
      }
    }

    res.json({
      success: true,
      message: 'Database setup completed'
    });

  } catch (error) {
    console.error('Error setting up database:', error.message);
    res.status(500).json({ error: 'Failed to setup database', details: error.message });
  }
});

// --- Email API Route ---

// Import Resend
const { Resend } = require('resend');
const resend = new Resend(process.env.RESEND_API_KEY || 're_jMkwd7zt_FihowYjXxNzcDcek6RsfkNpp');

// Handle contact form submissions
app.post('/api/send-email', async (req, res) => {
  try {
    const { name, email, subject, message, phone, company, project, 'equipment-interest': equipmentInterest } = req.body;
    
    // Basic validation - check for either message or project field
    if (!name || !email || (!message && !project)) {
      return res.status(400).json({ 
        error: 'Campos obrigatórios: nome, email e mensagem',
        message: 'Por favor, preencha todos os campos obrigatórios.' 
      });
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ 
        error: 'Email inválido',
        message: 'Por favor, insira um endereço de email válido.' 
      });
    }

    // Prepare email content
    const emailContent = message || project || '';
    const emailSubject = subject || `On+Av Site: Nova Mensagem de Contato de ${name}`;
    
    // Send email using Resend
    const { data, error } = await resend.emails.send({
      from: 'On+Av Contato <contato@onav.com.br>',
      to: ['nelsonhdvideo@gmail.com'],
      subject: emailSubject,
      html: `
        <p>Você recebeu uma nova mensagem do formulário de contato do site On+Av:</p>
        <hr>
        <p><strong>Nome:</strong> ${name}</p>
        <p><strong>Email:</strong> ${email}</p>
        ${phone ? `<p><strong>Telefone:</strong> ${phone}</p>` : ''}
        ${company ? `<p><strong>Empresa:</strong> ${company}</p>` : ''}
        <p><strong>Mensagem:</strong></p>
        <p>${emailContent.replace(/\n/g, '<br>')}</p>
        ${equipmentInterest ? `<p><strong>Equipamentos de interesse:</strong> ${equipmentInterest}</p>` : ''}
        <hr>
        <p><em>Enviado via formulário do site em ${new Date().toLocaleString('pt-BR')}.</em></p>
      `,
    });

    if (error) {
      console.error('Resend API Error:', error);
      return res.status(400).json({ 
        error: 'Erro ao enviar email',
        message: 'Erro ao enviar o email. Tente novamente mais tarde.',
        details: error.message 
      });
    }

    console.log('Email sent successfully:', data);
    
    res.json({ 
      success: true, 
      message: 'Mensagem enviada com sucesso! Entraremos em contato em breve.' 
    });
    
  } catch (error) {
    console.error('Error handling contact form:', error.message);
    res.status(500).json({ 
      error: 'Erro interno do servidor',
      message: 'Ocorreu um erro ao processar sua mensagem. Tente novamente mais tarde.',
      details: error.message 
    });
  }
});

// --- End Email API Route ---

// --- Public Quote API Routes ---

// Serve public quote page
app.get('/quote/:slug', (req, res) => {
  res.sendFile(path.join(__dirname, 'quote.html'));
});

// Get public quote data by slug
app.get('/api/quotes/public/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    
    if (!slug) {
      return res.status(400).json({ error: 'Quote slug is required' });
    }

    // Get quote by slug
    const { data: quote, error } = await supabase
      .from('proposals')
      .select('*')
      .eq('quote_url_slug', slug)
      .single();

    if (error) {
      console.error('Error fetching quote:', error);
      return res.status(404).json({ error: 'Quote not found' });
    }

    if (!quote) {
      return res.status(404).json({ error: 'Quote not found' });
    }

    // Parse services data - it can be stored in multiple places
    let parsedServices = [];
    
    // First, try to parse selected_services column
    if (quote.selected_services) {
      try {
        if (typeof quote.selected_services === 'string') {
          parsedServices = JSON.parse(quote.selected_services);
        } else if (Array.isArray(quote.selected_services)) {
          parsedServices = quote.selected_services;
        }
      } catch (e) {
        console.error('Error parsing selected_services:', e);
      }
    }
    
    // If no services found, try discount_description field (for dashboard-created quotes)
    if (parsedServices.length === 0 && quote.discount_description) {
      try {
        const dashboardData = JSON.parse(quote.discount_description);
        if (dashboardData.services && Array.isArray(dashboardData.services)) {
          parsedServices = dashboardData.services;
        }
      } catch (e) {
        console.error('Error parsing services from discount_description:', e);
      }
    }

    // Remove sensitive fields before sending to client
    const publicQuote = {
      id: quote.id,
      project_name: quote.project_name,
      client_name: quote.client_name,
      client_company: quote.client_company,
      client_email: quote.client_email,
      client_phone: quote.client_phone,
      created_at: quote.created_at,
      shooting_dates_start: quote.shooting_dates_start,
      shooting_dates_end: quote.shooting_dates_end,
      days_count: quote.days_count,
      status: quote.status,
      led_principal_width: quote.led_principal_width,
      led_principal_height: quote.led_principal_height,
      led_principal_curvature: quote.led_principal_curvature,
      led_principal_modules: quote.led_principal_modules,
      led_teto_width: quote.led_teto_width,
      led_teto_height: quote.led_teto_height,
      led_teto_modules: quote.led_teto_modules,
      selected_services: parsedServices, // Now properly parsed as array
      total_price: quote.total_price,
      original_total_price: quote.original_total_price,
      discount_percentage: quote.discount_percentage,
      discount_amount: quote.discount_amount,
      discount_reason: quote.discount_reason,
      quote_approved: quote.quote_approved,
      quote_approved_at: quote.quote_approved_at
    };

    res.json({ quote: publicQuote });

  } catch (error) {
    console.error('Error in public quote endpoint:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Approve quote by slug
app.post('/api/quotes/approve/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    const clientIP = req.ip || req.connection.remoteAddress || 'unknown';
    
    if (!slug) {
      return res.status(400).json({ error: 'Quote slug is required' });
    }

    // First, check if quote exists and is not already approved
    const { data: existingQuote, error: fetchError } = await supabase
      .from('proposals')
      .select('id, quote_approved, project_name, client_email')
      .eq('quote_url_slug', slug)
      .single();

    if (fetchError || !existingQuote) {
      return res.status(404).json({ error: 'Quote not found' });
    }

    if (existingQuote.quote_approved) {
      return res.status(400).json({ error: 'Quote has already been approved' });
    }

    // Update quote with approval
    const approvedAt = new Date().toISOString();
    const { error: updateError } = await supabase
      .from('proposals')
      .update({
        quote_approved: true,
        quote_approved_at: approvedAt,
        quote_approval_ip: clientIP,
        status: 'approved'
      })
      .eq('quote_url_slug', slug);

    if (updateError) {
      console.error('Error updating quote approval:', updateError);
      return res.status(500).json({ error: 'Failed to approve quote' });
    }

    // TODO: Send approval notification email to admin/sales team
    console.log(`Quote approved: ${existingQuote.project_name} by client at ${clientIP}`);

    res.json({ 
      success: true, 
      message: 'Quote approved successfully',
      approvedAt: approvedAt
    });

  } catch (error) {
    console.error('Error in quote approval endpoint:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Generate URL slug for a proposal
app.post('/api/proposals/:id/generate-slug', async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!id) {
      return res.status(400).json({ error: 'Proposal ID is required' });
    }

    // Use admin client to bypass RLS
    const { data: proposal, error: fetchError } = await supabaseAdmin
      .from('proposals')
      .select('project_name, quote_url_slug')
      .eq('id', id)
      .single();

    if (fetchError || !proposal) {
      console.error('Error fetching proposal:', fetchError);
      return res.status(404).json({ error: 'Proposal not found' });
    }

    // If already has a slug, return it
    if (proposal.quote_url_slug) {
      return res.json({ slug: proposal.quote_url_slug });
    }

    // Generate a simple slug from project name
    function generateSlug(projectName) {
      return projectName
        .toLowerCase()
        .replace(/[^\w\s-]/g, '') // Remove special characters
        .replace(/\s+/g, '-')     // Replace spaces with hyphens
        .replace(/-+/g, '-')      // Replace multiple hyphens with single
        .trim('-');               // Remove leading/trailing hyphens
    }

    let baseSlug = generateSlug(proposal.project_name);
    let finalSlug = baseSlug;
    let counter = 1;

    // Check for existing slugs and make unique
    while (true) {
      const { data: existing } = await supabaseAdmin
        .from('proposals')
        .select('id')
        .eq('quote_url_slug', finalSlug)
        .neq('id', id)
        .single();

      if (!existing) break; // Slug is unique
      
      finalSlug = `${baseSlug}-${counter}`;
      counter++;
    }

    // Update proposal with the generated slug
    const { error: updateError } = await supabaseAdmin
      .from('proposals')
      .update({ quote_url_slug: finalSlug })
      .eq('id', id);

    if (updateError) {
      console.error('Error updating proposal with slug:', updateError);
      return res.status(500).json({ error: 'Failed to update proposal with slug' });
    }

    res.json({ slug: finalSlug });

  } catch (error) {
    console.error('Error in generate slug endpoint:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// --- End Public Quote API Routes ---

// --- End User and Lead Management Routes ---

// Socket.io connection handling (existing code)
io.on('connection', (socket) => {
  console.log('A user connected via Socket.IO'); // Clarified log message

  socket.on('disconnect', () => {
    console.log('Socket.IO user disconnected');
  });

  // Handle audio data from client
  socket.on('audioData', async (audioData) => {
    try {
      // Here we would process the audio data with OpenAI
      // For now, we'll just echo it back
      socket.emit('aiResponse', {
        type: 'audio',
        data: 'AI response would go here'
      });
    } catch (error) {
      console.error('Error processing audio:', error);
      socket.emit('error', { message: 'Error processing audio' });
    }
  });

  // Handle text data from client
  socket.on('textData', async (textData) => {
    try {
      // Here we would process the text data with OpenAI
      socket.emit('aiResponse', {
        type: 'text',
        data: 'AI response to: ' + textData
      });
    } catch (error) {
      console.error('Error processing text:', error);
      socket.emit('error', { message: 'Error processing text' });
    }
  });
});

const PORT = process.env.PORT || 3000;

// For local development
if (process.env.NODE_ENV !== 'production') {
  server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`API endpoints for products available at http://localhost:${PORT}/api/products`);
  });
}

// Export the Express app for Vercel serverless functions
module.exports = app;