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

// Known tables in your database
const knownTables = [
  'products',
  'proposals',
  'user_profiles',
  'users',
  'clients',
  'jobs',
  'sales_stages',
  'job_stages'
];

async function backupDatabase() {
  console.log('Starting database backup...\n');
  
  const backup = {
    timestamp: new Date().toISOString(),
    project: 'qhhjvpsxkfjcxitpnhxi',
    tables: {}
  };
  
  for (const tableName of knownTables) {
    console.log(`Backing up table: ${tableName}`);
    
    try {
      const { data: tableData, error: dataError } = await supabase
        .from(tableName)
        .select('*');
      
      if (dataError) {
        console.warn(`  ⚠️  Table ${tableName} doesn't exist or access denied: ${dataError.message}`);
        continue;
      }
      
      backup.tables[tableName] = tableData;
      console.log(`  ✅ Backed up ${tableData.length} rows`);
      
    } catch (error) {
      console.warn(`  ⚠️  Error backing up ${tableName}: ${error.message}`);
    }
  }
  
  // Save backup to file
  const backupFileName = `backup-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
  await fs.writeFile(backupFileName, JSON.stringify(backup, null, 2));
  
  console.log(`\n✅ Backup completed!`);
  console.log(`📁 File: ${backupFileName}`);
  console.log(`📊 Tables backed up: ${Object.keys(backup.tables).length}`);
  
  // Show summary
  console.log('\n📋 Backup Summary:');
  Object.entries(backup.tables).forEach(([table, rows]) => {
    console.log(`  - ${table}: ${rows.length} rows`);
  });
}

backupDatabase().catch(console.error);
