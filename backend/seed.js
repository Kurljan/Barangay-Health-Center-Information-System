'use strict';
require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');

const User            = require('./models/User');
const PrenatalPatient = require('./models/PrenatalPatient');
const Child           = require('./models/Child');
const AuditLog        = require('./models/AuditLog');
const Report          = require('./models/Report');
const Settings        = require('./models/Settings');

const connectDB = require('./config/db');

async function seedDatabase() {
  await connectDB();
  console.log('🌱 Starting database seeding...');

  try {
    // 1. Clear existing data
    await User.deleteMany({});
    await PrenatalPatient.deleteMany({});
    await Child.deleteMany({});
    await AuditLog.deleteMany({});
    await Report.deleteMany({});
    await Settings.deleteMany({});
    console.log('🧹 Cleared existing collections.');

    // 2. Seed Settings
    await Settings.create({
      barangayName:     'Barangay San Jose',
      municipality:     'Municipality of San Pedro, Laguna',
      healthCenterName: 'San Jose Barangay Health Center',
      address:          'Brgy. San Jose, San Pedro, Laguna 4023',
      contact:          '(049) 561-2345',
    });
    console.log('⚙️ Settings seeded.');

    // 3. Seed Users
    const users = [
      { name: 'System Administrator', username: 'admin',    passwordHash: 'admin123',   role: 'Admin',   contact: '09171234561' },
      { name: 'Maria S. Santos',      username: 'midwife',  passwordHash: 'midwife123', role: 'Midwife', contact: '09182345672' },
      { name: 'Ana P. Reyes',         username: 'bhw',      passwordHash: 'bhw123',     role: 'BHW',     contact: '09193456783' },
      { name: 'Gloria C. Mendoza',    username: 'midwife2', passwordHash: 'midwife123', role: 'Midwife', contact: '09204567894' },
      { name: 'Rosa D. Cruz',         username: 'bhw2',     passwordHash: 'bhw123',     role: 'BHW',     contact: '09215678905', status: 'Archived' },
    ];
    await User.create(users);
    console.log(`👤 ${users.length} Users seeded.`);

    // 4. Helpers for dates
    const today = new Date();
    const agoISO = d => new Date(today.getTime() - d * 86400000).toISOString();

    // 5. Seed Prenatal Patients
    const prenatal = [
      {
        name: 'Liza M. Fernandez', age: 28, lmp: agoISO(90), edd: agoISO(-190), gravida: 2, para: 1,
        address: 'Purok 1, San Jose', contact: '09221234561', status: 'Active', highRisk: false,
        visits: [
          { date: agoISO(60), aog: 13, bp: '110/70', weight: 55.2, fundalHeight: 14, fhr: 148, remarks: 'Normal prenatal visit.' },
          { date: agoISO(30), aog: 17, bp: '115/75', weight: 57.0, fundalHeight: 18, fhr: 150, remarks: 'All vitals normal.' },
        ],
        createdBy: 'midwife'
      },
      {
        name: 'Carmen R. Ramos', age: 35, lmp: agoISO(140), edd: agoISO(-140), gravida: 3, para: 2,
        address: 'Purok 3, San Jose', contact: '09231234562', status: 'High-Risk', highRisk: true,
        highRiskNote: 'Hypertension — BP consistently elevated. Referred to OB-Gyne.',
        visits: [
          { date: agoISO(100), aog: 6, bp: '140/90', weight: 68.0, fundalHeight: 8, fhr: 145, remarks: 'High BP noted.' },
        ],
        createdBy: 'midwife'
      },
      {
        name: 'Susan A. Dela Cruz', age: 22, lmp: agoISO(50), edd: agoISO(-230), gravida: 1, para: 0,
        address: 'Purok 2, San Jose', contact: '09241234563', status: 'Active',
        visits: [], createdBy: 'midwife'
      },
      {
        name: 'Maricel B. Santos', age: 30, lmp: agoISO(300), edd: agoISO(-20), gravida: 2, para: 1,
        address: 'Purok 4, San Jose', contact: '09251234564', status: 'Delivered',
        visits: [
          { date: agoISO(200), aog: 14, bp: '110/70', weight: 58.0, fundalHeight: 15, fhr: 142, remarks: 'Normal.' },
        ],
        delivery: { date: agoISO(20), type: 'Normal Spontaneous Delivery', outcome: 'Live Birth', birthWeight: 3.2 },
        createdBy: 'midwife'
      }
    ];
    await PrenatalPatient.create(prenatal);
    console.log(`🤰 ${prenatal.length} Prenatal Patients seeded.`);

    // 6. Seed Children
    const children = [
      {
        name: 'Baby John Fernandez', dob: agoISO(60), sex: 'Male', motherName: 'Liza M. Fernandez',
        address: 'Purok 1, San Jose', createdBy: 'midwife',
        vaccines: [
          { vaccineId: 'bcg', dose: 1, date: agoISO(60), givenBy: 'Maria S. Santos' },
          { vaccineId: 'hepb', dose: 1, date: agoISO(60), givenBy: 'Maria S. Santos' },
          { vaccineId: 'dpt', dose: 1, date: agoISO(18), givenBy: 'Maria S. Santos' },
        ]
      },
      {
        name: 'Mia Santos', dob: agoISO(280), sex: 'Female', motherName: 'Maricel B. Santos',
        address: 'Purok 4, San Jose', createdBy: 'midwife',
        vaccines: [
          { vaccineId: 'bcg', dose: 1, date: agoISO(280), givenBy: 'Maria S. Santos' },
          { vaccineId: 'mcv', dose: 1, date: agoISO(6), givenBy: 'Gloria C. Mendoza' },
        ]
      }
    ];
    await Child.create(children);
    console.log(`👶 ${children.length} Children seeded.`);

    console.log('✅ Seeding completed successfully!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Seeding failed:', err);
    process.exit(1);
  }
}

seedDatabase();
