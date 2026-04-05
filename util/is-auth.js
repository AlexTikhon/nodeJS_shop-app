module.exports = (req, res, next) => {
  if (!req.session.isLoggedIn || !req.user) {
    return res.redirect('/login');
  }

  next();
};
