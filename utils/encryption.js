// utils/encryption.js
//
// Encrypts/decrypts customer-provided API keys (e.g. their own
// ElevenLabs key for BYOK voice access) before storing in Redis.
// Uses AES-256-GCM — authenticated encryption, the standard choice for
// secrets at rest. Never store a customer's key in plain text.
//
// Requires ENCRYPTION_KEY env var: a 32-byte (256-bit) key, base64
// encoded. Generate one with:
//   node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
// Keep this secret and never change it once real customer keys exist —
// changing it makes all previously-stored keys undecryptable.

import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";

function getKey() {
  const raw = process.env.ENCRYPTION_KEY;
  if (!raw) {
    throw new Error(
      "Missing ENCRYPTION_KEY env var — required to store customer API keys securely."
    );
  }
  return Buffer.from(raw, "base64");
}

export function encryptSecret(plainText) {
  const key = getKey();
  const iv = crypto.randomBytes(12); // 96-bit IV, standard for GCM
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  const encrypted = Buffer.concat([cipher.update(plainText, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();

  // Pack iv + authTag + ciphertext together so one string can be stored.
  return Buffer.concat([iv, authTag, encrypted]).toString("base64");
}

export function decryptSecret(encoded) {
  const key = getKey();
  const data = Buffer.from(encoded, "base64");

  const iv = data.subarray(0, 12);
  const authTag = data.subarray(12, 28);
  const encrypted = data.subarray(28);

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  return decrypted.toString("utf8");
}
