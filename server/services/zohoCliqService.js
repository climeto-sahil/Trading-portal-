const DEFAULT_WEBHOOK = 'https://cliq.zoho.in/api/v2/channelsbyname/climetofreshupdate/message';

export function zohoCliqTarget() {
  const base = (process.env.ZOHO_CLIQ_WEBHOOK_BASE_URL || DEFAULT_WEBHOOK).trim();
  const key = (process.env.ZOHO_CLIQ_ZAPIKEY || '').trim();
  return { base, keyConfigured: Boolean(key) };
}

export async function sendZohoCliqMessage(text, fetchImpl = globalThis.fetch) {
  const base = (process.env.ZOHO_CLIQ_WEBHOOK_BASE_URL || DEFAULT_WEBHOOK).trim();
  const key = (process.env.ZOHO_CLIQ_ZAPIKEY || '').trim();
  if (!key) {
    return { ok: false, message: 'ZOHO_CLIQ_ZAPIKEY is not set on the server.' };
  }

  let url;
  try {
    url = new URL(base);
  } catch {
    return { ok: false, message: 'Zoho Cliq webhook URL is invalid.' };
  }
  if (url.protocol !== 'https:' || url.hostname !== 'cliq.zoho.in') {
    return { ok: false, message: 'Zoho Cliq webhook host is not allowed.' };
  }
  url.searchParams.set('zapikey', key);

  let response;
  try {
    response = await fetchImpl(url.toString(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: String(text || '') }),
      signal: AbortSignal.timeout(15000),
    });
  } catch (error) {
    const message = error?.name === 'TimeoutError' || error?.name === 'AbortError'
      ? 'Zoho Cliq did not respond in time.'
      : 'Could not reach Zoho Cliq.';
    return { ok: false, message };
  }

  if (!response.ok) {
    return { ok: false, message: `Zoho Cliq rejected the message (${response.status}).` };
  }
  return { ok: true, message: '' };
}
