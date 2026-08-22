const ExcelJS = require('exceljs');
const path = require('path');
const fs = require('fs');
const logger = require('./logger');

class ExcelReporter {
  static async generateReport(summaryData, testCases, failedTests, logs) {
    logger.info('Generating Web E2E Excel execution report...');
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Selenium Web QA Automation Suite';
    workbook.created = new Date();

    const headerFill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1976D2' } // Deep Blue
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
      { metric: 'Environment', value: summaryData.environment || 'Localhost / Staging' },
      { metric: 'Total Tests', value: summaryData.totalTests || 0 },
      { metric: 'Passed', value: summaryData.passed || 0 },
      { metric: 'Failed', value: summaryData.failed || 0 },
      { metric: 'Skipped', value: summaryData.skipped || 0 },
      { metric: 'Pass Percentage', value: summaryData.passPercentage || '0%' },
      { metric: 'Execution Duration', value: summaryData.duration || '0s' }
    ];

    wsSummary.addRows(summaryRows);
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
      { header: 'Scenario Name', key: 'scenarioName', width: 35 },
      { header: 'Browser', key: 'browser', width: 15 },
      { header: 'Status', key: 'status', width: 15 },
      { header: 'Start Time', key: 'startTime', width: 22 },
      { header: 'End Time', key: 'endTime', width: 22 },
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
      { header: 'Browser', key: 'browser', width: 15 },
      { header: 'URL', key: 'url', width: 40 }
    ];

    wsFailed.addRows(failedTests);
    wsFailed.getRow(1).eachCell(cell => {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFC62828' }
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
      { header: 'Step Description', key: 'stepDescription', width: 40 },
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
    const reportPath = path.join(reportsDir, 'E2E_Report.xlsx');
    await workbook.xlsx.writeFile(reportPath);
    logger.info(`Excel E2E report saved successfully to ${reportPath}`);
    return reportPath;
  }
}

module.exports = ExcelReporter;
