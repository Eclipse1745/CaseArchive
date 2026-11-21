// Accepts a full invite link (.../?invite=TOKEN) or the bare token. Returns the token, or null.
export function inviteTokenFrom(text) {
  const t = String(text || '').trim();
  try {
    const fromUrl = new URL(t).searchParams.get('invite');
    if (fromUrl) return fromUrl;
  } catch (e) {
    // not a URL: fall through and treat it as a bare token
  }
  return /^[A-Za-z0-9_-]{20,100}$/.test(t) ? t : null;
}
