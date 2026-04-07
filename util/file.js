const fs = require('fs');

// Delete a file if it exists and silently ignore missing files.
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
