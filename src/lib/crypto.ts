import crypto from 'crypto';

const keyB64 = process.env.ENCRYPTION_KEY!;
const KEY = Buffer.from(keyB64, 'base64'); // 32 bytes

export function encryptBuffer(plain: Buffer) {
  const iv = crypto.randomBytes(12); // GCM nonce
  const cipher = crypto.createCipheriv('aes-256-gcm', KEY, iv);
  const enc = Buffer.concat([cipher.update(plain), cipher.final()]);
  const tag = cipher.getAuthTag();
  // store as: IV(12) | TAG(16) | CIPHERTEXT
  return Buffer.concat([iv, tag, enc]);
}

export function decryptBuffer(packed: Buffer) {
  const iv = packed.subarray(0, 12);
  const tag = packed.subarray(12, 28);
  const data = packed.subarray(28);
  const decipher = crypto.createDecipheriv('aes-256-gcm', KEY, iv);
  decipher.setAuthTag(tag);
  const dec = Buffer.concat([decipher.update(data), decipher.final()]);
  return dec;
}
