const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

async function run() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    const usersCollection = mongoose.connection.db.collection('users');
    
    const email = 'kitchen@nexcrow.com';
    const password = 'kitchen';
    
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);
    
    // Upsert the kitchen user
    await usersCollection.updateOne(
      { email },
      {
        $set: {
          name: 'Kitchen Staff',
          email,
          passwordHash,
          role: 'kitchen',
          status: 'active',
          isActive: true,
          updatedAt: new Date()
        },
        $setOnInsert: {
          createdAt: new Date(),
          __v: 0
        }
      },
      { upsert: true }
    );
    
    console.log('Successfully created/updated kitchen mock user.');
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

run();
