const mongoose = require('mongoose');

// Open the default MongoDB connection used across the app.
const connectToDb = () => {
  const mongoUri = process.env.MONGODB_URI;
  return mongoose.connect(mongoUri);
};

exports.connectToDb = connectToDb;
exports.mongoose = mongoose;
