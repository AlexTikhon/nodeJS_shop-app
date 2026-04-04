const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');
const sendgridTransport = require('nodemailer-sendgrid-transport');

const User = require('../models/user');

const mailFrom = process.env.MAIL_FROM || 'shop@example.com';
const transporter = process.env.SENDGRID_API_KEY
  ? nodemailer.createTransport(
      sendgridTransport({
        auth: {
          api_key: process.env.SENDGRID_API_KEY
        }
      })
    )
  : null;

exports.getLogin = (req, res) => {
  res.render('auth/login', {
    path: '/login',
    pageTitle: 'Login'
  });
};

exports.getSignup = (req, res) => {
  res.render('auth/signup', {
    path: '/signup',
    pageTitle: 'Signup'
  });
};

exports.postSignup = (req, res, next) => {
  const name = req.body.name;
  const email = req.body.email;
  const password = req.body.password;
  const confirmPassword = req.body.confirmPassword;

  if (password !== confirmPassword) {
    req.flash('error', 'Passwords do not match.');
    return res.redirect('/signup');
  }

  User.findOne({ email: email })
    .then((userDoc) => {
      if (userDoc) {
        req.flash('error', 'E-Mail exists already, please pick a different one.');
        return res.redirect('/signup');
      }

      return bcrypt
        .hash(password, 12)
        .then((hashedPassword) => {
          const user = new User({
            name: name,
            email: email,
            password: hashedPassword,
            cart: {
              items: []
            }
          });

          return user.save();
        })
        .then(() => {
          req.flash('success', 'Account created. You can log in now.');

          if (!transporter) {
            return res.redirect('/login');
          }

          return transporter
            .sendMail({
              to: email,
              from: mailFrom,
              subject: 'Signup succeeded!',
              html: '<h1>You successfully signed up!</h1>'
            })
            .then(() => {
              res.redirect('/login');
            })
            .catch((err) => {
              console.log(err);
              res.redirect('/login');
            });
        });
    })
    .catch((err) => {
      next(err);
    });
};

exports.postLogin = (req, res, next) => {
  const email = req.body.email;
  const password = req.body.password;

  User.findOne({ email: email })
    .then((user) => {
      if (!user) {
        req.flash('error', 'Invalid email or password.');
        return res.redirect('/login');
      }

      return bcrypt.compare(password, user.password).then((doMatch) => {
        if (!doMatch) {
          req.flash('error', 'Invalid email or password.');
          return res.redirect('/login');
        }

        req.session.isLoggedIn = true;
        req.session.user = user;
        req.session.save((err) => {
          if (err) {
            return next(err);
          }

          res.redirect('/');
        });
      });
    })
    .catch((err) => {
      next(err);
    });
};

exports.postLogout = (req, res, next) => {
  req.session.destroy((err) => {
    if (err) {
      return next(err);
    }

    res.redirect('/login');
  });
};
