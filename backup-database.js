const { createClient } = require('@supabase/supabase-js');
const fs = require('fs').promises;
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials in .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function backupDatabase() {
  console.log('Starting database backup...');
  
  // Get all tables using RPC
  const { data: tables, error: tablesError } = await supabase
    .rpc('get_tables');
  
  if (tablesError) {
    console.error('Error fetching tables:', tablesError);
    process.exit(1);
  }
  
  const backup = {
    timestamp: new Date().toISOString(),
    tables: {}
  };
  
  for (const table of tables) {
    const tableName = table.table_name;
    console.log(`Backing up table: ${tableName}`);
    
    const { data: tableData, error: dataError } = await supabase
      .from(tableName)
      .select('*');
    
    if (dataError) {
      console.warn(`Warning: Could not backup table ${tableName}:`, dataError.message);
      continue;
    }
    
    backup.tables[tableName] = tableData;
    console.log(`  - Backed up ${tableData.length} rows from ${tableName}`);
  }
  
  // Save backup to file
  const backupFileName = `backup-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
  await fs.writeFile(backupFileName, JSON.stringify(backup, null, 2));
  
  console.log(`\n✅ Backup completed! Saved to: ${backupFileName}`);
  console.log(`📊 Total tables backed up: ${Object.keys(backup.tables).length}`);
}

backupDatabase().catch(console.error);
