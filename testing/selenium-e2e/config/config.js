module.exports = {
  baseUrl: process.env.BASE_URL || 'http://localhost:5173',
  browser: process.env.BROWSER || 'chrome', // chrome | firefox | edge
  headless: process.env.HEADLESS === 'true' || true, // default headless for CI/CD pipeline
  timeout: {
    implicit: parseInt(process.env.IMPLICIT_TIMEOUT) || 5000,
    explicit: parseInt(process.env.EXPLICIT_TIMEOUT) || 15000
  }
};
