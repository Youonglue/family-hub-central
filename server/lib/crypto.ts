// server/lib/crypto.ts
import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "node:crypto";
import { existsSync, readFileSync, writeFileSync, mkdirSync, chmodSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function resolveKeyFile(): string {
  if (existsSync("/data/master.key") || existsSync("/data")) {
    return "/data/master.key";
  }
  const projectDataDir = path.resolve(__dirname, "../../data");
  return path.join(projectDataDir, "master.key");
}

const KEY_FILE = resolveKeyFile();
const KEY_DIR = path.dirname(KEY_FILE);

function getMasterKey(): Buffer {
  if (process.env.DB_ENCRYPTION_KEY) {
    return scryptSync(process.env.DB_ENCRYPTION_KEY, "familyhub_salt", 32);
  }

  try {
    mkdirSync(KEY_DIR, { recursive: true });
    
    if (existsSync(KEY_FILE)) {
      const raw = readFileSync(KEY_FILE, "utf8").trim();
      let keyBuf = Buffer.from(raw, "hex");
      
      if (keyBuf.length !== 32) {
        if (Buffer.byteLength(raw) === 32) {
          keyBuf = Buffer.from(raw);
        } else {
          keyBuf = scryptSync(raw, "familyhub_salt", 32);
        }
      }
      return keyBuf;
    }

    const newKey = randomBytes(32);
    writeFileSync(KEY_FILE, newKey.toString("hex"), { mode: 0o600 });
    try { chmodSync(KEY_FILE, 0o600); } catch {}
    console.log(`🔐 Generated 256-bit Master Database Key at ${KEY_FILE}`);
    return newKey;
  } catch (err) {
    console.error("⚠️ Master key warning: falling back to internal derivation key.", err);
    return scryptSync("familyhub_default_internal_secure_key", "salt", 32);
  }
}

const MASTER_KEY = getMasterKey();

export function encryptField(plainText: string | null | undefined): string {
  if (!plainText || typeof plainText !== "string") return plainText as any;
  if (plainText.startsWith("enc$")) return plainText;

  try {
    const iv = randomBytes(12);
    const cipher = createCipheriv("aes-256-gcm", MASTER_KEY, iv);
    
    let encrypted = cipher.update(plainText, "utf8", "hex");
    encrypted += cipher.final("hex");
    
    const tag = cipher.getAuthTag().toString("hex");
    return `enc$${iv.toString("hex")}$${tag}$${encrypted}`;
  } catch (error) {
    console.error("Encryption error:", error);
    return plainText;
  }
}

export function decryptField(cipherText: string | null | undefined): string {
  if (!cipherText || typeof cipherText !== "string") return cipherText as any;
  if (!cipherText.startsWith("enc$")) return cipherText;

  try {
    const parts = cipherText.split("$");
    if (parts.length < 4) return cipherText;

    const [, ivHex, tagHex, ...encryptedParts] = parts;
    const encryptedHex = encryptedParts.join("$");

    const iv = Buffer.from(ivHex, "hex");
    const tag = Buffer.from(tagHex, "hex");

    if (iv.length !== 12 || tag.length !== 16) {
      return cipherText;
    }

    const decipher = createDecipheriv("aes-256-gcm", MASTER_KEY, iv);
    decipher.setAuthTag(tag);

    let decrypted = decipher.update(encryptedHex, "hex", "utf8");
    decrypted += decipher.final("utf8");

    return decrypted;
  } catch (error) {
    return cipherText;
  }
}

export function encryptRow<T extends Record<string, any>>(row: T, fields: string[]): T {
  if (!row) return row;
  const result: any = { ...row };
  for (const field of fields) {
    if (result[field] && typeof result[field] === "string") {
      result[field] = encryptField(result[field]);
    }
  }
  return result;
}

export function encryptRows<T extends Record<string, any>>(rows: T[], fields: string[]): T[] {
  if (!Array.isArray(rows)) return [];
  return rows.map(r => encryptRow(r, fields));
}

export function decryptRow<T extends Record<string, any>>(row: T, fields: string[]): T {
  if (!row) return row;
  const result: any = { ...row };
  for (const field of fields) {
    if (result[field] && typeof result[field] === "string") {
      result[field] = decryptField(result[field]);
    }
  }
  return result;
}

export function decryptRows<T extends Record<string, any>>(rows: T[], fields: string[]): T[] {
  if (!Array.isArray(rows)) return [];
  return rows.map(r => decryptRow(r, fields));
}
