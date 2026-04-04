const mongoose = require('mongoose');

const connectToDb = () => {
	const mongoUri = process.env.MONGODB_URI;
	return mongoose.connect(mongoUri);
};

exports.connectToDb = connectToDb;
exports.mongoose = mongoose;
