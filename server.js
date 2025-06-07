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

// Route to serve the admin HTML page
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'admin', 'admin.html'));
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

    const { data, error } = await supabase
      .from('products')
      .update(updateData)
      .eq('id', id)
      .select(); // Return the updated row

    if (error) throw error;
    if (!data || data.length === 0) {
        return res.status(404).json({ error: 'Product not found' });
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

// --- End API Routes ---


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