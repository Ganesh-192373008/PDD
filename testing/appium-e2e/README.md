# Appium E2E Enterprise Testing Suite

This directory contains the production-ready E2E automation framework for the AgroAssist mobile application (Android).

## Technology Stack
- **Automation Driver**: Appium 2.x (UiAutomator2, with extensions for Flutter testing)
- **Test Runner**: Mocha
- **Assertion Library**: Chai
- **Reporting**: Mochawesome (HTML) & ExcelJS (XLSX)
- **Logging**: Winston

## Folder Structure
```
appium-e2e/
├── config/
│   └── config.js            # Capabilities and connection ports
├── pages/
│   ├── basePage.js          # Shared interactions & failure capture (screenshots/source/logs)
│   └── authPage.js          # Selectors & flows for login/register
├── tests/
│   └── e2e.spec.js          # Main Test cases (Validations, Gestures, Custom Scenarios)
├── utilities/
│   ├── aiScanner.js         # Static analyzer scans Dart widgets & generates dynamic test scenarios
│   ├── driverFactory.js     # Automatically detects active adb device & initializes sessions
│   ├── gestures.js          # W3C gesture library (tap, swipe, drag-and-drop, zoom, pinch)
│   ├── excelReporter.js     # Excel reporter generating React_native_E2E_Report.xlsx
│   └── logger.js            # Winston console/file log integration
├── package.json
└── README.md
```

## Setup & Prerequisites
1. Install Node.js (v18+)
2. Install Appium 2.x globally:
   ```bash
   npm install -g appium
   ```
3. Install UiAutomator2 driver:
   ```bash
   appium driver install uiautomator2
   ```
4. Install local dependencies:
   ```bash
   npm install
   ```

## Run Tests
1. Make sure your Android emulator or real device is connected (check with `adb devices`).
2. Run the Appium Server:
   ```bash
   appium
   ```
3. Execute the tests:
   ```bash
   npm test
   ```

Reports will be created under `reports/` as `index.html` (Mochawesome) and `React_native_E2E_Report.xlsx` (ExcelJS).
In case of test failures, screenshots, XML page layouts, and device logs will be automatically exported to `reports/failures/`.
