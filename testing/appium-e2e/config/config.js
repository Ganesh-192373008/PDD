const path = require('path');

module.exports = {
  appium: {
    host: '127.0.0.1',
    port: 4723,
    path: '/'
  },
  capabilities: {
    platformName: 'Android',
    'appium:automationName': 'UiAutomator2',
    'appium:deviceName': process.env.DEVICE_NAME || 'Android_Emulator',
    'appium:app': process.env.APK_PATH || path.join(__dirname, '../app/app-release.apk'),
    'appium:appPackage': process.env.APP_PACKAGE || 'com.company.app',
    'appium:appActivity': process.env.APP_ACTIVITY || 'com.company.app.MainActivity',
    'appium:noReset': false,
    'appium:fullReset': false,
    'appium:autoGrantPermissions': true,
    'appium:newCommandTimeout': 300
  },
  flutterCapabilities: {
    platformName: 'Android',
    'appium:automationName': 'Flutter',
    'appium:deviceName': process.env.DEVICE_NAME || 'Android_Emulator',
    'appium:app': process.env.APK_PATH || path.join(__dirname, '../app/app-release.apk'),
    'appium:noReset': false,
    'appium:fullReset': false,
    'appium:autoGrantPermissions': true,
    'appium:newCommandTimeout': 300
  }
};
