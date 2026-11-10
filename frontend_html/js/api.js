// static/js/api.js - API client and SSE handling

export async function api(url, options = {}) {
  const r = await fetch(url, options);
  const v = await r.json();
  if (!r.ok) throw new Error(v.error || 'Something went wrong');
  return v;
}
