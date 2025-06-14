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

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Error: SUPABASE_URL and SUPABASE_ANON_KEY must be provided in .env file');
  process.exit(1); // Exit if keys are missing
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Middleware to parse JSON bodies
app.use(express.json());

// Enable CORS for all origins (adjust for production later if needed)
app.use(cors());

// Serve static files from 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

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
  res.json({ message: 'Server is working!', timestamp: new Date().toISOString() });
});

// Setup database schema for quote history
app.post('/api/setup-quote-history', async (req, res) => {
  try {
    // Add columns to proposals table if they don't exist
    const alterQueries = [
      `ALTER TABLE proposals ADD COLUMN IF NOT EXISTS original_total_price TEXT`,
      `ALTER TABLE proposals ADD COLUMN IF NOT EXISTS total_discount_percentage DECIMAL(5,2) DEFAULT 0`,
      `ALTER TABLE proposals ADD COLUMN IF NOT EXISTS total_discount_amount DECIMAL(10,2) DEFAULT 0`,
      `ALTER TABLE proposals ADD COLUMN IF NOT EXISTS discount_reason TEXT`,
      `ALTER TABLE proposals ADD COLUMN IF NOT EXISTS last_modified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP`,
      `ALTER TABLE proposals ADD COLUMN IF NOT EXISTS last_modified_by TEXT`
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

// Get auth data for users (admin only) - Simplified version without admin API
app.get('/api/users/auth-data', async (req, res) => {
  try {
    // For now, return empty auth data since we don't have service role access
    // This will make the dashboard work with basic user profile data
    console.log('Auth data endpoint called - returning empty data due to service role limitation');
    res.json([]);
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

    const { data, error } = await supabase
      .from('user_profiles')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (error) {
    console.error('Error updating user:', error.message);
    res.status(500).json({ error: 'Failed to update user', details: error.message });
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

    const context = req.query.context || 'my-quotes';
    let query = supabase
      .from('proposals')
      .select('*');

    // Apply filtering based on user role and context
    if (context === 'my-quotes') {
      if (userProfile?.role === 'sales_rep') {
        // Sales reps see quotes they created
        query = query.eq('sales_rep_id', user.id);
      } else if (userProfile?.role === 'admin') {
        // Admins accessing my-quotes should see their own quotes only
        query = query.or(`user_id.eq.${user.id},sales_rep_id.eq.${user.id}`);
      } else {
        // End users see only their own quotes
        query = query.eq('user_id', user.id);
      }
    } else if (context === 'dashboard') {
      // Dashboard context - only admins should access this
      if (userProfile?.role !== 'admin') {
        return res.status(403).json({ error: 'Unauthorized: Only admins can access dashboard view' });
      }
      // Admins see all quotes in dashboard
    } else {
      // Default: user sees only their own quotes
      query = query.eq('user_id', user.id);
    }

    const { data, error: queryError } = await query.order('created_at', { ascending: false });
    
    if (queryError) throw queryError;
    res.json(data);
  } catch (error) {
    console.error('Error fetching proposals:', error.message);
    res.status(500).json({ error: 'Failed to fetch proposals', details: error.message });
  }
});

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
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`API endpoints for products available at http://localhost:${PORT}/api/products`);
});