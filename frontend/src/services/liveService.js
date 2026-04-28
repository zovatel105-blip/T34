/**
 * Live streaming REST API service.
 * WebSocket logic lives in src/hooks/useLiveSocket.js
 */
import AppConfig from '../config/config';

const getToken = () => localStorage.getItem('access_token') || '';

const buildHeaders = (extra = {}) => {
  const headers = { 'Content-Type': 'application/json', ...extra };
  const token = getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
};

const baseUrl = () => `${AppConfig.BACKEND_URL}/api/live`;

const handle = async (response) => {
  if (!response.ok) {
    let detail = '';
    try {
      const data = await response.json();
      detail = data.detail || data.message || '';
    } catch (_) {}
    const err = new Error(detail || `HTTP ${response.status}`);
    err.status = response.status;
    throw err;
  }
  return response.json();
};

export const liveService = {
  // -------- Coins (mock) --------
  async getCoinBalance() {
    const res = await fetch(`${baseUrl()}/coins/balance`, { headers: buildHeaders() });
    return handle(res);
  },
  async topupMock(amount = 100) {
    const res = await fetch(`${baseUrl()}/coins/topup-mock?amount=${amount}`, {
      method: 'POST',
      headers: buildHeaders(),
    });
    return handle(res);
  },

  // -------- Rooms --------
  async createRoom(payload = {}) {
    const res = await fetch(`${baseUrl()}/rooms`, {
      method: 'POST',
      headers: buildHeaders(),
      body: JSON.stringify({
        title: payload.title || 'LIVE',
        placeholder_video_url: payload.placeholder_video_url || null,
        tags: payload.tags || [],
      }),
    });
    return handle(res);
  },
  async listRooms(limit = 20) {
    const res = await fetch(`${baseUrl()}/rooms?limit=${limit}`, { headers: buildHeaders() });
    return handle(res);
  },
  async getRoom(roomId) {
    const res = await fetch(`${baseUrl()}/rooms/${roomId}`, { headers: buildHeaders() });
    return handle(res);
  },
  async endRoom(roomId) {
    const res = await fetch(`${baseUrl()}/rooms/${roomId}/end`, {
      method: 'POST',
      headers: buildHeaders(),
    });
    return handle(res);
  },

  // -------- Polls (creator) --------
  async startPoll(roomId, { question, options, duration_seconds = 10 }) {
    const res = await fetch(`${baseUrl()}/rooms/${roomId}/polls`, {
      method: 'POST',
      headers: buildHeaders(),
      body: JSON.stringify({ question, options, duration_seconds }),
    });
    return handle(res);
  },
  async endPoll(roomId, pollId) {
    const res = await fetch(`${baseUrl()}/rooms/${roomId}/polls/${pollId}/end`, {
      method: 'POST',
      headers: buildHeaders(),
    });
    return handle(res);
  },

  // -------- Proposals --------
  async proposeChallenge(roomId, { text, donation_coins = 1, message = '' }) {
    const res = await fetch(`${baseUrl()}/rooms/${roomId}/proposals`, {
      method: 'POST',
      headers: buildHeaders(),
      body: JSON.stringify({ text, donation_coins, message }),
    });
    return handle(res);
  },
  async listProposals(roomId, sort = 'donations') {
    const res = await fetch(`${baseUrl()}/rooms/${roomId}/proposals?sort=${sort}`, {
      headers: buildHeaders(),
    });
    return handle(res);
  },
  async launchProposal(roomId, proposalId) {
    const res = await fetch(`${baseUrl()}/rooms/${roomId}/proposals/${proposalId}/launch`, {
      method: 'POST',
      headers: buildHeaders(),
    });
    return handle(res);
  },
};

/** Build the WebSocket URL for a given room (transforms http(s) → ws(s) and appends token). */
export const buildLiveWsUrl = (roomId) => {
  const base = AppConfig.BACKEND_URL || '';
  const wsBase = base.replace(/^http/i, 'ws');
  const token = getToken();
  const qs = token ? `?token=${encodeURIComponent(token)}` : '';
  return `${wsBase}/api/ws/live/${roomId}${qs}`;
};

export default liveService;
