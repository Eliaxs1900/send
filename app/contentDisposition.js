/*
  Minimal replacement for the `content-disposition` npm package, which pulls
  node's `path` and `Buffer` into the service worker bundle just to build
  this one header.

  Produces `attachment; filename="..."; filename*=UTF-8''...` per RFC 6266,
  with the RFC 5987 encoding for anything outside of ISO-8859-1.
*/

// characters that are safe unquoted inside filename*= (RFC 5987 attr-char)
const ATTR_CHAR = /[A-Za-z0-9!#$&+\-.^_`|~]/;

function encodeRFC5987(str) {
  let out = '';
  const bytes = new TextEncoder().encode(str);
  for (const byte of bytes) {
    const char = String.fromCharCode(byte);
    out += ATTR_CHAR.test(char)
      ? char
      : '%' + byte.toString(16).toUpperCase().padStart(2, '0');
  }
  return out;
}

export default function contentDisposition(filename) {
  const name = String(filename == null ? '' : filename);
  // strip any directory components and control characters
  // eslint-disable-next-line no-control-regex -- removing them is the point
  const base = name.replace(/^.*[\\/]/, '').replace(/[\u0000-\u001f\u007f]/g, '');
  const quoted = base.replace(/["\\]/g, '\\$&');
  return `attachment; filename="${quoted}"; filename*=UTF-8''${encodeRFC5987(
    base
  )}`;
}
