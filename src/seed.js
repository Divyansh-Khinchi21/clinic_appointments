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

  console.log('Seeding initial data...');

  // Create Demo Patient
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash('password123', salt);

  await queryRun(
    `INSERT OR IGNORE INTO users (name, email, password, role, phone) VALUES (?, ?, ?, ?, ?)`,
    ['Divyansh Khinchi', 'divyanshkhinchi66@gmail.com', hashedPassword, 'patient', '+91 9667066366']
  );

  await queryRun(
    `INSERT OR IGNORE INTO users (name, email, password, role, phone) VALUES (?, ?, ?, ?, ?)`,
    ['Dr. Anjali Mehta', 'anjali@carepulse.com', hashedPassword, 'doctor', '+91 9829012345']
  );

  // Initial Doctors List
  const doctors = [
    {
      name: 'Dr. Rajesh Sharma',
      specialty: 'Cardiology',
      qualification: 'MBBS, MD, DM (Cardiology)',
      experience: 15,
      fee: 800,
      rating: 4.9,
      review_count: 124,
      clinic_address: 'Apex Heart Care Clinic, Malviya Nagar',
      city: 'Jaipur',
      available_days: JSON.stringify(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']),
      avatar: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=300&auto=format&fit=crop&q=80',
      bio: 'Senior Cardiologist specializing in interventional cardiology and preventative heart care with 15+ years of experience.'
    },
    {
      name: 'Dr. Priya Nair',
      specialty: 'Dermatology',
      qualification: 'MBBS, MD (Dermatology)',
      experience: 9,
      fee: 600,
      rating: 4.8,
      review_count: 98,
      clinic_address: 'GlowSkin Clinic, C-Scheme',
      city: 'Jaipur',
      available_days: JSON.stringify(['Mon', 'Wed', 'Fri', 'Sat']),
      avatar: 'https://images.unsplash.com/photo-1594824813566-82823d5afe4a?w=300&auto=format&fit=crop&q=80',
      bio: 'Expert Dermatologist providing clinical and cosmetic skin treatments, acne management, and hair care therapies.'
    },
    {
      name: 'Dr. Amit Verma',
      specialty: 'Orthopedics',
      qualification: 'MBBS, MS (Orthopedics)',
      experience: 12,
      fee: 750,
      rating: 4.7,
      review_count: 85,
      clinic_address: 'Joint & Spine Care Center, Vaishali Nagar',
      city: 'Jaipur',
      available_days: JSON.stringify(['Mon', 'Tue', 'Thu', 'Fri']),
      avatar: 'https://images.unsplash.com/photo-1537368910025-700350fe46c7?w=300&auto=format&fit=crop&q=80',
      bio: 'Specialist in joint replacement, sports injury rehab, and trauma surgeries.'
    },
    {
      name: 'Dr. Sneha Mathur',
      specialty: 'Pediatrics',
      qualification: 'MBBS, DCH, MD (Pediatrics)',
      experience: 11,
      fee: 500,
      rating: 4.9,
      review_count: 142,
      clinic_address: 'Little Angels Child Clinic, Mansarovar',
      city: 'Jaipur',
      available_days: JSON.stringify(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']),
      avatar: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=300&auto=format&fit=crop&q=80',
      bio: 'Compassionate Pediatrician caring for infant growth, vaccinations, and childhood illnesses.'
    },
    {
      name: 'Dr. Vikramaditya Singh',
      specialty: 'Neurology',
      qualification: 'MBBS, MD, DM (Neurology)',
      experience: 18,
      fee: 1000,
      rating: 4.9,
      review_count: 210,
      clinic_address: 'Neuro Care & Brain Institute, Raja Park',
      city: 'Jaipur',
      available_days: JSON.stringify(['Mon', 'Wed', 'Fri']),
      avatar: 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=300&auto=format&fit=crop&q=80',
      bio: 'Leading Neurologist treating migraines, epilepsy, stroke rehab, and neuro-degenerative disorders.'
    },
    {
      name: 'Dr. Sunita Gupta',
      specialty: 'General Medicine',
      qualification: 'MBBS, MD (General Medicine)',
      experience: 14,
      fee: 500,
      rating: 4.6,
      review_count: 76,
      clinic_address: 'City Care Polyclinic, Tonk Road',
      city: 'Jaipur',
      available_days: JSON.stringify(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']),
      avatar: 'https://images.unsplash.com/photo-1582750433449-648ed127bb54?w=300&auto=format&fit=crop&q=80',
      bio: 'General Physician managing diabetes, hypertension, seasonal fever, and holistic preventive checkups.'
    },
    {
      name: 'Dr. Rohan Joshi',
      specialty: 'ENT Specialist',
      qualification: 'MBBS, MS (ENT)',
      experience: 8,
      fee: 550,
      rating: 4.7,
      review_count: 64,
      clinic_address: 'Swara ENT Care, Sodala',
      city: 'Jaipur',
      available_days: JSON.stringify(['Tue', 'Thu', 'Fri', 'Sat']),
      avatar: 'https://images.unsplash.com/photo-1537368910025-700350fe46c7?w=300&auto=format&fit=crop&q=80',
      bio: 'ENT Surgeon specializing in sinus treatment, ear surgeries, and voice therapy.'
    },
    {
      name: 'Dr. Meenakshi Roy',
      specialty: 'Gynecology',
      qualification: 'MBBS, MS (OB-GYN)',
      experience: 16,
      fee: 850,
      rating: 4.9,
      review_count: 189,
      clinic_address: 'Mother & Child Care Center, Jagatpura',
      city: 'Jaipur',
      available_days: JSON.stringify(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']),
      avatar: 'https://images.unsplash.com/photo-1594824813566-82823d5afe4a?w=300&auto=format&fit=crop&q=80',
      bio: 'Expert Gynecologist & Obstetrician specializing in high-risk pregnancy care and laparoscopic surgery.'
    }
  ];

  for (const doc of doctors) {
    await queryRun(
      `INSERT INTO doctors (name, specialty, qualification, experience, fee, rating, review_count, clinic_address, city, available_days, avatar, bio)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        doc.name,
        doc.specialty,
        doc.qualification,
        doc.experience,
        doc.fee,
        doc.rating,
        doc.review_count,
        doc.clinic_address,
        doc.city,
        doc.available_days,
        doc.avatar,
        doc.bio
      ]
    );
  }

  // Insert sample appointment for demo user
  const user = await queryGet('SELECT id FROM users WHERE email = ?', ['divyanshkhinchi66@gmail.com']);
  const doc = await queryGet('SELECT id FROM doctors WHERE specialty = ?', ['Cardiology']);

  if (user && doc) {
    await queryRun(
      `INSERT INTO appointments (patient_id, doctor_id, patient_name, patient_phone, appointment_date, time_slot, symptoms, is_emergency, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        user.id,
        doc.id,
        'Divyansh Khinchi',
        '+91 9667066366',
        '2026-09-18',
        '10:30 AM',
        'Routine blood pressure checkup and routine ECG review.',
        0,
        'Confirmed'
      ]
    );
  }

  // Log system action
  await queryRun(
    `INSERT INTO system_logs (action, details) VALUES (?, ?)`,
    ['DATABASE_SEEDED', 'Initial doctors, demo user Divyansh Khinchi, and sample appointments created successfully.']
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
