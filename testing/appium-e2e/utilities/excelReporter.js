const ExcelJS = require('exceljs');
const path = require('path');
const fs = require('fs');
const logger = require('./logger');

class ExcelReporter {
  static async generateReport(summaryData, testCases, failedTests, logs) {
    logger.info('Generating Excel E2E execution report...');
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Appium QA Automation Suite';
    workbook.created = new Date();

    // Setup styles
    const headerFill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF2E7D32' } // Leaf Green
    };
    const headerFont = {
      color: { argb: 'FFFFFFFF' },
      bold: true,
      name: 'Calibri',
      size: 11
    };
    const borderStyle = {
      top: { style: 'thin', color: { argb: 'FFD3D3D3' } },
      left: { style: 'thin', color: { argb: 'FFD3D3D3' } },
      bottom: { style: 'thin', color: { argb: 'FFD3D3D3' } },
      right: { style: 'thin', color: { argb: 'FFD3D3D3' } }
    };

    // Sheet 1: Summary
    const wsSummary = workbook.addWorksheet('Summary');
    wsSummary.views = [{ showGridLines: true }];
    wsSummary.columns = [
      { header: 'Metric', key: 'metric', width: 25 },
      { header: 'Value', key: 'value', width: 30 }
    ];
    
    const summaryRows = [
      { metric: 'Execution Date', value: summaryData.executionDate || new Date().toISOString() },
      { metric: 'Device Name', value: summaryData.deviceName || 'Android Emulator' },
      { metric: 'Android Version', value: summaryData.androidVersion || 'Android 13.0' },
      { metric: 'Total Tests', value: summaryData.totalTests || 0 },
      { metric: 'Passed', value: summaryData.passed || 0 },
      { metric: 'Failed', value: summaryData.failed || 0 },
      { metric: 'Skipped', value: summaryData.skipped || 0 },
      { metric: 'Pass Percentage', value: summaryData.passPercentage || '0%' },
      { metric: 'Duration', value: summaryData.duration || '0s' }
    ];

    wsSummary.addRows(summaryRows);
    
    // Style Summary Sheet
    wsSummary.getRow(1).eachCell(cell => {
      cell.fill = headerFill;
      cell.font = headerFont;
    });
    wsSummary.eachRow((row, rowNumber) => {
      row.eachCell(cell => {
        cell.border = borderStyle;
        if (rowNumber > 1 && cell.column.key === 'metric') {
          cell.font = { bold: true };
        }
      });
    });

    // Sheet 2: Test Cases
    const wsTestCases = workbook.addWorksheet('Test Cases');
    wsTestCases.views = [{ showGridLines: true }];
    wsTestCases.columns = [
      { header: 'Test ID', key: 'testId', width: 15 },
      { header: 'Module', key: 'module', width: 20 },
      { header: 'Scenario', key: 'scenario', width: 35 },
      { header: 'Status', key: 'status', width: 15 },
      { header: 'Device', key: 'device', width: 20 },
      { header: 'Duration', key: 'duration', width: 15 }
    ];

    wsTestCases.addRows(testCases);
    wsTestCases.getRow(1).eachCell(cell => {
      cell.fill = headerFill;
      cell.font = headerFont;
    });
    wsTestCases.eachRow((row, rowNumber) => {
      row.eachCell(cell => {
        cell.border = borderStyle;
        if (rowNumber > 1 && cell.column.key === 'status') {
          if (cell.value === 'PASSED') {
            cell.font = { color: { argb: 'FF2E7D32' }, bold: true };
          } else if (cell.value === 'FAILED') {
            cell.font = { color: { argb: 'FFC62828' }, bold: true };
          }
        }
      });
    });

    // Sheet 3: Failed Tests
    const wsFailed = workbook.addWorksheet('Failed Tests');
    wsFailed.views = [{ showGridLines: true }];
    wsFailed.columns = [
      { header: 'Test Name', key: 'testName', width: 30 },
      { header: 'Failure Reason', key: 'reason', width: 50 },
      { header: 'Screenshot Path', key: 'screenshotPath', width: 40 },
      { header: 'Device', key: 'device', width: 20 },
      { header: 'Android Version', key: 'androidVersion', width: 15 }
    ];

    wsFailed.addRows(failedTests);
    wsFailed.getRow(1).eachCell(cell => {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFC62828' } // Dark Red for Failures
      };
      cell.font = headerFont;
    });
    wsFailed.eachRow((row, rowNumber) => {
      row.eachCell(cell => {
        cell.border = borderStyle;
      });
    });

    // Sheet 4: Execution Logs
    const wsLogs = workbook.addWorksheet('Execution Logs');
    wsLogs.views = [{ showGridLines: true }];
    wsLogs.columns = [
      { header: 'Timestamp', key: 'timestamp', width: 22 },
      { header: 'Test Name', key: 'testName', width: 25 },
      { header: 'Step', key: 'step', width: 40 },
      { header: 'Result', key: 'result', width: 15 },
      { header: 'Remarks', key: 'remarks', width: 30 }
    ];

    wsLogs.addRows(logs);
    wsLogs.getRow(1).eachCell(cell => {
      cell.fill = headerFill;
      cell.font = headerFont;
    });
    wsLogs.eachRow((row, rowNumber) => {
      row.eachCell(cell => {
        cell.border = borderStyle;
      });
    });

    // Save report
    const reportsDir = path.join(__dirname, '../reports');
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }
    const reportPath = path.join(reportsDir, 'React_native_E2E_Report.xlsx');
    await workbook.xlsx.writeFile(reportPath);
    logger.info(`Excel report saved successfully to ${reportPath}`);
    return reportPath;
  }
}

module.exports = ExcelReporter;
