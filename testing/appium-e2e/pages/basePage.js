const logger = require('../utilities/logger');
const Gestures = require('../utilities/gestures');
const path = require('path');
const fs = require('fs');

class BasePage {
  constructor(driver) {
    this.driver = driver;
  }

  async findElement(selector, timeout = 10000) {
    const el = await this.driver.$(selector);
    await el.waitForExist({ timeout });
    return el;
  }

  async click(selector) {
    logger.info(`Clicking element: ${selector}`);
    const el = await this.findElement(selector);
    await el.click();
  }

  async type(selector, text) {
    logger.info(`Typing "${text}" into: ${selector}`);
    const el = await this.findElement(selector);
    await el.setValue(text);
  }

  async getText(selector) {
    const el = await this.findElement(selector);
    const text = await el.getText();
    logger.info(`Text of ${selector} is: "${text}"`);
    return text;
  }

  async isDisplayed(selector) {
    try {
      const el = await this.driver.$(selector);
      return await el.isDisplayed();
    } catch (e) {
      return false;
    }
  }

  async captureFailure(testName) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const folderPath = path.join(__dirname, '../reports/failures');
    
    if (!fs.existsSync(folderPath)) {
      fs.mkdirSync(folderPath, { recursive: true });
    }

    const screenshotPath = path.join(folderPath, `${testName}_${timestamp}.png`);
    const pageSourcePath = path.join(folderPath, `${testName}_${timestamp}_source.xml`);
    const logsPath = path.join(folderPath, `${testName}_${timestamp}_device.log`);

    // Capture screenshot
    try {
      await this.driver.saveScreenshot(screenshotPath);
      logger.info(`Failure screenshot captured: ${screenshotPath}`);
    } catch (e) {
      logger.error(`Failed to capture screenshot: ${e.message}`);
    }

    // Capture page source
    try {
      const source = await this.driver.getPageSource();
      fs.writeFileSync(pageSourcePath, source, 'utf8');
      logger.info(`Failure page source XML captured: ${pageSourcePath}`);
    } catch (e) {
      logger.error(`Failed to capture page source XML: ${e.message}`);
    }

    // Capture device logs
    try {
      const logs = await this.driver.getLogs('logcat');
      fs.writeFileSync(logsPath, JSON.stringify(logs, null, 2), 'utf8');
      logger.info(`Failure logcat logs captured: ${logsPath}`);
    } catch (e) {
      logger.error(`Failed to capture logcat logs: ${e.message}`);
    }

    return {
      screenshotPath,
      pageSourcePath,
      logsPath
    };
  }

  // Reuse Gestures
  async swipeUp() {
    await Gestures.swipe(this.driver, 'up');
  }

  async swipeDown() {
    await Gestures.swipe(this.driver, 'down');
  }
}

module.exports = BasePage;
