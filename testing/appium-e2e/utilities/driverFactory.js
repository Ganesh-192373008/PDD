const { remote } = require('webdriverio');
const { execSync } = require('child_process');
const config = require('../config/config');
const logger = require('./logger');

class DriverFactory {
  static async initDriver(automationType = 'UiAutomator2') {
    logger.info(`Initializing Appium Driver using: ${automationType}...`);

    // Auto-detect connected devices using adb
    let deviceName = 'Android_Emulator';
    try {
      const devices = execSync('adb devices').toString().split('\n');
      const activeDevices = devices
        .filter(line => line.trim() && !line.startsWith('List') && line.includes('device'))
        .map(line => line.split('\t')[0].trim());

      if (activeDevices.length > 0) {
        deviceName = activeDevices[0];
        logger.info(`Auto-detected active Android device: ${deviceName}`);
      } else {
        logger.warn('No active ADB devices found. Defaulting to Android_Emulator');
      }
    } catch (e) {
      logger.warn(`Could not run adb devices command: ${e.message}. Defaulting deviceName to Android_Emulator.`);
    }

    const caps = automationType === 'Flutter' 
      ? { ...config.flutterCapabilities, 'appium:deviceName': deviceName }
      : { ...config.capabilities, 'appium:deviceName': deviceName };

    const opts = {
      hostname: config.appium.host,
      port: config.appium.port,
      path: config.appium.path,
      capabilities: caps,
      logLevel: 'error'
    };

    try {
      const driver = await remote(opts);
      logger.info('Appium Session established successfully.');
      return driver;
    } catch (error) {
      logger.error(`Failed to initialize Appium session: ${error.message}`);
      throw error;
    }
  }

  static async quitDriver(driver) {
    if (driver) {
      logger.info('Stopping Appium Driver Session...');
      await driver.deleteSession();
    }
  }
}

module.exports = DriverFactory;
