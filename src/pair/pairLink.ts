/**
 * The pairing code as a link, so a QR code of it works with any phone's own
 * camera: scanning opens the app on the pairing page with the code already
 * filled in, and only the PIN is left to type.
 */

/** The server's code alphabet: no O/0, I/1 or S/5. */
const CODE = /^[ABCDEFGHJKLMNPQRTUVWXYZ2346789]{6}$/;

export function pairUrl(code: string, origin: string = window.location.origin): string {
  return `${origin}/pair?code=${encodeURIComponent(code)}`;
}

/**
 * The code in whatever was scanned or pasted: a pairing link, or the bare
 * code. Anything else — another site's QR code, a Wi-Fi code — is null, so
 * the scanner can say so instead of filling in nonsense.
 */
export function parsePairCode(text: string): string | null {
  const trimmed = text.trim();
  const bare = trimmed.toUpperCase();
  if (CODE.test(bare)) return bare;
  try {
    const url = new URL(trimmed);
    const code = url.searchParams.get("code")?.toUpperCase() ?? "";
    return url.pathname.replace(/\/+$/, "").endsWith("/pair") && CODE.test(code) ? code : null;
  } catch {
    return null;
  }
}
