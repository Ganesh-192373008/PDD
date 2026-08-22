# Grafana k6 API Load Testing & Performance Guide

This comprehensive guide covers everything from fundamental performance testing concepts, Windows installation, writing and running tests, analyzing metrics, troubleshooting bottlenecks, down to building enterprise CI/CD pipelines and interview preparations.

---

## 1. What is Load Testing?

Performance Testing is a broad practice aimed at determining the responsiveness, speed, stability, scalability, and resource usage of a system under a particular workload.

### Performance Testing Sub-types:
- **Load Testing**: Verifies that the system can handle a predetermined number of concurrent users (VUs) under ordinary conditions. Helpful in validating SLA/SLOs.
- **Stress Testing**: Evaluates system behavior beyond normal or peak load limits. Identifies break points and how the system recovers.
- **Spike Testing**: Evaluates response to sudden, massive surges in traffic (e.g., Black Friday launch, ticket booking).
- **Soak Testing (Endurance)**: Evaluates reliability and performance over extended periods (e.g., 24 to 72 hours) to detect memory leaks, resource leaks, or file descriptor exhausts.

### Why API Load Testing Matters:
APIs are the core foundation of modern distributed web platforms. Load testing ensures backend services do not fail under pressure, database connections do not pool-out, and users receive responses in acceptable timeframes.

---

## 2. Installing k6 (Windows)

On Windows, Grafana k6 can be easily installed using the command-line package manager `winget`.

### Step 1: Search for k6 package
```powershell
winget search k6
```
*What this does:* Scans the Microsoft community repository database to verify the correct package ID and current available versions for `k6`.

### Step 2: Install GrafanaLabs.k6
```powershell
winget install GrafanaLabs.k6
```
*What this does:* Downloads the official compiled MSI installer for Grafana k6, validates hashes, runs the installation wizard silently, and automatically registers `k6` path binaries into your system's Environment Path variables.

### Step 3: Verify the installation
```powershell
k6 version
```
*What this does:* Executes the local k6 command to display the compiled Go version and release tag, verifying that paths were set up correctly.

---

## 3. Running a Test

k6 runs tests using modular ES6 JavaScript scripts. To execute a test, open terminal in the test directory and run:
```bash
k6 run script.js
```
*What this does:* Initializes k6 VM, reads the script configurations (VUs, durations, thresholds), builds the action loop, and outputs real-time execution statistics to your terminal.

---

## 4. Baseline Load Test

Here is a simple k6 baseline test executing GET against a sample endpoint for 100 Virtual Users over 1 minute.

```javascript
import http from 'k6/http';
import { check, sleep } from 'k6';

// 1. Setup Options
export const options = {
  vus: 100,
  duration: '1m',
};

// 2. Default VU execution function
export default function () {
  const res = http.get('http://localhost:5000/api/weather?lat=18.52&lon=73.85');
  
  // Checks validate assertions on HTTP response
  check(res, {
    'status code is 200': (r) => r.status === 200,
    'body is not empty': (r) => r.body.length > 0,
  });

  // sleep introduces 'think time' to simulate real human behavior
  sleep(1); 
}
```

### Core k6 Concepts:
- **VUs (Virtual Users)**: Independent concurrent loops running the default function.
- **Duration**: The total test duration (e.g., `10s`, `5m`, `1h`).
- **Checks**: Boolean statements that evaluate responses. Unlike assertions in standard test runners, checks **do not** halt the test execution when they fail.
- **Sleep**: Pause between requests to avoid overloading your server with artificial, instantaneous request loops.

---

## 5. Sample API Load Test Script

This script simulates complex API flows including POST requests, Authentication Tokens, custom HTTP Headers, JSON Response validation, random user generation, and strict metric thresholds.

```javascript
import http from 'k6/http';
import { check, sleep } from 'k6';
import { randomString } from 'https://jslib.k6.io/k6-utils/1.2.0/index.js';

export const options = {
  stages: [
    { duration: '10s', target: 20 },  // Ramp-up
    { duration: '20s', target: 50 },  // Steady-state
    { duration: '10s', target: 0 },   // Ramp-down
  ],
  thresholds: {
    http_req_failed: ['rate<0.01'],    // Under 1% failures
    http_req_duration: ['p(95)<300'],  // 95% of requests must complete under 300ms
  },
};

export default function () {
  const url = 'http://localhost:5000/api/auth/register';
  
  // Generate random mock user details
  const payload = JSON.stringify({
    name: 'k6 User ' + randomString(5),
    email: `k6_${randomString(5)}@example.com`,
    phone: '9999999999',
    password: 'Password123!',
    confirmPassword: 'Password123!',
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
  };

  // POST Request
  const res = http.post(url, payload, params);

  // Validate response status & JSON token
  const isOk = check(res, {
    'status is 201': (r) => r.status === 201 || r.status === 200,
    'has auth token': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.token !== undefined;
      } catch (e) {
        return false;
      }
    }
  });

  sleep(1);
}
```

---

## 6. Understanding Results

When a k6 run finishes, it prints a final report to terminal containing these vital metrics:

| Metric Name | Type | Description |
|---|---|---|
| **`http_reqs`** | Counter | Total number of HTTP requests generated during the run. |
| **`iterations`** | Counter | Number of times the virtual users executed the default function. |
| **`vus`** | Gauge | Number of active virtual users during the current execution block. |
| **`vus_max`** | Gauge | Maximum allocated virtual users configured for this run. |
| **`data_received`** | Rate | Total volume of binary data received from server. |
| **`data_sent`** | Rate | Total volume of binary data sent to server. |
| **`checks`** | Rate | Percentage of passed checks. |
| **`http_req_duration`** | Trend | Total time taken for requests (sending + waiting + receiving). |
| **`http_req_waiting`** | Trend | Time spent waiting for response headers from server (Time To First Byte - TTFB). |
| **`http_req_blocked`** | Trend | Time spent waiting for TCP connection / DNS resolution. |
| **`http_req_connecting`** | Trend | Time spent establishing TCP connection with remote server. |
| **`http_req_failed`** | Rate | Percentage of HTTP requests that returned failure codes (>= 400). |

---

## 7. Requests Per Second (RPS)

RPS represents the total number of requests handled by your API per second.

```
RPS = Total HTTP Requests / Execution Duration (seconds)
```

### Classification Criteria:
- **Good (>= 500 req/sec)**: System is highly optimized, using caching, optimized indexing, and async processing.
- **Average (100 - 500 req/sec)**: Standard server configuration. Acceptable for ordinary corporate SaaS.
- **Poor (< 100 req/sec)**: Indicates heavy synchronous blocking processes, slow database responses, or lack of caching.

---

## 8. Response Time

Response time represents the time spent to complete a round-trip request.

- **avg (Average)**: Mathematical mean of all response times.
- **min / max**: Fastest and slowest response times recorded during execution.
- **med (Median/p50)**: Midpoint value. 50% of requests are faster, 50% slower.
- **p90 / p95**: Percentile benchmarks. E.g., `p95 = 263ms` means 95% of users experienced a load time of 263ms or less, while the remaining 5% experienced slower response times.

### Target Thresholds:
- **Development (Sandbox)**: `< 50ms` (no database lag, minimal network hops).
- **Testing (Staging environment)**: `< 200ms`.
- **Production**: `< 300ms` (standard network latency + CDN routing).

---

## 9. Performance Benchmarks

| Metric | Excellent | Good | Acceptable | Poor | Action Required |
|---|---|---|---|---|---|
| **Avg Response Time** | <100ms | 100-300ms | 300-800ms | >800ms | Optimize queries, enable Redis cache. |
| **P95 Response Time** | <200ms | 200-500ms | 500-1500ms | >1500ms | Increase worker threads, load balance. |
| **Error Rate** | 0% | <0.5% | <1.0% | >2.0% | Review backend logs for DB lockouts. |
| **CPU/RAM Usage** | <50% | 50-70% | 70-85% | >85% | Auto-scale servers, refactor resource leaks. |

---

## 10. Common Performance Bottlenecks

1. **Database Lockouts & Slow Queries**: Missing indices, table locks, or massive tables without pagination.
2. **Lack of Caching**: Querying database for static resource listings repeatedly. Use Redis or Memcached.
3. **CPU-Bound Code**: Cryptography, image resizing, or large JSON parsing on the main thread (blocking Node.js event loop).
4. **Connection Pooling**: Reaching max pool capacity in database connection driver, forcing threads to queue.
5. **Memory Leaks**: Global variables accumulating object states, preventing Garbage Collection.
6. **Network Latency**: Long physical distances between backend servers and database nodes.

---

## 11. Running Multiple APIs

To evaluate sequential user journeys (Login -> Browse -> Checkout), orchestrate a unified script containing multiple endpoints.

```javascript
import http from 'k6/http';
import { check, sleep } from 'k6';
import { BASE_URL } from './config.js';

export default function () {
  let token = '';

  // 1. Authenticate
  const loginRes = http.post(`${BASE_URL}/auth/login`, JSON.stringify({
    email: 'ganeshgiddathimmannagari@example.com',
    password: 'Password123!'
  }), { headers: { 'Content-Type': 'application/json' } });
  
  if (loginRes.status === 200) {
    token = JSON.parse(loginRes.body).token;
  }
  sleep(1);

  if (token) {
    const authHeaders = {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    };

    // 2. Fetch Dashboard Schemes
    http.get(`${BASE_URL}/schemes`, authHeaders);
    sleep(1);

    // 3. Browse store
    http.get(`${BASE_URL}/products`, authHeaders);
    sleep(1.5);
  }
}
```

---

## 12. Environment Variables

To configure dynamic target URLs or access tokens without modifying code, utilize `__ENV` values inside k6:

```javascript
// Accessing environment variable BASE_URL
const url = __ENV.BASE_URL || 'http://localhost:5000/api';
```

When executing from terminal, pass the environment variable using `-e`:
```bash
k6 run -e BASE_URL=https://staging.agroassist.com/api script.js
```

---

## 13. HTML Reports

k6 does not support direct HTML export by default. However, we can export HTML reports using `k6-reporter` in our scripts:

1. Import the HTML generator inside your script:
```javascript
import { htmlReport } from "https://raw.githubusercontent.com/benc-uk/k6-reporter/main/dist/bundle.js";
```

2. Expose the `handleSummary` hook:
```javascript
export function handleSummary(data) {
  return {
    "summary.html": htmlReport(data),
  };
}
```

When k6 finishes, it will write a self-contained, interactive HTML dashboard to `summary.html`.

---

## 14. Grafana Dashboard

For real-time visual tracking of metrics during high-concurrency runs:

```
[ k6 Run ] ----(HTTP Write)----> [ InfluxDB ] <====(Query)==== [ Grafana ]
```

1. **Start InfluxDB**: Run an InfluxDB instance locally or in Docker.
2. **Push metrics**: Execute k6 test specifying the InfluxDB engine:
   ```bash
   k6 run --out influxdb=http://localhost:8086/k6db script.js
   ```
3. **Import Dashboard in Grafana**: Add InfluxDB as a data source in Grafana, and import the official k6 dashboard (ID `2587`). This displays real-time RPS, latency percentiles, error rates, and VU progressions.

---

## 15. GitHub Actions Integration

To ensure that backend changes do not introduce performance regressions, execute k6 scripts inside your CI/CD workflows.
We can utilize the official `grafana/k6-action` runner. If test thresholds (e.g., error rate or latency limits) fail, the GitHub Action workflow will exit with code 1, blocking the pull request.

---

## 16. Complete GitHub Actions YAML

Create a workflow file under `.github/workflows/load-test.yml`:

```yaml
name: API Load Performance Tests

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  k6-performance:
    runs-on: ubuntu-latest

    steps:
    - name: Checkout Repository
      uses: actions/checkout@v4

    - name: Run k6 Load Test (Login Endpoint)
      uses: grafana/k6-action@v0.3.1
      with:
        filename: testing/load-tests/login.js
        flags: --out json=reports/k6_result.json

    - name: Upload Load Test Reports
      uses: actions/upload-artifact@v4
      with:
        name: k6-performance-report
        path: |
          reports/
          summary.html
```

---

## 17. Best Practices

1. **Avoid Testing Production**: Running high concurrency loads (e.g., 500 VUs) against production backends can cause denial of service (DoS) and trigger alarm systems.
2. **Maintain Test Data Integrity**: Create isolated test users, and avoid saturating primary database records.
3. **Simulate Real User Behaviors (Think Time)**: Use `sleep()` between API hops to match actual human navigation patterns.
4. **Set Realistic Thresholds**: Set targets based on baseline system capabilities (e.g., error rate < 1%).
5. **Isolate Test Environments**: Perform load tests on environments matching production hardware configurations for accurate CPU/memory stats.

---

## 18. Folder Structure

Store performance scripts cleanly inside your project root:

```
load-tests/
├── config.js            # Target URLs and endpoints
├── helpers.js           # API request methods and mock generator
├── login.js             # Basic auth endpoint stress test
└── users.js             # End-to-end API scenario testing
.github/
└── workflows/
    └── load-test.yml    # CI/CD action pipeline configuration
```

---

## 19. Interview Questions

Here are 30 essential Performance Testing & k6 questions with professional answers:

### Q1: What is Grafana k6 and why is it preferred over Apache JMeter?
**Answer**: k6 is a modern, developer-centric load testing tool written in Go with JavaScript support. It is preferred over JMeter because of its lightweight nature, lower memory footprint, version-control friendliness (code-based scripts instead of XML), native CI/CD integration, and high performance.

### Q2: What are "Thresholds" in k6?
**Answer**: Thresholds are pass/fail criteria used to evaluate metrics. If metrics fail to meet defined criteria (e.g., 95% of request latency under 200ms), k6 will terminate with a non-zero exit code, which is ideal for breaking CI/CD pipelines.

### Q3: What is the purpose of the `handleSummary(data)` function in k6?
**Answer**: It is a lifecycle hook executed at the end of a test run. It compiles raw metrics and formats them into custom formats like JSON, XML, HTML, or Markdown.

### Q4: How does k6 achieve high concurrency compared to Thread-based tools?
**Answer**: JMeter creates a physical OS thread for each virtual user, which limits scalability due to context switching. k6 runs on an event-driven Go architecture, executing virtual users as lightweight goroutines inside a single process, utilizing system resources more efficiently.

### Q5: Can k6 test WebSocket and gRPC connections?
**Answer**: Yes, k6 has built-in module support for both WebSocket connections and gRPC APIs, enabling full-duplex messaging and low-latency protocol testing.

### Q6: What are k6 Scenarios and why are they used?
**Answer**: Scenarios allow developers to configure different VU models, scheduling, execution executors, and execution durations in a single test run, simulating real-world complex user distributions.

### Q7: Explain the difference between `http_req_duration` and `http_req_waiting`.
**Answer**: `http_req_duration` represents the total request round-trip time (sending request, waiting for response headers, and downloading payload). `http_req_waiting` is the time spent waiting for the server to send the first byte (TTFB), which reflects server processing time.

### Q8: What are custom metrics in k6?
**Answer**: k6 allows developers to define custom metrics: Counters (track sums), Gauges (track current value), Trends (track statistics like min/max/percentile), and Rates (track percentage of truthy values).

### Q9: How do you bypass SSL certification errors in k6?
**Answer**: Configure the options block in your script to skip verification:
```javascript
export const options = { insecureSkipTLSVerify: true };
```

### Q10: How do you read files inside a k6 script?
**Answer**: Use the built-in `open` function:
```javascript
const data = JSON.parse(open('./data.json'));
```
*Note*: This file opening must be done in the global init context, not inside the default VU execution loop.

### Q11: What is "Ramping" and how is it configured in k6?
**Answer**: Ramping is the process of gradually increasing or decreasing the number of VUs to simulate traffic build-ups and cool-downs. It is configured using the `stages` options array.

### Q12: How can we run load tests distributed across multiple machines in k6?
**Answer**: Distributed execution is natively supported via **k6 Cloud** or by running k6 inside Kubernetes clusters using the **k6 Operator**.

### Q13: What is "Think Time" and why is it critical?
**Answer**: Think Time represents the pause duration between actions. Neglecting think time results in synthetic concurrent requests that overload servers unnaturally, misrepresenting real-world usage patterns.

### Q14: How do checks differ from thresholds?
**Answer**: Checks validate conditions (e.g. status code 200) without failing the test run. Thresholds evaluate global statistics (e.g. error rate < 1%) and explicitly fail the pipeline if violated.

### Q15: How do you handle Session State / Cookies in k6?
**Answer**: k6 automatically manages cookie storage for each virtual user. Cookies returned in response headers are sent back in subsequent requests automatically.

### Q16: What is a memory leak and how do you spot it during a soak test?
**Answer**: A memory leak occurs when memory allocations are not released. In a long-running soak test, it is identified by a continuously upward-sloping RAM consumption chart on the server despite a constant VU workload.

### Q17: What does "TCP Connection Pooling" mean and how do you optimize it?
**Answer**: Connection pooling is the reuse of active database/server TCP connections. It prevents latency overhead from repeatedly opening/closing sockets. Optimize it by setting high reuse limits in your database drivers.

### Q18: What is Time To First Byte (TTFB) and why is it useful?
**Answer**: TTFB is the time elapsed between client request and receipt of the first byte of response data. It isolates server processing lag from network file download lag.

### Q19: Explain the difference between p95 and p99 response times.
**Answer**: p95 indicates 95% of requests completed under a given duration (5% were slower). p99 indicates 99% completed (1% were slower). p99 is a more stringent standard used for high-availability systems.

### Q20: How do you pass security headers to a k6 API request?
**Answer**: Pass them in the third argument of your request function:
```javascript
http.get(url, { headers: { 'Authorization': 'Bearer <token>' } });
```

### Q21: What is network latency and how does it affect load tests?
**Answer**: Latency is the delay in data transmission over network hops. High latency increases the total `http_req_duration` even if backend processing times (`http_req_waiting`) are very low.

### Q22: What is CPU starvation on load testing machines?
**Answer**: CPU starvation happens when the load generator running k6 reaches 100% CPU capacity. This distorts results, as the tool records high latencies caused by its own processing bottlenecks rather than the API.

### Q23: How do you simulate dynamic data entry for forms in k6?
**Answer**: Generate random values inside the VU execution block (using helper functions or external libraries like Faker) and append them dynamically to your payloads.

### Q24: What is cache-busting and why is it used?
**Answer**: Cache-busting appends random query strings (e.g. `?v=12345`) to URLs, forcing servers to bypass CDN and browser cache layers to evaluate raw application performance.

### Q25: How do you mock external third-party APIs during load testing?
**Answer**: Use mocking frameworks (like WireMock or Nock) or override host resolutions, directing traffic to a mock server that instantly returns success to prevent third-party bottlenecks from invalidating your test data.

### Q26: What is the maximum number of VUs a single k6 instance can run?
**Answer**: On standard developers' machines, k6 can handle up to 30,000 VUs depending on script complexity. On large VM instances, it can scale to over 50,000 VUs.

### Q27: How does database query indexing improve RPS?
**Answer**: Indexing changes query scans from linear O(N) lookup loops to binary/B-Tree O(log N) searches, reducing database CPU usage and wait times, which allows the server to process more incoming requests.

### Q28: How do you inspect failed requests during a test?
**Answer**: Filter failed logs by writing them to standard error or console when the check fails:
```javascript
if (res.status !== 200) { console.error(`Failed: ${res.body}`); }
```

### Q29: Can you run k6 load tests locally without installing anything?
**Answer**: Yes, using the official Docker image:
```bash
docker run --rm -i grafana/k6 run - <script.js
```

### Q30: How do you scale k6 dynamically in Cloud deployments?
**Answer**: Deploy k6 scripts to Grafana Cloud or integrate with Kubernetes Auto-scalers to adjust pod limits dynamically based on target stages.

---

## 20. Summary (Cheat Sheet)

### Quick Commands

#### Installation
```powershell
winget install GrafanaLabs.k6
```

#### Run Local Script
```bash
k6 run test.js
```

#### Run with Custom VUs/Duration
```bash
k6 run --vus 50 --duration 30s test.js
```

#### Export to InfluxDB / Grafana
```bash
k6 run --out influxdb=http://localhost:8086/k6db test.js
```

### Best Practices Checklist
- [x] Configure think times (`sleep(1)`) between user actions.
- [x] Establish precise threshold values for response times (`http_req_duration`) and error rates.
- [x] Run stress tests in off-peak hours against isolated test staging environments.
- [x] Leverage environment variables to toggle URL pathways dynamically.
- [x] Always monitor target server metrics (CPU, RAM, DB Connections) alongside k6 metrics.
