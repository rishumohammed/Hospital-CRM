const fs = require('fs');
const path = require('path');
const Module = require('module');
const cp = require('child_process');

const repoRoot = path.resolve(__dirname, '..');

// Automatically mount S: virtual drive to repo root on Windows if not already mounted
if (process.platform === 'win32' && !fs.existsSync('S:\\')) {
  try {
    cp.execSync(`subst S: "${repoRoot}"`, { stdio: 'ignore' });
  } catch (err) {
    // Will be caught if sandboxed or restricted
  }
}

const sDriveActive = fs.existsSync('S:\\');

const sanitize = (p) => {
  if (typeof p === 'string' && sDriveActive) {
    return p
      .replace(/^[a-zA-Z]:[\\\/]Consulting[\\\/]Samad's Elements[\\\/]CRM/i, 'S:')
      .replace(/^D:[\\\/]node_modules/i, 'S:\\node_modules')
      .replace(/^D:\/node_modules/i, 'S:/node_modules');
  }
  return p;
};

// 1. Process cwd
if (process.cwd) {
  const origCwd = process.cwd.bind(process);
  process.cwd = function() {
    return sanitize(origCwd());
  };
}

// 2. Realpath Sync
const origRealpathSync = fs.realpathSync.bind(fs);
fs.realpathSync = function(p, options) {
  const cleanP = sanitize(p);
  try {
    return sanitize(origRealpathSync(cleanP, options));
  } catch (err) {
    if (err && err.code === 'ENOENT' && typeof cleanP === 'string') {
      const onS = cleanP.replace(/^[a-zA-Z]:/i, 'S:');
      if (fs.existsSync(onS)) {
        try {
          return sanitize(origRealpathSync(onS, options));
        } catch {
          return onS;
        }
      }
    }
    throw err;
  }
};
fs.realpathSync.native = fs.realpathSync;

// 3. Realpath Callback
if (fs.realpath) {
  const origRealpath = fs.realpath.bind(fs);
  fs.realpath = function(p, options, callback) {
    if (typeof options === 'function') {
      callback = options;
      options = undefined;
    }
    const cleanP = sanitize(p);
    return origRealpath(cleanP, options, (err, res) => {
      if (err) {
        if (err.code === 'ENOENT' && typeof cleanP === 'string') {
          const onS = cleanP.replace(/^[a-zA-Z]:/i, 'S:');
          if (fs.existsSync(onS)) {
            return origRealpath(onS, options, (err2, res2) => {
              if (err2) return callback(null, onS);
              return callback(null, sanitize(res2));
            });
          }
        }
        return callback(err);
      }
      return callback(null, sanitize(res));
    });
  };
  fs.realpath.native = fs.realpath;
}

// 4. Realpath Promises
if (fs.promises && fs.promises.realpath) {
  const origPromises = fs.promises.realpath.bind(fs.promises);
  fs.promises.realpath = async function(p, options) {
    const cleanP = sanitize(p);
    try {
      const res = await origPromises(cleanP, options);
      return sanitize(res);
    } catch (err) {
      if (err && err.code === 'ENOENT' && typeof cleanP === 'string') {
        const onS = cleanP.replace(/^[a-zA-Z]:/i, 'S:');
        if (fs.existsSync(onS)) {
          try {
            const res = await origPromises(onS, options);
            return sanitize(res);
          } catch {
            return onS;
          }
        }
      }
      throw err;
    }
  };
  fs.promises.realpath.native = fs.promises.realpath;
}

// 5. Path resolve & relative
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

// 6. Ignore package guard for absolute paths
const origRequire = Module.prototype.require;
Module.prototype.require = function(id) {
  const res = origRequire.apply(this, arguments);
  if (typeof id === 'string' && (id === 'ignore' || id.includes('node_modules/ignore') || id.includes('node_modules\\ignore'))) {
    if (typeof res === 'function') {
      const wrapped = function(...args) {
        const ig = res(...args);
        const origIgnores = ig.ignores ? ig.ignores.bind(ig) : null;
        const origTest = ig._test ? ig._test.bind(ig) : null;
        if (origIgnores) {
          ig.ignores = function(pathname) {
            if (typeof pathname === 'string' && (/^[a-zA-Z]:/.test(pathname) || /^[\\\/]/.test(pathname))) {
              return false;
            }
            return origIgnores(pathname);
          };
        }
        if (origTest) {
          ig._test = function(pathname, ...rest) {
            if (typeof pathname === 'string' && (/^[a-zA-Z]:/.test(pathname) || /^[\\\/]/.test(pathname))) {
              return { ignored: false, unignored: false };
            }
            return origTest(pathname, ...rest);
          };
        }
        return ig;
      };
      return Object.assign(wrapped, res);
    }
  }
  return res;
};
