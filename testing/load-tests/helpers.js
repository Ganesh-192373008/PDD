import http from 'k6/http';
import { check } from 'k6';
import { BASE_URL, DEFAULT_HEADERS } from './config.js';

export function makePostRequest(endpoint, payload, token = null) {
  const headers = { ...DEFAULT_HEADERS };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const url = `${BASE_URL}${endpoint}`;
  const response = http.post(url, JSON.stringify(payload), { headers });

  check(response, {
    'status is 200 or 201': (r) => r.status === 200 || r.status === 201,
    'response has body': (r) => r.body !== null,
  });

  return response;
}

export function makeGetRequest(endpoint, token = null) {
  const headers = { ...DEFAULT_HEADERS };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const url = `${BASE_URL}${endpoint}`;
  const response = http.get(url, { headers });

  check(response, {
    'status is 200': (r) => r.status === 200,
    'response has body': (r) => r.body !== null,
  });

  return response;
}

export function generateRandomUser() {
  const rand = Math.floor(Math.random() * 1000000);
  return {
    name: `Load Tester ${rand}`,
    email: `loadtest_${rand}@example.com`,
    phone: `999999${String(rand).slice(-4)}`,
    password: `SecurePass123!_${rand}`,
    confirmPassword: `SecurePass123!_${rand}`
  };
}
