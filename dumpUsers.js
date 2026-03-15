const mongoose = require('mongoose');
const fs = require('fs');
require('dotenv').config();

async function run() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    const users = await mongoose.connection.db.collection('users').find({}).toArray();
    fs.writeFileSync('users_dump.json', JSON.stringify(users, null, 2), 'utf-8');
    console.log('Successfully wrote to users_dump.json');
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

run();
