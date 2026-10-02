import { readFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';
const values = Object.fromEntries(readFileSync(new URL('../.env', import.meta.url), 'utf8').split(/\r?\n/).filter(line => line && !line.startsWith('#')).map(line => { const i = line.indexOf('='); return [line.slice(0, i), line.slice(i + 1).trim()]; }));
try {
  const response = await fetch('https://api.deepseek.com/models', { headers: { Authorization: `Bearer ${values.DEEPSEEK_API_KEY}` }, signal: AbortSignal.timeout(30000) });
  const data = await response.json();
  console.log(JSON.stringify({ status: response.status, models: data.data?.map(model => model.id), error: data.error?.message }, null, 2));
  if (process.argv.includes('--vision') && response.ok) {
    function chunk(name, bytes) {
      const type = Buffer.from(name), crcInput = Buffer.concat([type, bytes]);
      let crc = 0xffffffff;
      for (const byte of crcInput) { crc ^= byte; for (let i = 0; i < 8; i++) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1)); }
      const length = Buffer.alloc(4), checksum = Buffer.alloc(4);
      length.writeUInt32BE(bytes.length); checksum.writeUInt32BE((crc ^ 0xffffffff) >>> 0);
      return Buffer.concat([length, type, bytes, checksum]);
    }
    const header = Buffer.alloc(13); header.writeUInt32BE(64, 0); header.writeUInt32BE(64, 4); header[8] = 8; header[9] = 2;
    const pixels = Buffer.alloc(64 * (64 * 3 + 1), 255);
    for (let y = 0; y < 64; y++) { pixels[y * 193] = 0; for (let x = 20; x < 44 && y >= 20 && y < 44; x++) pixels.fill(0, y * 193 + 1 + x * 3, y * 193 + 4 + x * 3); }
    const png = Buffer.concat([Buffer.from('89504e470d0a1a0a', 'hex'), chunk('IHDR', header), chunk('IDAT', deflateSync(pixels)), chunk('IEND', Buffer.alloc(0))]);
    const test = await fetch('https://api.deepseek.com/chat/completions', { method: 'POST', headers: { Authorization: `Bearer ${values.DEEPSEEK_API_KEY}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ model: values.DEEPSEEK_MODEL, max_tokens: 128, thinking: { type: "disabled" }, messages: [{ role: 'user', content: [{ type: 'text', text: '只回答图片中央是否有黑色方块。' }, { type: 'image_url', image_url: { url: `data:image/png;base64,${png.toString('base64')}` } }] }] }), signal: AbortSignal.timeout(60000) });
    const result = await test.json();
    console.log(JSON.stringify({ visionStatus: test.status, answer: result.choices?.[0]?.message?.content, usage: result.usage, error: result.error?.message }, null, 2));
    if (!test.ok) process.exitCode = 1;
  }
} catch (error) { console.error(`Connection failed: ${error.cause?.code || error.message}`); process.exitCode = 1; }

