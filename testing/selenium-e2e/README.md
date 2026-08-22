# Selenium E2E Web Testing Suite

This directory contains the production-ready Selenium WebDriver E2E automation framework for the AgroAssist web frontend.

## Technology Stack
- **Web Automation**: Selenium WebDriver (Edge, Firefox, and Chrome)
- **Test Runner**: Mocha
- **Assertion Library**: Chai
- **Reporting**: Mochawesome (HTML) & ExcelJS (XLSX)
- **Logging**: Winston

## Folder Structure
```
selenium-e2e/
├── config/
│   └── config.js            # Capabilities, environment configurations, and timeouts
├── pages/
│   ├── basePage.js          # Shared web navigation actions
│   └── authPage.js          # Locators & actions for auth routes
├── tests/
│   └── dynamicE2E.spec.js   # Combines default test assertions with dynamically generated test cases
├── utilities/
│   ├── formScanner.js       # Dynamic AST Form Scanner parses React JSX files & validates input constraints
│   ├── seleniumHelper.js    # Wrapped explicit/implicit waits, JS execute, alerts, and retry wrappers
│   ├── excelReporter.js     # Excel reporter generating E2E_Report.xlsx
│   └── logger.js            # Winston console/file log configuration
├── package.json
└── README.md
```

## Setup & Prerequisites
1. Install Node.js (v18+)
2. Install browser drivers (ChromeDriver, GeckoDriver, EdgeDriver) or rely on Selenium's built-in manager.
3. Install dependencies:
   ```bash
   npm install
   ```

## Run Tests
1. Make sure your local React frontend application is running (by default on `http://localhost:5173`).
2. Run E2E tests:
   ```bash
   npm test
   ```

Execution details:
- Standard test cases will run against Login, registration, navigation, and validation schemas.
- The `formScanner.js` tool will automatically parse `frontend/src/views/` and construct test assertions dynamically from your React inputs.
- Excel worksheets (`reports/E2E_Report.xlsx`) and HTML reports (`reports/index.html`) will be exported upon completion.
- In case of failure, logs and screenshots are saved in `reports/failures/`.
