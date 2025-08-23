// Database seeding script for MBDF-IT
// Run with: node scripts/seed-database.js

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function seedDatabase() {
  try {
    console.log('🚀 Starting database seeding...');
    
    // Seed substances
    console.log('📋 Seeding substances...');
    const substances = [
      {
        name: 'Benzene',
        ec_number: '200-753-7',
        cas_number: '71-43-2',
        description: 'Aromatic hydrocarbon compound used in industrial processes'
      },
      {
        name: 'Toluene',
        ec_number: '203-625-9',
        cas_number: '108-88-3',
        description: 'Methylated benzene derivative used as solvent'
      },
      {
        name: 'Formaldehyde',
        ec_number: '200-001-8',
        cas_number: '50-00-0',
        description: 'Simplest aldehyde compound used in resin production'
      },
      {
        name: 'Styrene',
        ec_number: '202-851-5',
        cas_number: '100-42-5',
        description: 'Organic compound used in plastic production'
      },
      {
        name: 'Acetone',
        ec_number: '200-662-2',
        cas_number: '67-64-1',
        description: 'Common organic solvent'
      },
      {
        name: 'Methanol',
        ec_number: '200-659-6',
        cas_number: '67-56-1',
        description: 'Simplest alcohol compound'
      },
      {
        name: 'Ethanol',
        ec_number: '200-578-6',
        cas_number: '64-17-5',
        description: 'Ethyl alcohol used in various applications'
      },
      {
        name: 'Phenol',
        ec_number: '203-632-7',
        cas_number: '108-95-2',
        description: 'Aromatic compound used in resin production'
      },
      {
        name: 'Aniline',
        ec_number: '200-539-3',
        cas_number: '62-53-3',
        description: 'Aromatic amine used in dye production'
      },
      {
        name: 'Chlorobenzene',
        ec_number: '203-628-5',
        cas_number: '108-90-7',
        description: 'Chlorinated aromatic compound'
      }
    ];

    for (const substance of substances) {
      // Check if substance already exists
      const { data: existing } = await supabase
        .from('substance')
        .select('id')
        .eq('cas_number', substance.cas_number)
        .single();
      
      if (existing) {
        console.log(`📋 Substance already exists: ${substance.name}`);
        continue;
      }

      const { error } = await supabase
        .from('substance')
        .insert(substance);
      
      if (error) {
        console.log(`⚠️ Warning: Could not insert substance ${substance.name}:`, error.message);
      } else {
        console.log(`✅ Added substance: ${substance.name}`);
      }
    }
    
    // Seed sample companies
    console.log('🏢 Seeding sample companies...');
    const companies = [
      {
        name: 'Kimteks Kimya Ltd. Şti.',
        vat_number: '1234567890',
        address: 'İstanbul, Türkiye',
        contact_email: 'info@kimteks.com',
        contact_phone: '+90 212 123 4567'
      },
      {
        name: 'Petkim Petrokimya Holding A.Ş.',
        vat_number: '0987654321',
        address: 'İzmir, Türkiye',
        contact_email: 'info@petkim.com.tr',
        contact_phone: '+90 232 987 6543'
      },
      {
        name: 'BASF Türk Kimya San. Ltd. Şti.',
        vat_number: '1122334455',
        address: 'İstanbul, Türkiye',
        contact_email: 'info@basf.com.tr',
        contact_phone: '+90 212 334 4455'
      }
    ];

    for (const company of companies) {
      // Check if company already exists
      const { data: existing } = await supabase
        .from('company')
        .select('id')
        .eq('vat_number', company.vat_number)
        .single();
      
      if (existing) {
        console.log(`🏢 Company already exists: ${company.name}`);
        continue;
      }

      const { error } = await supabase
        .from('company')
        .insert(company);
      
      if (error) {
        console.log(`⚠️ Warning: Could not insert company ${company.name}:`, error.message);
      } else {
        console.log(`✅ Added company: ${company.name}`);
      }
    }

    console.log('🎉 Database seeding completed successfully!');
    console.log('\n📝 Next steps:');
    console.log('1. Run the app: npm run dev');
    console.log('2. Sign up with magic link authentication');
    console.log('3. Complete onboarding to create your profile');
    console.log('4. Create your first MBDF room');
    
  } catch (error) {
    console.error('❌ Database seeding failed:', error);
    process.exit(1);
  }
}

// Handle process termination
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

process.on('SIGINT', () => {
  console.log('\n👋 Seeding interrupted');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n👋 Seeding terminated');
  process.exit(0);
});

seedDatabase();