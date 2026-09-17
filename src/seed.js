const bcrypt = require('bcryptjs');
const { queryRun, queryGet, initDB } = require('./config/db');

const seedData = async () => {
  await initDB();

  // Check if doctors exist
  const existingDoc = await queryGet('SELECT COUNT(*) as count FROM doctors');
  if (existingDoc && existingDoc.count > 0) {
    console.log('Database already seeded.');
    return;
  }

  console.log('Seeding initial database tables...');

  // Create Demo Users
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash('password123', salt);

  // Demo Patient
  await queryRun(
    `INSERT OR IGNORE INTO users (name, email, password, role, phone) VALUES (?, ?, ?, ?, ?)`,
    ['Divyansh Khinchi', 'divyanshkhinchi66@gmail.com', hashedPassword, 'patient', '+91 9667066366']
  );

  await queryRun(
    `INSERT OR IGNORE INTO users (name, email, password, role, phone) VALUES (?, ?, ?, ?, ?)`,
    ['Patient A', 'patienta@test.com', hashedPassword, 'patient', '+91 9829011111']
  );

  // Demo Staff / Front Desk Manager
  await queryRun(
    `INSERT OR IGNORE INTO users (name, email, password, role, phone) VALUES (?, ?, ?, ?, ?)`,
    ['Front Desk Officer', 'staff@carepulse.com', hashedPassword, 'staff', '+91 9829099999']
  );

  // Doctors List including Dr. Sharma & Dr. Mehta (from test spec)
  const doctors = [
    {
      name: 'Dr. Sharma',
      specialization: 'Cardiology',
      qualification: 'MBBS, MD, DM (Cardiology)',
      experience: 15,
      fee: 800,
      rating: 4.9,
      clinic_address: 'Apex Heart Care Clinic, Malviya Nagar',
      city: 'Jaipur'
    },
    {
      name: 'Dr. Mehta',
      specialization: 'General Medicine',
      qualification: 'MBBS, MD (Internal Medicine)',
      experience: 12,
      fee: 600,
      rating: 4.8,
      clinic_address: 'City Care Polyclinic, C-Scheme',
      city: 'Jaipur'
    },
    {
      name: 'Dr. Priya Nair',
      specialization: 'Dermatology',
      qualification: 'MBBS, MD (Dermatology)',
      experience: 9,
      fee: 600,
      rating: 4.8,
      clinic_address: 'GlowSkin Clinic, Vaishali Nagar',
      city: 'Jaipur'
    },
    {
      name: 'Dr. Amit Verma',
      specialization: 'Orthopedics',
      qualification: 'MBBS, MS (Orthopedics)',
      experience: 14,
      fee: 750,
      rating: 4.7,
      clinic_address: 'Joint & Spine Center, Raja Park',
      city: 'Jaipur'
    }
  ];

  for (const doc of doctors) {
    await queryRun(
      `INSERT INTO doctors (name, specialization, qualification, experience, fee, rating, clinic_address, city)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [doc.name, doc.specialization, doc.qualification, doc.experience, doc.fee, doc.rating, doc.clinic_address, doc.city]
    );
  }

  // Log seeding completion
  await queryRun(
    `INSERT INTO system_logs (action, details) VALUES (?, ?)`,
    ['DATABASE_SEEDED', 'Doctors (Dr. Sharma, Dr. Mehta, etc.) and accounts seeded successfully.']
  );

  console.log('Seeding completed successfully!');
};

if (require.main === module) {
  seedData()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Seed error:', err);
      process.exit(1);
    });
}

module.exports = seedData;
