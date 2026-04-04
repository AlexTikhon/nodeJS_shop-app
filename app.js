require('dotenv').config();
const path = require('path');

const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const session = require('express-session');
const MongoDBStore = require('connect-mongodb-session')(session);

const errorController = require('./controllers/error');
const adminRoutes = require('./routes/admin');
const authRoutes = require('./routes/auth');
const shopRoutes = require('./routes/shop');
const User = require('./models/user');

const app = express();
const port = Number(process.env.PORT) || 3000;
const mongoUri = process.env.MONGODB_URI;
const sessionSecret = process.env.SESSION_SECRET;
const store = new MongoDBStore({
	uri: mongoUri,
	collection: 'sessions'
});

app.set('view engine', 'ejs');
app.set('views', 'views');

app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(
	session({
		secret: sessionSecret,
		resave: false,
		saveUninitialized: false,
		store
	})
);

app.use((req, res, next) => {
	res.locals.isAuthenticated = req.session.isLoggedIn || false;
	next();
});

app.use((req, res, next) => {
	if (!req.session.user) {
		return next();
	}

	User.findById(req.session.user._id)
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

app.use(authRoutes);
app.use('/admin', adminRoutes);
app.use(shopRoutes);

app.use(errorController.get404);

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
	.then(() => {
		app.listen(port);
	})
	.catch((err) => {
		console.log(err);
	});
