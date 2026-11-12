// Security Utility for Modern Salted Password Hashing & Authentication
// Uses Web Crypto API (SHA-256) with random cryptographic salts

export interface PasswordHashRecord {
  hash: string;
  salt: string;
  algorithm: 'SHA-256-SALTED';
  updatedAt: string;
}

// Generate secure cryptographic salt
export function generateSalt(byteLength: number = 16): string {
  if (typeof window !== 'undefined' && window.crypto && window.crypto.getRandomValues) {
    const array = new Uint8Array(byteLength);
    window.crypto.getRandomValues(array);
    return Array.from(array)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }
  // Fallback random hex
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

// Convert string to ArrayBuffer
function str2ab(str: string): Uint8Array {
  return new TextEncoder().encode(str);
}

// Convert ArrayBuffer to hex string
function buf2hex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

// Hash password with salt using standard Web Crypto SHA-256
export async function hashPassword(plainText: string, salt: string): Promise<string> {
  const saltedInput = `${salt}:${plainText.trim()}`;
  if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle) {
    try {
      const data = str2ab(saltedInput);
      const digestBuffer = await window.crypto.subtle.digest('SHA-256', data.buffer as ArrayBuffer);
      return buf2hex(digestBuffer);
    } catch (e) {
      console.warn('SubtleCrypto error, falling back to basic hash', e);
    }
  }
  // Deterministic fallback for environments without subtle crypto
  return fallbackHash(saltedInput);
}

// Synchronous fallback hash for immediate UI verification
function fallbackHash(input: string): string {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return `h_${Math.abs(hash).toString(16)}_${input.length}`;
}

// Create a full password record containing salt and hash
export async function createPasswordRecord(plainText: string): Promise<PasswordHashRecord> {
  const salt = generateSalt();
  const hash = await hashPassword(plainText, salt);
  return {
    hash,
    salt,
    algorithm: 'SHA-256-SALTED',
    updatedAt: new Date().toISOString(),
  };
}

// Verify a plain-text password against stored hash record or legacy plain PIN
export async function verifyPassword(
  plainText: string,
  storedHashOrPin?: string,
  storedSalt?: string
): Promise<boolean> {
  if (!storedHashOrPin) return false;
  const trimmed = plainText.trim();

  // 1. Direct legacy plain-text match (for backward compatibility during migration)
  if (storedHashOrPin === trimmed) {
    return true;
  }

  // 2. Salted hash comparison
  if (storedSalt) {
    const computedHash = await hashPassword(trimmed, storedSalt);
    if (computedHash === storedHashOrPin) {
      return true;
    }
    // Also check fallback
    if (fallbackHash(`${storedSalt}:${trimmed}`) === storedHashOrPin) {
      return true;
    }
  }

  return false;
}

// Generate time-limited reset token
export function generateResetToken(): { token: string; expiresAt: string } {
  const randomPart = generateSalt(8);
  const token = `RST-${Date.now().toString(36).toUpperCase()}-${randomPart.slice(0, 6).toUpperCase()}`;
  // Token expires in 30 minutes
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();
  return { token, expiresAt };
}

// Password validation rule checker
export function validatePasswordStrength(password: string): { isValid: boolean; message?: string } {
  const trimmed = password.trim();
  if (trimmed.length < 4) {
    return {
      isValid: false,
      message: 'Password / PIN must be at least 4 characters long (کم از کم 4 ہندسے/حروف)',
    };
  }
  return { isValid: true };
}
