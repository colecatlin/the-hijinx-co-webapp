import { base44 } from '@/api/base44Client';

export async function reviewCredentialRequest(payload) {
  try {
    const response = await base44.functions.invoke('media_reviewCredentialRequest', payload);
    return { ok: true, data: response.data };
  } catch (error) {
    console.error('reviewCredentialRequest error:', error);
    return { ok: false, errorMessage: error.response?.data?.error || error.message || 'Failed to review credential request' };
  }
}

export async function revokeCredential(payload) {
  try {
    const response = await base44.functions.invoke('media_revokeCredential', payload);
    return { ok: true, data: response.data };
  } catch (error) {
    console.error('revokeCredential error:', error);
    return { ok: false, errorMessage: error.response?.data?.error || error.message || 'Failed to revoke credential' };
  }
}

export async function upsertPolicy(payload) {
  try {
    const response = await base44.functions.invoke('media_createOrUpdatePolicy', payload);
    return { ok: true, data: response.data };
  } catch (error) {
    console.error('upsertPolicy error:', error);
    return { ok: false, errorMessage: error.response?.data?.error || error.message || 'Failed to save policy' };
  }
}