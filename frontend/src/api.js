const BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

const request = async (path, options = {}) => {
  const url = `${BASE_URL}${path}`;
  const response = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });

  const payload = await response.json().catch(() => ({ success: false, message: 'Invalid JSON response' }));

  if (!response.ok || payload.success === false) {
    const errorMessage = payload.error || payload.message || 'API request failed';
    const details = Array.isArray(payload.errors) ? payload.errors.join('; ') : '';
    throw new Error(details ? `${errorMessage}: ${details}` : errorMessage);
  }

  return payload.data;
};

export const fetchListings = async (filters = {}) => {
  const query = new URLSearchParams({ ...filters, status: 'active' });
  return request(`/api/msme/list?${query.toString()}`);
};

export const fetchCities = async () => request('/api/msme/cities');

export const fetchMSMEDetails = async (msmeId) => request(`/api/msme/${msmeId}`);

export const submitListing = async (payload) => request('/api/msme/list', {
  method: 'POST',
  body: JSON.stringify(payload),
});

export const calculateRisk = async (payload) => request('/api/risk/calculate', {
  method: 'POST',
  body: JSON.stringify(payload),
});

export const submitKYC = async (payload) => request('/api/investor/kyc', {
  method: 'POST',
  body: JSON.stringify(payload),
});

export const recordTransaction = async (payload) => request('/api/investor/transaction', {
  method: 'POST',
  body: JSON.stringify(payload),
});

export const getKYCStatus = async (walletAddress) => request(`/api/investor/kyc/${walletAddress}`);

export const getPortfolio = async (walletAddress) => request(`/api/investor/portfolio/${walletAddress}`);
