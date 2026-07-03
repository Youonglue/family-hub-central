// Encrypted backup helpers for cross-device data transfer.
// -----------------------------------------------------------------------------
// AES-GCM 256-bit content encryption + PBKDF2-SHA256 key derivation.
// The passphrase NEVER leaves the browser. Server sees only ciphertext.
//
// Envelope format (JSON, .fhb file):
//   { v: 1, kdf: "pbkdf2", iter: 200000, salt: b64, iv: b64, ct: b64 }

const ITERATIONS = 200_000;
const KEY_BITS = 256;
const SALT_LEN = 16;
const IV_LEN = 12;

const enc = new TextEncoder();
const dec = new TextDecoder();

function b64encode(bytes: Uint8Array): string {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s);
}
function b64decode(s: string): Uint8Array<ArrayBuffer> {
  const bin = atob(s);
  const out = new Uint8Array(new ArrayBuffer(bin.length));
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
function randomBytes(len: number): Uint8Array<ArrayBuffer> {
  const buf = new Uint8Array(new ArrayBuffer(len));
  crypto.getRandomValues(buf);
  return buf;
}

async function deriveKey(passphrase: string, salt: Uint8Array): Promise<CryptoKey> {
  const material = await crypto.subtle.importKey(
    "raw",
    enc.encode(passphrase),
    "PBKDF2",
    false,
    ["deriveKey"],
  );
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", hash: "SHA-256", salt, iterations: ITERATIONS },
    material,
    { name: "AES-GCM", length: KEY_BITS },
    false,
    ["encrypt", "decrypt"],
  );
}

export interface BackupBundle {
  version: 1;
  exported_at: string;
  mode: "cloud" | "selfhost";
  tables: Record<string, unknown[]>;
}

export async function encryptBundle(bundle: BackupBundle, passphrase: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_LEN));
  const iv = crypto.getRandomValues(new Uint8Array(IV_LEN));
  const key = await deriveKey(passphrase, salt);
  const plaintext = enc.encode(JSON.stringify(bundle));
  const ct = new Uint8Array(
    await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, plaintext),
  );
  return JSON.stringify({
    v: 1,
    kdf: "pbkdf2",
    iter: ITERATIONS,
    salt: b64encode(salt),
    iv: b64encode(iv),
    ct: b64encode(ct),
  });
}

export async function decryptBundle(fileText: string, passphrase: string): Promise<BackupBundle> {
  let env: { v?: number; salt?: string; iv?: string; ct?: string; iter?: number };
  try {
    env = JSON.parse(fileText);
  } catch {
    throw new Error("File is not a valid Family Hub backup.");
  }
  if (env.v !== 1 || !env.salt || !env.iv || !env.ct) {
    throw new Error("Backup format not recognised.");
  }
  const salt = b64decode(env.salt);
  const iv = b64decode(env.iv);
  const ct = b64decode(env.ct);
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(passphrase),
    "PBKDF2",
    false,
    ["deriveKey"],
  );
  const aes = await crypto.subtle.deriveKey(
    { name: "PBKDF2", hash: "SHA-256", salt, iterations: env.iter ?? ITERATIONS },
    key,
    { name: "AES-GCM", length: KEY_BITS },
    false,
    ["decrypt"],
  );
  let plain: ArrayBuffer;
  try {
    plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, aes, ct);
  } catch {
    throw new Error("Wrong passphrase or corrupted file.");
  }
  const json = dec.decode(plain);
  const bundle = JSON.parse(json) as BackupBundle;
  if (bundle.version !== 1 || !bundle.tables) {
    throw new Error("Unsupported backup version.");
  }
  return bundle;
}

export function downloadBundle(filename: string, encryptedText: string) {
  const blob = new Blob([encryptedText], { type: "application/octet-stream" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
