// Allow access only when the current request has an authenticated user.
module.exports = (req, res, next) => {
  if (!req.session.isLoggedIn || !req.user) {
    return res.redirect('/login');
  }

  next();
};
