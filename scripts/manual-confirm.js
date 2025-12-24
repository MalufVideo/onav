const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Error: Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
    console.log('Ensure you have a .env file in the root with these variables.');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const TARGET_EMAIL = 'avdesigntv@gmail.com';

async function fixUser() {
    console.log(`🔍 Checking status for: ${TARGET_EMAIL}`);

    // 1. Search for user by email
    // Note: listUsers() returns a paginated list, usually we iterate but purely for this fix we assume they are in first page or use listUsers({ query: ... }) if supbase-js v2 supports it? 
    // v2 doesn't verify simple query search on listUsers easily without specific filters, let's just get the list.
    const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();

    if (listError) {
        console.error('❌ Error listing users:', listError);
        return;
    }

    const user = users.find(u => u.email === TARGET_EMAIL);

    if (user) {
        console.log(`✅ User found! ID: ${user.id}`);
        console.log(`   Current Status: ${user.email_confirmed_at ? 'Confirmed' : 'Unconfirmed'}`);

        if (user.email_confirmed_at) {
            console.log('   User is already confirmed.');
            return;
        }

        console.log('🔄 Attempting to confirm user...');
        const { data: updateData, error: updateError } = await supabase.auth.admin.updateUserById(
            user.id,
            { email_confirm: true }
        );

        if (updateError) {
            console.error('❌ Failed to confirm user:', updateError);
        } else {
            console.log('🎉 User confirmed successfully! You can now log in.');
        }

    } else {
        console.log('⚠️ User not found. Creation might have failed completely.');
        console.log('🔄 Creating user manually as confirmed...');

        const { data: createData, error: createError } = await supabase.auth.admin.createUser({
            email: TARGET_EMAIL,
            password: 'password123', // Temporary password? User didn't give me the original hash obviously.
            email_confirm: true,
            user_metadata: {
                name: 'Avdesign',
                company: 'avdesign',
                phone: '19981454647'
            }
        });

        if (createError) {
            console.error('❌ Failed to create user:', createError);
        } else {
            console.log('🎉 User created and confirmed! Password is: password123');
            console.log('   (Please change your password after logging in)');
        }
    }
}

fixUser();
