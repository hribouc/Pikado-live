const headers = {'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store'};
const reply = (statusCode, body) => ({statusCode, headers, body: JSON.stringify(body)});

exports.handler = async (event) => {
 if (event.httpMethod !== 'POST') return {...reply(405, {error: 'Method not allowed'}), headers: {...headers, Allow: 'POST'}};
 const key = (process.env.OPENAI_API_KEY || '').trim();
 if (!key) return reply(503, {error: 'Glasovna storitev ni nastavljena. Skrbnik mora v Netlify nastaviti OPENAI_API_KEY.'});
 if (key === 'OPENAI_API_KEY') return reply(503, {error: 'V Netlify je kot vrednost shranjeno ime OPENAI_API_KEY. V polje Value vnesi dejanski skrivni API ključ in ponovno objavi aplikacijo.'});
 if (!/^sk-[A-Za-z0-9_-]+$/.test(key)) return reply(503, {error: 'API ključ v Netlify nima veljavne oblike. Preveri polje Value; vanj spada samo skrivni OpenAI API ključ.'});
 try {
  const type = (event.headers?.['content-type'] || event.headers?.['Content-Type'] || 'audio/mp4').split(';')[0].trim().toLowerCase();
  const extensions = {'audio/webm': 'webm', 'audio/mp4': 'mp4', 'audio/x-m4a': 'm4a', 'audio/m4a': 'm4a', 'audio/wav': 'wav', 'audio/x-wav': 'wav', 'audio/mpeg': 'mp3', 'audio/ogg': 'ogg'};
  if (!extensions[type]) return reply(415, {error: 'Format zvočnega posnetka ni podprt.'});
  const bytes = Buffer.from(event.body || '', event.isBase64Encoded ? 'base64' : 'utf8');
  if (!bytes.length || bytes.length > 3000000) return reply(400, {error: 'Neveljaven ali predolg posnetek.'});
  const form = new FormData();
  form.append('file', new Blob([bytes], {type}), 'pikado.' + extensions[type]);
  form.append('model', 'gpt-4o-mini-transcribe');
  form.append('language', 'sl');
  form.append('prompt', 'Slovensko izgovorjeno število točk pri pikadu, od nič do sto osemdeset. Primeri: nič, šestdeset, enaindvajset, sto enaindvajset, sto osemdeset.');
  const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
   method: 'POST', headers: {Authorization: 'Bearer ' + key}, body: form, signal: AbortSignal.timeout(25000)
  });
  const result = await response.json();
  if (!response.ok) {
   const code = result?.error?.code || result?.error?.type || 'unknown';
   // Never log or return the provider's raw error message: it can contain part of a key.
   console.warn('Transcription failed', {httpStatus: response.status, code: String(code).replace(/[^a-z0-9_]/gi, '').slice(0, 60)});
   const descriptions = {
    invalid_api_key: 'OpenAI je zavrnil API ključ. Skrbnik mora v Netlify zamenjati vrednost OPENAI_API_KEY z veljavnim ključem in ponovno objaviti aplikacijo.',
    credit_balance_exhausted: 'Na OpenAI API računu za ta ključ je porabljeno dobroimetje. Preveri Billing in dobroimetje organizacije, ki ji pripada ključ.',
    insufficient_quota: 'Na OpenAI API računu ni razpoložljivega dobroimetja oziroma obračunavanja.',
    billing_hard_limit_reached: 'Dosežena je omejitev porabe OpenAI API.',
    model_not_found: 'Model za prepoznavo ni na voljo za ta API račun.',
    unsupported_file: 'Format zvočnega posnetka ni podprt.',
    invalid_request_error: 'Zahteva za prepoznavanje zvoka ni veljavna.'
   };
   return reply(502, {error: descriptions[code] || (response.status === 429 ? 'Storitev je trenutno preobremenjena. Poskusi znova.' : 'Prepoznava trenutno ni uspela. Poskusi znova.')});
  }
  return reply(200, {text: typeof result.text === 'string' ? result.text : ''});
 } catch (error) {
  return reply(502, {error: error.name === 'TimeoutError' ? 'Prepoznava traja predolgo. Poskusi znova.' : 'Prepoznava trenutno ni uspela. Poskusi znova.'});
 }
};
