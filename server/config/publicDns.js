import dns from 'node:dns';

const systemLookup = dns.lookup.bind(dns);

function normalizeOptions(options) {
  if (typeof options === 'number') return { family: options };
  return options || {};
}

async function dohQuery(hostname, type) {
  const endpoints = [
    `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(hostname)}&type=${type}`,
    `https://dns.google/resolve?name=${encodeURIComponent(hostname)}&type=${type}`,
  ];
  let lastError;
  for (const endpoint of endpoints) {
    try {
      const response = await fetch(endpoint, {
        headers: { accept: 'application/dns-json' },
        signal: AbortSignal.timeout(8000),
      });
      if (!response.ok) throw new Error(`DNS ${response.status}`);
      const body = await response.json();
      if (body.Status && body.Status !== 0) throw new Error(`DNS status ${body.Status}`);
      return body.Answer || [];
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError || new Error('DNS lookup failed');
}

async function resolveAddresses(hostname, family) {
  if (hostname === 'localhost' || netIsAddress(hostname)) return [hostname];
  const type = family === 6 ? 'AAAA' : 'A';
  const typeNum = family === 6 ? 28 : 1;
  const answers = await dohQuery(hostname, type);
  const addresses = answers.filter((answer) => answer.type === typeNum && answer.data).map((answer) => answer.data);
  if (addresses.length === 0) throw new Error(`No ${type} record for ${hostname}`);
  return addresses;
}

function netIsAddress(hostname) {
  return /^\d{1,3}(\.\d{1,3}){3}$/.test(hostname) || hostname.includes(':');
}

const DOH_HOSTS = new Set(['cloudflare-dns.com', 'dns.google']);

export function publicLookup(hostname, options, callback) {
  if (typeof options === 'function') {
    callback = options;
    options = {};
  }
  if (DOH_HOSTS.has(hostname) || hostname === 'localhost' || netIsAddress(hostname)) {
    systemLookup(hostname, options, callback);
    return;
  }
  const opts = normalizeOptions(options);
  const family = opts.family === 6 ? 6 : 4;
  resolveAddresses(hostname, family)
    .then((addresses) => {
      if (opts.all) {
        callback(null, addresses.map((address) => ({ address, family })));
        return;
      }
      callback(null, addresses[0], family);
    })
    .catch(() => systemLookup(hostname, options, callback));
}

dns.lookup = publicLookup;
dns.promises.lookup = (hostname, options) => new Promise((resolve, reject) => {
  publicLookup(hostname, options || {}, (error, address, family) => {
    if (error) reject(error);
    else if (options && options.all) resolve(address);
    else resolve({ address, family });
  });
});

dns.promises.resolve4 = (hostname) => resolveAddresses(hostname, 4);
dns.promises.resolve6 = (hostname) => resolveAddresses(hostname, 6);
dns.promises.resolveSrv = async (hostname) => {
  const answers = await dohQuery(hostname, 'SRV');
  const records = answers
    .filter((answer) => answer.type === 33 && answer.data)
    .map((answer) => {
      const [priority, weight, port, ...nameParts] = String(answer.data).split(' ');
      return {
        priority: Number(priority),
        weight: Number(weight),
        port: Number(port),
        name: nameParts.join(' ').replace(/\.$/, ''),
      };
    });
  if (records.length === 0) throw new Error(`No SRV record for ${hostname}`);
  return records;
};
dns.promises.resolveTxt = async (hostname) => {
  const answers = await dohQuery(hostname, 'TXT');
  const records = answers
    .filter((answer) => answer.type === 16 && answer.data)
    .map((answer) => [String(answer.data).replace(/^"|"$/g, '')]);
  if (records.length === 0) throw new Error(`No TXT record for ${hostname}`);
  return records;
};

if (typeof dns.setDefaultResultOrder === 'function') {
  dns.setDefaultResultOrder('ipv4first');
}
