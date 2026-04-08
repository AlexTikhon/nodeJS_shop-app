const Module = require('module');
const path = require('path');

function loadWithMocks(modulePath, mocks) {
  const resolvedModulePath = path.resolve(modulePath);
  const originalLoad = Module._load;

  delete require.cache[resolvedModulePath];

  Module._load = function patchedLoad(request, parent, isMain) {
    if (Object.prototype.hasOwnProperty.call(mocks, request)) {
      return mocks[request];
    }

    return originalLoad.call(this, request, parent, isMain);
  };

  try {
    return require(resolvedModulePath);
  } finally {
    Module._load = originalLoad;
  }
}

module.exports = {
  loadWithMocks
};
