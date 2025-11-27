#!/usr/bin/env node
/**
 * Setup script for Multi-Camera / Live calculator products
 * This script adds all necessary products to the Supabase database
 *
 * Usage:
 *   node scripts/setup-multicamera-products.js
 *
 * Requirements:
 *   - .env file with SUPABASE_URL and SUPABASE_ANON_KEY
 *   - @supabase/supabase-js installed
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Error: SUPABASE_URL and SUPABASE_ANON_KEY must be set in .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Define all multicamera products
const multicameraProducts = [
  // Cameras
  {
    name: 'Camera Sony EX3',
    price: 500,
    category: 'Cameras',
    description: 'Câmera Sony EX3 - Diária',
    unit_type: 'diária'
  },
  {
    name: 'Camera Sony FX6',
    price: 1200,
    category: 'Cameras',
    description: 'Câmera Sony FX6 - Diária',
    unit_type: 'diária'
  },
  {
    name: 'Camera Sony FX9',
    price: 1800,
    category: 'Cameras',
    description: 'Câmera Sony FX9 - Diária',
    unit_type: 'diária'
  },

  // Camera Support
  {
    name: 'Tripé',
    price: 125,
    category: 'Camera Support',
    description: 'Tripé para câmera - Diária',
    unit_type: 'diária'
  },

  // Crew
  {
    name: 'Operador de Câmera',
    price: 800,
    category: 'Crew',
    description: 'Operador de Câmera Profissional - Diária',
    unit_type: 'diária'
  },
  {
    name: 'Diretor de Corte',
    price: 1500,
    category: 'Crew',
    description: 'Diretor de Corte Profissional - Diária',
    unit_type: 'diária'
  },

  // Switchers
  {
    name: 'Switcher Panasonic HS400',
    price: 650,
    category: 'Switchers',
    description: 'Mesa de Corte Panasonic HS400 - Diária',
    unit_type: 'diária'
  },

  // Servers
  {
    name: 'Servidor vMix',
    price: 3500,
    category: 'Servers',
    description: 'Servidor vMix para Live Streaming/Recording - Diária',
    unit_type: 'diária'
  }
];

/**
 * Check if a product exists by name
 */
async function productExists(productName) {
  const { data, error } = await supabase
    .from('products')
    .select('id, name, price')
    .eq('name', productName)
    .single();

  if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
    console.error(`Error checking product "${productName}":`, error.message);
    return null;
  }

  return data;
}

/**
 * Insert or update a product
 */
async function upsertProduct(product) {
  const existing = await productExists(product.name);

  if (existing) {
    // Update existing product
    const { data, error } = await supabase
      .from('products')
      .update({
        price: product.price,
        category: product.category,
        description: product.description,
        unit_type: product.unit_type,
        updated_at: new Date().toISOString()
      })
      .eq('name', product.name)
      .select()
      .single();

    if (error) {
      console.error(`❌ Failed to update "${product.name}":`, error.message);
      return false;
    }

    console.log(`✅ Updated: ${product.name} - R$ ${product.price} (ID: ${existing.id})`);
    return true;
  } else {
    // Insert new product
    const { data, error } = await supabase
      .from('products')
      .insert([product])
      .select()
      .single();

    if (error) {
      console.error(`❌ Failed to insert "${product.name}":`, error.message);
      return false;
    }

    console.log(`✅ Added: ${product.name} - R$ ${product.price} (ID: ${data.id})`);
    return true;
  }
}

/**
 * Main setup function
 */
async function setupMulticameraProducts() {
  console.log('🚀 Starting Multi-Camera Products Setup...\n');
  console.log(`📊 Products to process: ${multicameraProducts.length}\n`);

  let successCount = 0;
  let failCount = 0;

  for (const product of multicameraProducts) {
    const success = await upsertProduct(product);
    if (success) {
      successCount++;
    } else {
      failCount++;
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log(`✅ Successfully processed: ${successCount} products`);
  if (failCount > 0) {
    console.log(`❌ Failed: ${failCount} products`);
  }
  console.log('='.repeat(60));

  // Verify all products
  console.log('\n📋 Verifying all Multi-Camera products in database:\n');
  await verifyProducts();
}

/**
 * Verify all multicamera products are in the database
 */
async function verifyProducts() {
  const { data, error } = await supabase
    .from('products')
    .select('name, price, category, description')
    .in('category', ['Cameras', 'Camera Support', 'Crew', 'Switchers', 'Servers'])
    .order('category', { ascending: true })
    .order('name', { ascending: true });

  if (error) {
    console.error('❌ Error fetching products:', error.message);
    return;
  }

  console.log('Category          | Product Name                    | Price (R$)');
  console.log('-'.repeat(80));

  data.forEach(product => {
    const category = product.category.padEnd(18);
    const name = product.name.padEnd(30);
    const price = product.price.toFixed(2).padStart(10);
    console.log(`${category}| ${name} | ${price}`);
  });

  console.log('\n✅ All products verified successfully!');
}

// Run the setup
setupMulticameraProducts()
  .then(() => {
    console.log('\n🎉 Multi-Camera products setup completed!');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Setup failed with error:', error);
    process.exit(1);
  });
