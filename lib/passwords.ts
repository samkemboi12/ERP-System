import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(scryptCallback);
const HASH_PREFIX = "scrypt";
const KEY_LENGTH = 64;

export function isPasswordHash(value: string) {
  return value.startsWith(`${HASH_PREFIX}$`);
}

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("base64");
  const derivedKey = (await scrypt(password, salt, KEY_LENGTH)) as Buffer;

  return `${HASH_PREFIX}$${salt}$${derivedKey.toString("base64")}`;
}

export async function verifyPassword(password: string, storedValue: string) {
  if (!isPasswordHash(storedValue)) {
    return {
      valid: storedValue === password,
      needsUpgrade: storedValue === password
    };
  }

  const [, salt, storedHash] = storedValue.split("$");

  if (!salt || !storedHash) {
    return { valid: false, needsUpgrade: false };
  }

  const derivedKey = (await scrypt(password, salt, KEY_LENGTH)) as Buffer;
  const storedBuffer = Buffer.from(storedHash, "base64");

  if (storedBuffer.length !== derivedKey.length) {
    return { valid: false, needsUpgrade: false };
  }

  return {
    valid: timingSafeEqual(storedBuffer, derivedKey),
    needsUpgrade: false
  };
}
