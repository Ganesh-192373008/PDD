const { expect } = require('chai');
const path = require('path');
const DriverFactory = require('../utilities/driverFactory');
const AuthPage = require('../pages/authPage');
const logger = require('../utilities/logger');
const ExcelReporter = require('../utilities/excelReporter');
const AiScanner = require('../utilities/aiScanner');

describe('AgroAssist Appium E2E Enterprise Suite', function () {
  this.timeout(180000); // 3 minutes

  let driver;
  let authPage;
  
  // Reporter states
  const testResults = [];
  const failedTests = [];
  const executionLogs = [];
  let startTime;

  function logStep(testName, step, result, remarks = '') {
    const timestamp = new Date().toISOString();
    executionLogs.push({ timestamp, testName, step, result, remarks });
    logger.info(`[${testName}] - ${step} - ${result} - ${remarks}`);
  }

  before(async function () {
    startTime = Date.now();
    logger.info('Starting E2E Suite Initialization...');

    // Run dynamic AI screen scanning
    const dartPath = path.join(__dirname, '../../../mobile/lib/main.dart');
    const screens = AiScanner.scanFlutterScreens(dartPath);
    const dynamicScenarios = AiScanner.generateTestScenarios(screens);
    logger.info(`AI Module: Discovered ${dynamicScenarios.length} dynamic tests.`);

    try {
      driver = await DriverFactory.initDriver('UiAutomator2');
      authPage = new AuthPage(driver);
      logStep('Suite Setup', 'Initialize Appium Driver', 'PASSED');
    } catch (e) {
      logStep('Suite Setup', 'Initialize Appium Driver', 'FAILED', e.message);
      throw e;
    }
  });

  after(async function () {
    logger.info('Tearing down E2E Suite...');
    const duration = ((Date.now() - startTime) / 1000).toFixed(2) + 's';
    
    // Compile metrics
    const totalTests = testResults.length;
    const passed = testResults.filter(t => t.status === 'PASSED').length;
    const failed = testResults.filter(t => t.status === 'FAILED').length;
    const skipped = testResults.filter(t => t.status === 'SKIPPED').length;
    const passPercentage = totalTests > 0 ? ((passed / totalTests) * 100).toFixed(2) + '%' : '0%';

    const summaryData = {
      executionDate: new Date().toISOString().split('T')[0],
      deviceName: 'Android Emulator',
      androidVersion: 'Android 13',
      totalTests,
      passed,
      failed,
      skipped,
      passPercentage,
      duration
    };

    try {
      await ExcelReporter.generateReport(summaryData, testResults, failedTests, executionLogs);
      logStep('Suite Teardown', 'Generate Excel Report', 'PASSED');
    } catch (e) {
      logger.error(`Failed to generate excel report: ${e.message}`);
    }

    await DriverFactory.quitDriver(driver);
  });

  afterEach(async function () {
    const testName = this.currentTest.title;
    const duration = this.currentTest.duration || 0;
    const status = this.currentTest.state === 'passed' ? 'PASSED' : 'FAILED';

    testResults.push({
      testId: 'APP_E2E_' + testResults.length,
      module: 'Authentication/UI',
      scenario: testName,
      status,
      device: 'Android Emulator',
      duration: duration + 'ms'
    });

    if (this.currentTest.state === 'failed') {
      const err = this.currentTest.err;
      logger.error(`Test Failed: ${testName}. Reason: ${err.message}`);
      
      let failureInfo = { screenshotPath: 'N/A' };
      try {
        failureInfo = await authPage.captureFailure(testName.replace(/\s+/g, '_'));
      } catch (e) {
        logger.error(`Failed capturing screenshot/logs on test failure: ${e.message}`);
      }

      failedTests.push({
        testName,
        reason: err.message,
        screenshotPath: failureInfo.screenshotPath,
        device: 'Android Emulator',
        androidVersion: 'Android 13'
      });
      
      logStep(testName, 'Test Execution', 'FAILED', err.message);
    } else {
      logStep(testName, 'Test Execution', 'PASSED');
    }
  });

  // --- E2E Test Cases ---

  it('Validate Login Empty Credentials Validation', async function () {
    logStep(this.test.title, 'Navigating to Login Page', 'INFO');
    await authPage.login('', '');
    const errorText = await authPage.getValidationError();
    expect(errorText).to.contain('Please');
    logStep(this.test.title, 'Empty validation check', 'PASSED');
  });

  it('Validate Login Invalid Credentials Error Msg', async function () {
    logStep(this.test.title, 'Typing invalid credentials', 'INFO');
    await authPage.login('wrong@example.com', 'wrongpassword');
    const errorText = await authPage.getValidationError();
    expect(errorText).to.not.be.empty;
    logStep(this.test.title, 'Invalid credentials error display', 'PASSED');
  });

  it('Validate Email and Phone Formatting rules', async function () {
    logStep(this.test.title, 'Filling wrong formats in register', 'INFO');
    await authPage.register('Test', 'wrongemail', '123', 'pass', 'pass');
    const errorText = await authPage.getValidationError();
    expect(errorText).to.not.be.empty;
    logStep(this.test.title, 'Formats validation check', 'PASSED');
  });

  it('Validate Gestures: Swipe and Scroll on Dashboard', async function () {
    logStep(this.test.title, 'Performing Swipes', 'INFO');
    await authPage.swipeUp();
    await authPage.swipeDown();
    logStep(this.test.title, 'Gestures check', 'PASSED');
  });
});
