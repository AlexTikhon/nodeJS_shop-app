const mongoose = require('mongoose');

const connectToDb = () => {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/shop';
  return mongoose.connect(mongoUri);
};

exports.connectToDb = connectToDb;
exports.mongoose = mongoose;
