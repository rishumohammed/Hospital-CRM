const fs = require('fs');
const path = require('path');

const sanitize = (p) => {
  if (typeof p === 'string') {
    return p.replace(/^[a-zA-Z]:[\\\/]Consulting[\\\/]Samad's Elements[\\\/]CRM/i, 'S:');
  }
  return p;
};

// 1. Sync
const origRealpathSync = fs.realpathSync.bind(fs);
fs.realpathSync = function(p, options) {
  return sanitize(origRealpathSync(p, options));
};
fs.realpathSync.native = fs.realpathSync;

// 2. Callback
if (fs.realpath) {
  const origRealpath = fs.realpath.bind(fs);
  fs.realpath = function(p, options, callback) {
    if (typeof options === 'function') {
      callback = options;
      options = undefined;
    }
    return origRealpath(p, options, (err, res) => {
      if (err) return callback(err);
      return callback(null, sanitize(res));
    });
  };
  fs.realpath.native = fs.realpath;
}

// 3. Promises
if (fs.promises && fs.promises.realpath) {
  const origPromises = fs.promises.realpath.bind(fs.promises);
  fs.promises.realpath = async function(p, options) {
    const res = await origPromises(p, options);
    return sanitize(res);
  };
  fs.promises.realpath.native = fs.promises.realpath;
}

// 4. Path resolve & relative
const origResolve = path.resolve.bind(path);
path.resolve = function(...args) {
  return sanitize(origResolve(...args));
};
if (path.win32 && path.win32.resolve) {
  const origWin32Resolve = path.win32.resolve.bind(path.win32);
  path.win32.resolve = function(...args) {
    return sanitize(origWin32Resolve(...args));
  };
}

const origRelative = path.relative.bind(path);
path.relative = function(from, to) {
  return origRelative(sanitize(from), sanitize(to));
};
if (path.win32 && path.win32.relative) {
  const origWin32Relative = path.win32.relative.bind(path.win32);
  path.win32.relative = function(from, to) {
    return origWin32Relative(sanitize(from), sanitize(to));
  };
}
