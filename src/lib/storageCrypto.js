const STORAGE_SECRET = 'AYEDOS-SACCO-LOCALSTORAGE-SECRET-2026';

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

const safeBase64Encode = (value) => {
  try {
    return btoa(encodeURIComponent(value).replace(/%([0-9A-F]{2})/g, (_, p1) => String.fromCharCode(Number(`0x${p1}`))));
  } catch {
    return null;
  }
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

export const encryptData = (data) => {
  if (data == null) return null;
  const text = typeof data === 'string' ? data : JSON.stringify(data);
  const encrypted = xorString(text);
  return safeBase64Encode(encrypted);
};

export const decryptData = (cipher) => {
  if (!cipher || typeof cipher !== 'string') return null;
  const decoded = safeBase64Decode(cipher);
  if (!decoded) return null;
  const decrypted = xorString(decoded);

  try {
    return JSON.parse(decrypted);
  } catch {
    return decrypted;
  }
};
