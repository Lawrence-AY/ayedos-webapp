import { apiRequest, unwrapEnvelopeData } from './apiClient';

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Could not read the selected profile photo.'));
    reader.readAsDataURL(file);
  });
}

export async function uploadProfilePhoto(file, accessToken) {
  const photo = await readFileAsDataUrl(file);
  const res = await apiRequest('/api/member/profile/photo', {
    method: 'POST',
    accessToken,
    body: { photo },
  });

  if (!res.ok) {
    throw new Error(res.json?.message || 'Failed to upload profile photo.');
  }

  return unwrapEnvelopeData(res.json);
}

export async function uploadKycDocuments({ identityType = 'national', frontFile, backFile }, accessToken) {
  const isPassport = identityType === 'passport';
  const [front, back] = await Promise.all([
    readFileAsDataUrl(frontFile),
    isPassport ? Promise.resolve(null) : readFileAsDataUrl(backFile),
  ]);
  const res = await apiRequest('/api/member/profile/kyc-documents', {
    method: 'POST',
    accessToken,
    body: { identityType, front, ...(back ? { back } : {}) },
  });

  if (!res.ok) {
    throw new Error(res.json?.message || 'Failed to upload KYC documents.');
  }

  return unwrapEnvelopeData(res.json);
}
