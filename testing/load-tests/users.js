import { sleep } from 'k6';
import { makePostRequest, makeGetRequest, generateRandomUser } from './helpers.js';

export const options = {
  stages: [
    { duration: '10s', target: 20 },
    { duration: '40s', target: 50 },
    { duration: '10s', target: 0 },
  ],
  thresholds: {
    http_req_failed: ['rate<0.02'],
    http_req_duration: ['p(95)<400'],
  },
};

export default function () {
  // Step 1: Register dynamic new user
  const newUser = generateRandomUser();
  const registerRes = makePostRequest('/auth/register', newUser);
  
  if (registerRes.status !== 201 && registerRes.status !== 200) {
    sleep(1);
    return;
  }

  // Get Bearer Token
  const resBody = JSON.parse(registerRes.body);
  const token = resBody.token;

  if (token) {
    // Step 2: Get user profile
    makeGetRequest('/user/me', token);
    sleep(0.5);

    // Step 3: Browse agriculture store products
    makeGetRequest('/products', token);
    sleep(1);

    // Step 4: Add dummy item to shopping cart
    const cartPayload = { productId: 'prod_1234567890', quantity: 2 };
    makePostRequest('/products/cart', cartPayload, token);
    sleep(0.5);

    // Step 5: Read cart details
    makeGetRequest('/products/cart', token);
    sleep(1);
  }

  sleep(1);
}
