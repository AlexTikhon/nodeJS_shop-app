require('dotenv').config();
const path = require('path');

const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');

const errorController = require('./controllers/error');
const adminRoutes = require('./routes/admin');
const shopRoutes = require('./routes/shop');
const User = require('./models/user');

const app = express();

app.set('view engine', 'ejs');
app.set('views', 'views');

app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, 'public')));

app.use((req, res, next) => {
	if (!app.locals.userId) {
		return next();
	}

	User.findById(app.locals.userId)
		.then((user) => {
			if (!user) {
				return next();
			}

			req.user = user;
			next();
		})
		.catch((err) => {
			console.log(err);
			next(err);
		});
});

app.use('/admin', adminRoutes);
app.use(shopRoutes);

app.use(errorController.get404);

const port = Number(process.env.PORT) || 3000;
const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/shop';

mongoose
	.connect(mongoUri)
	.then(() => User.findOne({ email: 'max@test.com' }))
	.then((user) => {
		if (user) {
			return user;
		}

		const newUser = new User({
			name: 'Max',
			email: 'max@test.com',
			cart: {
				items: []
			}
		});

		return newUser.save();
	})
	.then((user) => {
		app.locals.userId = user._id;
		app.listen(port);
	})
	.catch((err) => {
		console.log(err);
	});
