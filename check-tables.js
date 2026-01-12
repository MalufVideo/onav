const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkTables() {
  console.log('Checking if pipeline tables exist...\n');
  
  const tables = ['clients', 'jobs', 'sales_stages', 'job_stages', 'email_logs'];
  
  for (const tableName of tables) {
    try {
      const { data, error } = await supabase
        .from(tableName)
        .select('*', { count: 'exact', head: true });
      
      if (error) {
        console.log(`❌ ${tableName}: ${error.message}`);
      } else {
        console.log(`✅ ${tableName}: exists (${data || 0} rows)`);
      }
    } catch (err) {
      console.log(`❌ ${tableName}: ${err.message}`);
    }
  }
  
  // Also check if execute_sql function exists
  console.log('\nChecking execute_sql function...');
  try {
    const { data, error } = await supabase
      .rpc('execute_sql', { sql_query: 'SELECT 1 as test' });
    
    if (error) {
      console.log(`❌ execute_sql function: ${error.message}`);
    } else {
      console.log('✅ execute_sql function: exists');
    }
  } catch (err) {
    console.log(`❌ execute_sql function: ${err.message}`);
  }
}

checkTables().catch(console.error);
