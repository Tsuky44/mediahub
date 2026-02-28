import { scrypt, randomFill, createCipheriv, createDecipheriv } from 'crypto';
import { promisify } from 'util';

const scryptAsync = promisify(scrypt);
const randomFillAsync = promisify(randomFill);

const ALGORITHM = 'aes-256-gcm';
const SCRYPT_KEY_LEN = 32;
const SCRYPT_SALT_LEN = 16;
const IV_LEN = 12;
const TAG_LEN = 16;

/**
 * Encrypts data using a password-derived key (scrypt + AES-256-GCM)
 */
export async function encryptData(data: string, password: string): Promise<string> {
  // 1. Generate a random salt
  const salt = Buffer.alloc(SCRYPT_SALT_LEN);
  await randomFillAsync(salt);

  // 2. Derive key from password using scrypt
  const key = (await scryptAsync(password, salt, SCRYPT_KEY_LEN)) as Buffer;

  // 3. Generate a random IV
  const iv = Buffer.alloc(IV_LEN);
  await randomFillAsync(iv);

  // 4. Create cipher
  const cipher = createCipheriv(ALGORITHM, key, iv);

  // 5. Encrypt
  let encrypted = cipher.update(data, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  // 6. Get auth tag
  const tag = cipher.getAuthTag().toString('hex');

  // 7. Return combined string: salt:iv:tag:encrypted
  return `${salt.toString('hex')}:${iv.toString('hex')}:${tag}:${encrypted}`;
}

/**
 * Decrypts data using a password-derived key
 */
export async function decryptData(encryptedData: string, password: string): Promise<string> {
  // 1. Parse parts
  const parts = encryptedData.split(':');
  if (parts.length !== 4) {
    throw new Error('Invalid encrypted data format');
  }

  const [saltHex, ivHex, tagHex, contentHex] = parts;
  
  const salt = Buffer.from(saltHex, 'hex');
  const iv = Buffer.from(ivHex, 'hex');
  const tag = Buffer.from(tagHex, 'hex');
  
  // 2. Derive key from password using scrypt (must match encryption)
  const key = (await scryptAsync(password, salt, SCRYPT_KEY_LEN)) as Buffer;

  // 3. Create decipher
  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);

  // 4. Decrypt
  let decrypted = decipher.update(contentHex, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}
