require('dotenv').config();
const path = require('path');

const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const session = require('express-session');
const MongoDBStore = require('connect-mongodb-session')(session);
const csrf = require('csurf');
const flash = require('connect-flash');
const bcrypt = require('bcryptjs');

const errorController = require('./controllers/error');
const adminRoutes = require('./routes/admin');
const authRoutes = require('./routes/auth');
const shopRoutes = require('./routes/shop');
const User = require('./models/user');

const app = express();
const port = Number(process.env.PORT) || 3000;
const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/shop';
const sessionSecret = process.env.SESSION_SECRET || 'change-this-session-secret';
const csrfProtection = csrf();
const store = new MongoDBStore({
  uri: mongoUri,
  collection: 'sessions'
});

store.on('error', (err) => {
  console.error('Session store error:', err);
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
app.use(flash());
app.use((req, res, next) => {
  res.locals.isAuthenticated = Boolean(req.session && req.session.isLoggedIn);
  res.locals.csrfToken = '';
  res.locals.errorMessage = req.flash('error')[0];
  res.locals.successMessage = req.flash('success')[0];
  next();
});
app.use(csrfProtection);
app.use((req, res, next) => {
  try {
    res.locals.csrfToken = req.csrfToken();
    next();
  } catch (err) {
    next(err);
  }
});

app.use((req, res, next) => {
  if (!req.session.user) {
    return next();
  }

  const userId = req.session.user._id;
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    req.session.destroy((sessionErr) => {
      if (sessionErr) {
        return next(sessionErr);
      }

      next();
    });
    return;
  }

  User.findById(userId)
    .then((user) => {
      if (!user) {
        req.session.destroy((sessionErr) => {
          if (sessionErr) {
            return next(sessionErr);
          }

          next();
        });
        return;
      }

      req.user = user;
      next();
    })
    .catch((err) => {
      next(err);
    });
});

app.use(authRoutes);
app.use('/admin', adminRoutes);
app.use(shopRoutes);

app.use(errorController.get404);
app.use(errorController.get500);

mongoose
  .connect(mongoUri)
  .then(() => User.findOne({ email: 'max@test.com' }))
  .then((user) => {
    if (user) {
      if (user.password) {
        return user;
      }

      return bcrypt.hash('secret', 12).then((hashedPassword) => {
        user.password = hashedPassword;
        return user.save();
      });
    }

    return bcrypt.hash('secret', 12).then((hashedPassword) => {
      const newUser = new User({
        name: 'Max',
        email: 'max@test.com',
        password: hashedPassword,
        cart: {
          items: []
        }
      });

      return newUser.save();
    });
  })
  .then(() => {
    app.listen(port);
  })
  .catch((err) => {
    console.error('Application startup failed:', err);
  });
