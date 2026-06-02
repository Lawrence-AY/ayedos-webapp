const STORAGE_SECRET = 'AYEDOS-SACCO-LOCALSTORAGE-SECRET-2026';
const ENCRYPTED_PREFIX = 'v2.';
const IV_LENGTH = 12;

const xorString = (text = '') => {
  const secret = STORAGE_SECRET;
  const output = [];

  for (let i = 0; i < text.length; i += 1) {
    const charCode = text.charCodeAt(i);
    const keyCode = secret.charCodeAt(i % secret.length);
    output.push(String.fromCharCode(charCode ^ keyCode));
  }

  return output.join('');
};

const safeBase64Decode = (value) => {
  try {
    const binary = atob(value);
    const decoded = decodeURIComponent(
      binary
        .split('')
        .map((char) => `%${(`00${char.charCodeAt(0).toString(16)}`).slice(-2)}`)
        .join('')
    );
    return decoded;
  } catch {
    return null;
  }
};

const bytesToBase64 = (bytes) => {
  let binary = '';
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
};

const base64ToBytes = (value) => {
  const binary = atob(value);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
};

const getEncryptionKey = async () => {
  const secretBytes = new TextEncoder().encode(STORAGE_SECRET);
  const keyBytes = await globalThis.crypto.subtle.digest('SHA-256', secretBytes);
  return globalThis.crypto.subtle.importKey('raw', keyBytes, 'AES-GCM', false, ['encrypt', 'decrypt']);
};

export const isEncryptedData = (value) => (
  typeof value === 'string' && value.startsWith(ENCRYPTED_PREFIX)
);

export const encryptData = async (data) => {
  if (data == null) return null;
  const text = typeof data === 'string' ? data : JSON.stringify(data);
  const iv = globalThis.crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const key = await getEncryptionKey();
  const encrypted = await globalThis.crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    new TextEncoder().encode(text)
  );
  return `${ENCRYPTED_PREFIX}${bytesToBase64(iv)}.${bytesToBase64(new Uint8Array(encrypted))}`;
};

export const decryptData = async (cipher) => {
  if (!cipher || typeof cipher !== 'string') return null;

  if (isEncryptedData(cipher)) {
    try {
      const [, ivValue, encryptedValue] = cipher.split('.');
      const key = await getEncryptionKey();
      const decrypted = await globalThis.crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: base64ToBytes(ivValue) },
        key,
        base64ToBytes(encryptedValue)
      );
      return JSON.parse(new TextDecoder().decode(decrypted));
    } catch {
      return null;
    }
  }

  const decoded = safeBase64Decode(cipher);
  if (!decoded) return null;
  const decrypted = xorString(decoded);

  try {
    return JSON.parse(decrypted);
  } catch {
    return decrypted;
  }
};
