import { sleep } from 'k6';
import { makePostRequest } from './helpers.js';

export const options = {
  stages: [
    { duration: '15s', target: 50 },  // Ramp up
    { duration: '30s', target: 100 }, // Steady high load
    { duration: '15s', target: 0 },   // Ramp down
  ],
  thresholds: {
    http_req_failed: ['rate<0.01'],   // Error rate should be less than 1%
    http_req_duration: ['p(95)<300'], // 95% of requests should be below 300ms
  },
};

export default function () {
  const credentials = {
    email: 'ganeshgiddathimmannagari@example.com',
    password: 'Password123!',
  };

  makePostRequest('/auth/login', credentials);
  sleep(1); // 1s think time
}
