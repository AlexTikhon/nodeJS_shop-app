const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');
const sendgridTransport = require('nodemailer-sendgrid-transport');
const { validationResult } = require('express-validator');

const User = require('../models/user');

const appUrl = process.env.APP_URL || 'http://localhost:3000';
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

// Send an e-mail only when a transport is configured for the environment.
const sendMailIfConfigured = (message) => {
  if (!transporter) {
    return Promise.resolve();
  }

  return transporter.sendMail(message);
};

// Render the login page with empty defaults.
exports.getLogin = (req, res) => {
  res.render('auth/login', {
    path: '/login',
    pageTitle: 'Login',
    oldInput: {
      email: '',
      password: ''
    },
    validationErrors: []
  });
};

// Render the signup page with empty defaults.
exports.getSignup = (req, res) => {
  res.render('auth/signup', {
    path: '/signup',
    pageTitle: 'Signup',
    oldInput: {
      name: '',
      email: '',
      password: '',
      confirmPassword: ''
    },
    validationErrors: []
  });
};

// Create a new user account and optionally send a welcome e-mail.
exports.postSignup = (req, res, next) => {
  const name = req.body.name;
  const email = req.body.email;
  const password = req.body.password;
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(422).render('auth/signup', {
      path: '/signup',
      pageTitle: 'Signup',
      errorMessage: errors.array()[0].msg,
      oldInput: {
        name,
        email,
        password: '',
        confirmPassword: ''
      },
      validationErrors: errors.array()
    });
  }

  bcrypt
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
      return sendMailIfConfigured({
        to: email,
        from: mailFrom,
        subject: 'Signup succeeded!',
        html: '<h1>You successfully signed up!</h1>'
      });
    })
    .then(() => {
      res.redirect('/login');
    })
    .catch((err) => {
      next(err);
    });
};

// Authenticate a user and persist the login state in the session.
exports.postLogin = (req, res, next) => {
  const email = req.body.email;
  const password = req.body.password;
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(422).render('auth/login', {
      path: '/login',
      pageTitle: 'Login',
      errorMessage: errors.array()[0].msg,
      oldInput: {
        email,
        password: ''
      },
      validationErrors: errors.array()
    });
  }

  User.findOne({ email: email })
    .then((user) => {
      if (!user) {
        return res.status(422).render('auth/login', {
          path: '/login',
          pageTitle: 'Login',
          errorMessage: 'Invalid email or password.',
          oldInput: {
            email,
            password: ''
          },
          validationErrors: []
        });
      }

      return bcrypt.compare(password, user.password).then((doMatch) => {
        if (!doMatch) {
          return res.status(422).render('auth/login', {
            path: '/login',
            pageTitle: 'Login',
            errorMessage: 'Invalid email or password.',
            oldInput: {
              email,
              password: ''
            },
            validationErrors: []
          });
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

// Destroy the current session and log the user out.
exports.postLogout = (req, res, next) => {
  req.session.destroy((err) => {
    if (err) {
      return next(err);
    }

    res.redirect('/login');
  });
};

// Render the password reset request page.
exports.getReset = (req, res) => {
  res.render('auth/reset', {
    path: '/reset',
    pageTitle: 'Reset Password'
  });
};

// Generate a reset token and send the password reset e-mail.
exports.postReset = (req, res, next) => {
  crypto.randomBytes(32, (err, buffer) => {
    if (err) {
      return next(err);
    }

    const token = buffer.toString('hex');

    User.findOne({ email: req.body.email })
      .then((user) => {
        if (!user) {
          req.flash('error', 'No account with that e-mail found.');
          return res.redirect('/reset');
        }

        user.resetToken = token;
        user.resetTokenExpiration = Date.now() + 3600000;
        return user.save();
      })
      .then((user) => {
        if (!user) {
          return null;
        }

        req.flash('success', 'Reset link sent. Check your inbox.');
        return sendMailIfConfigured({
          to: user.email,
          from: mailFrom,
          subject: 'Password reset',
          html:
            '<p>You requested a password reset.</p>' +
            `<p>Click this <a href="${appUrl}/reset/${token}">link</a> to set a new password.</p>`
        });
      })
      .then(() => {
        res.redirect('/login');
      })
      .catch((error) => {
        next(error);
      });
  });
};

// Validate a reset token and render the new password form.
exports.getNewPassword = (req, res, next) => {
  const token = req.params.token;

  User.findOne({
    resetToken: token,
    resetTokenExpiration: { $gt: Date.now() }
  })
    .then((user) => {
      if (!user) {
        req.flash('error', 'Reset link is invalid or has expired.');
        return res.redirect('/reset');
      }

      res.render('auth/new-password', {
        path: '/new-password',
        pageTitle: 'New Password',
        userId: user._id.toString(),
        passwordToken: token
      });
    })
    .catch((err) => {
      next(err);
    });
};

// Persist a new password for a user with a valid reset token.
exports.postNewPassword = (req, res, next) => {
  const newPassword = req.body.password;
  const userId = req.body.userId;
  const passwordToken = req.body.passwordToken;
  let resetUser;

  User.findOne({
    resetToken: passwordToken,
    resetTokenExpiration: { $gt: Date.now() },
    _id: userId
  })
    .then((user) => {
      if (!user) {
        req.flash('error', 'Reset link is invalid or has expired.');
        return res.redirect('/reset');
      }

      resetUser = user;
      return bcrypt.hash(newPassword, 12);
    })
    .then((hashedPassword) => {
      if (!resetUser) {
        return null;
      }

      resetUser.password = hashedPassword;
      resetUser.resetToken = undefined;
      resetUser.resetTokenExpiration = undefined;
      return resetUser.save();
    })
    .then((result) => {
      if (!result) {
        return null;
      }

      req.flash('success', 'Password updated. You can log in now.');
      res.redirect('/login');
    })
    .catch((err) => {
      next(err);
    });
};
