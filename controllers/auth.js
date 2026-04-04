const User = require('../models/user');

exports.getLogin = (req, res) => {
  res.render('auth/login', {
    path: '/login',
    pageTitle: 'Login'
  });
};

exports.postLogin = (req, res, next) => {
  User.findOne({ email: 'max@test.com' })
    .then((user) => {
      if (!user) {
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
