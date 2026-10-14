import dns from 'node:dns';

const resolver = new dns.promises.Resolver();
resolver.setServers(['1.1.1.1', '8.8.8.8']);
dns.setServers(['1.1.1.1', '8.8.8.8']);
if (typeof dns.setDefaultResultOrder === 'function') {
  dns.setDefaultResultOrder('ipv4first');
}

const systemLookup = dns.lookup.bind(dns);

function lookupWithTimeout(hostname, family) {
  const op = family === 6 ? resolver.resolve6(hostname) : resolver.resolve4(hostname);
  return Promise.race([
    op,
    new Promise((_, reject) => {
      setTimeout(() => reject(new Error('dns timeout')), 4000);
    }),
  ]);
}

function patchedLookup(hostname, options, callback) {
  if (typeof options === 'function') {
    callback = options;
    options = {};
  }
  const opts = typeof options === 'number' ? { family: options } : (options || {});
  lookupWithTimeout(hostname, opts.family)
    .then((addresses) => {
      if (!addresses || addresses.length === 0) {
        systemLookup(hostname, options, callback);
        return;
      }
      const family = opts.family === 6 ? 6 : 4;
      if (opts.all) {
        callback(null, addresses.map((address) => ({ address, family })));
        return;
      }
      callback(null, addresses[0], family);
    })
    .catch(() => systemLookup(hostname, options, callback));
}

dns.lookup = patchedLookup;
dns.promises.lookup = (hostname, options) => new Promise((resolve, reject) => {
  patchedLookup(hostname, options || {}, (err, address, family) => {
    if (err) {
      reject(err);
      return;
    }
    if (options && options.all) resolve(address);
    else resolve({ address, family });
  });
});
