const { By, until } = require('selenium-webdriver');
const fs = require('fs');
const path = require('path');
const logger = require('./logger');

class SeleniumHelper {
  constructor(driver) {
    this.driver = driver;
  }

  async waitForElement(locator, timeout = 10000) {
    logger.info(`Waiting for element: ${locator.toString()}`);
    return await this.driver.wait(until.elementLocated(locator), timeout);
  }

  async waitForVisible(locator, timeout = 10000) {
    const el = await this.waitForElement(locator, timeout);
    await this.driver.wait(until.elementIsVisible(el), timeout);
    return el;
  }

  async click(locator, timeout = 10000) {
    logger.info(`Clicking element: ${locator.toString()}`);
    const el = await this.waitForVisible(locator, timeout);
    await el.click();
  }

  async type(locator, text, timeout = 10000) {
    logger.info(`Typing "${text}" into: ${locator.toString()}`);
    const el = await this.waitForVisible(locator, timeout);
    await el.clear();
    await el.sendKeys(text);
  }

  async getText(locator, timeout = 10000) {
    const el = await this.waitForVisible(locator, timeout);
    const text = await el.getText();
    logger.info(`Retrieved text: "${text}" from ${locator.toString()}`);
    return text;
  }

  async executeJS(script, ...args) {
    logger.info(`Executing Custom JS Script: ${script.substring(0, 100)}...`);
    return await this.driver.executeScript(script, ...args);
  }

  async scrollToElement(locator) {
    logger.info(`Scrolling to element: ${locator.toString()}`);
    const el = await this.waitForElement(locator);
    await this.executeJS('arguments[0].scrollIntoView({ behavior: "smooth", block: "center" });', el);
  }

  async handleAlert(action = 'accept') {
    logger.info(`Handling alert with action: ${action}`);
    await this.driver.wait(until.alertIsPresent(), 5000);
    const alert = await this.driver.switchTo().alert();
    const text = await alert.getText();
    if (action === 'accept') {
      await alert.accept();
    } else {
      await alert.dismiss();
    }
    return text;
  }

  async switchWindow(title) {
    logger.info(`Switching window target to: ${title}`);
    const handles = await this.driver.getAllWindowHandles();
    for (const handle of handles) {
      await this.driver.switchTo().window(handle);
      const currentTitle = await this.driver.getTitle();
      if (currentTitle.includes(title)) {
        return true;
      }
    }
    return false;
  }

  async captureFailure(testName) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const folderPath = path.join(__dirname, '../reports/failures');
    if (!fs.existsSync(folderPath)) {
      fs.mkdirSync(folderPath, { recursive: true });
    }

    const screenshotPath = path.join(folderPath, `${testName}_${timestamp}.png`);
    const logsPath = path.join(folderPath, `${testName}_${timestamp}_console.log`);

    // Capture screenshot
    try {
      const screenshot = await this.driver.takeScreenshot();
      fs.writeFileSync(screenshotPath, screenshot, 'base64');
      logger.info(`Failure screenshot captured: ${screenshotPath}`);
    } catch (e) {
      logger.error(`Failed to take screenshot: ${e.message}`);
    }

    // Capture browser console logs
    try {
      const logs = await this.driver.manage().logs().get('browser');
      fs.writeFileSync(logsPath, JSON.stringify(logs, null, 2), 'utf8');
      logger.info(`Browser console logs captured: ${logsPath}`);
    } catch (e) {
      logger.error(`Failed to capture console logs: ${e.message}`);
    }

    let url = 'N/A';
    try {
      url = await this.driver.getCurrentUrl();
    } catch (e) {}

    return {
      screenshotPath,
      logsPath,
      url
    };
  }

  static async retry(fn, retries = 3, delay = 2000) {
    for (let i = 0; i < retries; i++) {
      try {
        return await fn();
      } catch (error) {
        if (i === retries - 1) throw error;
        logger.warn(`Retry attempt ${i + 1} failed. Waiting ${delay}ms before retrying...`);
        await new Promise(res => setTimeout(res, delay));
      }
    }
  }
}

module.exports = SeleniumHelper;
