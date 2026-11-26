// Minimal zip reader for .docx files and results zips. Uses the browser's built-in DecompressionStream, no libraries.
const MAX_ENTRY = 40e6;

export async function readZip(buf, what = "Word document") {
  const bad = () => new Error(`That file is not a valid ${what}`);
  const dv = new DataView(buf), u8 = new Uint8Array(buf), dec = new TextDecoder();
  let eocd = -1;
  for (let i = u8.length - 22; i >= Math.max(0, u8.length - 65557); i--) {
    if (dv.getUint32(i, true) === 0x06054b50) { eocd = i; break; }
  }
  if (eocd < 0) throw bad();
  if (dv.getUint16(eocd + 10, true) > 5000) throw bad();
  const count = dv.getUint16(eocd + 10, true);
  let p = dv.getUint32(eocd + 16, true);
  const files = new Map();
  for (let k = 0; k < count; k++) {
    if (dv.getUint32(p, true) !== 0x02014b50) break;
    const method = dv.getUint16(p + 10, true), csize = dv.getUint32(p + 20, true), usize = dv.getUint32(p + 24, true);
    const nlen = dv.getUint16(p + 28, true), elen = dv.getUint16(p + 30, true), clen = dv.getUint16(p + 32, true);
    const off = dv.getUint32(p + 42, true);
    files.set(dec.decode(u8.subarray(p + 46, p + 46 + nlen)), { method, csize, usize, off });
    p += 46 + nlen + elen + clen;
  }
  return {
    has: (n) => files.has(n),
    entries: () => [...files].map(([name, f]) => ({ name, size: f.usize })),
    async read(name, max = MAX_ENTRY) {
      const f = files.get(name);
      if (!f) return null;
      if (f.off + 30 > u8.length || f.off + f.csize > u8.length) throw bad();
      if (f.usize > max) throw new Error("That document is too large to check here");
      const start = f.off + 30 + dv.getUint16(f.off + 26, true) + dv.getUint16(f.off + 28, true);
      const data = u8.subarray(start, start + f.csize);
      if (f.method === 0) return dec.decode(data);
      if (f.method !== 8) throw new Error("Unsupported compression in this file");
      // Count bytes while inflating so a file that lies about its size cannot expand without bound.
      const reader = new Blob([data]).stream().pipeThrough(new DecompressionStream("deflate-raw")).getReader();
      const chunks = []; let total = 0;
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        total += value.length;
        if (total > max) { await reader.cancel(); throw new Error("That document is too large to check here"); }
        chunks.push(value);
      }
      const out = new Uint8Array(total); let o = 0;
      for (const c of chunks) { out.set(c, o); o += c.length; }
      return dec.decode(out);
    },
  };
}
