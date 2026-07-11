/**
 * Server-side media validation: identify files by MAGIC BYTES (never trust
 * the client's content-type) and extract image dimensions from the binary —
 * no native dependencies (plain JS, LAWS §2).
 */

// Guard: this module reads raw buffers and must never reach the browser.
if (typeof window !== 'undefined') {
  throw new Error('lib/server/media-validation.js is server-only.');
}

/**
 * Sniffs the real type of a buffer.
 * @returns {{kind:'image'|'video'|'document', mime:string, ext:string}|null}
 */
export function sniffMedia(buf) {
  if (!buf || buf.length < 12) return null;

  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) {
    return { kind: 'image', mime: 'image/jpeg', ext: 'jpg' };
  }
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) {
    return { kind: 'image', mime: 'image/png', ext: 'png' };
  }
  if (buf.toString('ascii', 0, 4) === 'GIF8') {
    return { kind: 'image', mime: 'image/gif', ext: 'gif' };
  }
  if (
    buf.toString('ascii', 0, 4) === 'RIFF' &&
    buf.toString('ascii', 8, 12) === 'WEBP'
  ) {
    return { kind: 'image', mime: 'image/webp', ext: 'webp' };
  }
  if (buf.toString('ascii', 4, 8) === 'ftyp') {
    return { kind: 'video', mime: 'video/mp4', ext: 'mp4' };
  }
  if (buf.toString('ascii', 0, 5) === '%PDF-') {
    return { kind: 'document', mime: 'application/pdf', ext: 'pdf' };
  }
  return null;
}

/**
 * Extracts { width, height } for the image formats we accept.
 * Returns null when the format is unknown or the buffer is malformed.
 */
export function imageDimensions(buf, mime) {
  try {
    if (mime === 'image/png') return pngDims(buf);
    if (mime === 'image/jpeg') return jpegDims(buf);
    if (mime === 'image/gif') return gifDims(buf);
    if (mime === 'image/webp') return webpDims(buf);
  } catch {
    return null;
  }
  return null;
}

function pngDims(buf) {
  // IHDR is always the first chunk: width/height at offsets 16/20.
  if (buf.length < 24) return null;
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}

function gifDims(buf) {
  if (buf.length < 10) return null;
  return { width: buf.readUInt16LE(6), height: buf.readUInt16LE(8) };
}

function jpegDims(buf) {
  // Walk the marker segments until a Start-Of-Frame (SOF0..SOF15, minus the
  // non-frame markers C4/C8/CC) which carries height then width.
  let off = 2;
  while (off + 9 < buf.length) {
    if (buf[off] !== 0xff) return null;
    const marker = buf[off + 1];
    if (marker === 0xff) {
      off += 1;
      continue;
    }
    const isSOF =
      marker >= 0xc0 &&
      marker <= 0xcf &&
      marker !== 0xc4 &&
      marker !== 0xc8 &&
      marker !== 0xcc;
    if (isSOF) {
      return {
        height: buf.readUInt16BE(off + 5),
        width: buf.readUInt16BE(off + 7),
      };
    }
    off += 2 + buf.readUInt16BE(off + 2);
  }
  return null;
}

function webpDims(buf) {
  const format = buf.toString('ascii', 12, 16);
  if (format === 'VP8X' && buf.length >= 30) {
    // 24-bit little-endian canvas size minus one.
    const width = 1 + (buf[24] | (buf[25] << 8) | (buf[26] << 16));
    const height = 1 + (buf[27] | (buf[28] << 8) | (buf[29] << 16));
    return { width, height };
  }
  if (format === 'VP8 ' && buf.length >= 30) {
    // Lossy: dimensions at offset 26, 14 bits each.
    return {
      width: buf.readUInt16LE(26) & 0x3fff,
      height: buf.readUInt16LE(28) & 0x3fff,
    };
  }
  if (format === 'VP8L' && buf.length >= 25) {
    // Lossless: 14-bit fields packed after the signature byte.
    const b = buf.readUInt32LE(21);
    return {
      width: 1 + (b & 0x3fff),
      height: 1 + ((b >> 14) & 0x3fff),
    };
  }
  return null;
}
