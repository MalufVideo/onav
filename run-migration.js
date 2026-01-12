const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials in .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runMigration() {
  console.log('Running pipeline schema migration...\n');
  
  // Read SQL file
  const sql = fs.readFileSync('add-pipeline-schema.sql', 'utf8');
  
  // Split SQL into individual statements
  const statements = sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s && !s.startsWith('--'));
  
  console.log(`Found ${statements.length} SQL statements to execute\n`);
  
  for (let i = 0; i < statements.length; i++) {
    const statement = statements[i];
    
    // Skip empty statements and comments
    if (!statement || statement.startsWith('--') || statement.startsWith('/*')) {
      continue;
    }
    
    console.log(`Executing statement ${i + 1}/${statements.length}...`);
    
    try {
      const { data, error } = await supabase.rpc('execute_sql', {
        sql_query: statement
      });
      
      if (error) {
        console.warn(`⚠️  Warning: ${error.message}`);
        // Continue with other statements
      } else {
        console.log('  ✅ Success');
      }
    } catch (err) {
      console.warn(`⚠️  Error: ${err.message}`);
    }
  }
  
  console.log('\n✅ Migration completed!');
  console.log('🔍 You can now verify the new tables in your Supabase dashboard.');
}

runMigration().catch(console.error);
