exports.get404 = (req, res) => {
  res.status(404).render('404', {
    pageTitle: 'Page Not Found',
    path: ''
  });
};

exports.get500 = (error, req, res, next) => {
  console.error(error);

  if (res.headersSent) {
    return next(error);
  }

  const statusCode = error.code === 'EBADCSRFTOKEN' ? 403 : error.httpStatusCode || 500;
  const pageTitle = statusCode === 403 ? 'Forbidden' : 'Error';

  res.status(statusCode).render('500', {
    pageTitle,
    path: '',
    statusCode,
    errorMessage:
      statusCode === 403
        ? 'Your form session is no longer valid. Please refresh the page and try again.'
        : 'Something went wrong. Please try again later.'
  });
};
