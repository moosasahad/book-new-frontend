const mongoose = require('mongoose');
require('dotenv').config();

async function run() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    const usersCollection = mongoose.connection.db.collection('users');
    const users = await usersCollection.find({}).toArray();
    
    for (const user of users) {
      const isBlocked = user.status === 'blocked';
      await usersCollection.updateOne(
        { _id: user._id },
        {
          $set: {
            status: isBlocked ? 'blocked' : 'active',
            isActive: !isBlocked
          }
        }
      );
    }
    
    console.log('Successfully updated users.');
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

run();
