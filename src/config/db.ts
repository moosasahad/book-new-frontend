import mongoose from 'mongoose';

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/restaurant-pos');
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error: any) {
    if (error.message.includes('whitelist')) {
      console.error('CRITICAL: IP not whitelisted in MongoDB Atlas. Please add this IP to your Atlas whitelist.');
    }
    console.error(`MongoDB Connection Error: ${error.message}`);
    process.exit(1);
  }
};

export default connectDB;
