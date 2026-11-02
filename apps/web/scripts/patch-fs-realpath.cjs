const fs = require('fs');

function cleanPath(p) {
  if (typeof p === 'string' && p.includes("Samad's Elements")) {
    return p.replace(/Samad's Elements[\\/]CRM/gi, 'crm');
  }
  return p;
}

const origRealpathSync = fs.realpathSync;
fs.realpathSync = function (p, options) {
  const result = origRealpathSync(p, options);
  return cleanPath(result);
};
if (origRealpathSync.native) {
  fs.realpathSync.native = fs.realpathSync;
}

const origRealpath = fs.realpath;
fs.realpath = function (p, options, callback) {
  const cb = typeof options === 'function' ? options : callback;
  const opts = typeof options === 'function' ? undefined : options;

  return origRealpath(p, opts, (err, result) => {
    if (err) return cb(err);
    cb(null, cleanPath(result));
  });
};
if (origRealpath.native) {
  fs.realpath.native = fs.realpath;
}
