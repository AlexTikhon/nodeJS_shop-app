const fs = require('fs');

exports.deleteFile = (filePath) => {
  if (!filePath) {
    return Promise.resolve();
  }

  return fs.promises.unlink(filePath).catch((err) => {
    if (err.code !== 'ENOENT') {
      throw err;
    }
  });
};
