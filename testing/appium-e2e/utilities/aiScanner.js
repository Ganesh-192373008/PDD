const fs = require('fs');
const path = require('path');
const logger = require('./logger');

class AiScanner {
  static scanFlutterScreens(dartFilePath) {
    logger.info(`AI-assisted testing: Scanning Flutter code for screens and widgets: ${dartFilePath}`);
    
    if (!fs.existsSync(dartFilePath)) {
      logger.warn(`Source path ${dartFilePath} not found. Skipping static analysis.`);
      return [];
    }

    const content = fs.readFileSync(dartFilePath, 'utf8');
    const screenDetections = [];

    // Parse stateful/stateless widgets (usually screens)
    const classRegex = /class\s+(\w+Screen|\w+View)\s+extends\s+StatefulWidget/g;
    let match;
    while ((match = classRegex.exec(content)) !== null) {
      const screenName = match[1];
      logger.info(`AI-assisted testing: Detected Screen Class: ${screenName}`);

      // Extract text fields inside this screen area (rough search block)
      const startIdx = match.index;
      // Capture a block of ~5000 characters for widget analysis inside class
      const block = content.substring(startIdx, startIdx + 8000);

      const fields = [];
      
      // Look for TextFormFields or TextFields
      const textFieldsRegex = /TextFormField\([\s\S]*?controller:\s*_(\w+Controller)[\s\S]*?\)/g;
      let fieldMatch;
      while ((fieldMatch = textFieldsRegex.exec(block)) !== null) {
        const controllerName = fieldMatch[1];
        fields.push({
          type: 'TextFormField',
          name: controllerName.replace('Controller', ''),
          locator: `//android.widget.EditText[contains(@resource-id, "${controllerName}")]`
        });
      }

      // Look for ElevateButtons
      const buttonRegex = /ElevatedButton\([\s\S]*?child:\s*const\s+Text\('([^']+)'\)[\s\S]*?\)/g;
      let buttonMatch;
      while ((buttonMatch = buttonRegex.exec(block)) !== null) {
        const btnText = buttonMatch[1];
        fields.push({
          type: 'ElevatedButton',
          name: btnText,
          locator: `//android.widget.Button[@text="${btnText}"]`
        });
      }

      // Look for ValueKeys
      const keyRegex = /ValueKey\('([^']+)'\)/g;
      let keyMatch;
      while ((keyMatch = keyRegex.exec(block)) !== null) {
        const valueKey = keyMatch[1];
        fields.push({
          type: 'ValueKey',
          name: valueKey,
          locator: `~${valueKey}`
        });
      }

      screenDetections.push({
        screen: screenName,
        widgets: fields
      });
    }

    logger.info(`AI-assisted testing: Discovered ${screenDetections.length} screen models from code.`);
    return screenDetections;
  }

  static generateTestScenarios(screens) {
    logger.info('AI-assisted testing: Generating E2E test scenarios dynamically from screens...');
    const scenarios = [];

    screens.forEach(screenData => {
      const formFields = screenData.widgets.filter(w => w.type === 'TextFormField');
      const submitButtons = screenData.widgets.filter(w => w.type === 'ElevatedButton');

      if (formFields.length > 0 && submitButtons.length > 0) {
        // Validation scenario
        scenarios.push({
          id: `AI_TEST_${screenData.screen.toUpperCase()}_VALIDATION`,
          module: screenData.screen,
          scenarioName: `Validate form fields in ${screenData.screen} screen`,
          steps: [
            ...formFields.map(f => ({
              action: 'input',
              locator: f.locator,
              value: '', // Test empty fields validation
              description: `Leave ${f.name} field empty`
            })),
            {
              action: 'click',
              locator: submitButtons[0].locator,
              description: `Click submit button "${submitButtons[0].name}"`
            },
            {
              action: 'validate_error',
              description: 'Verify error dialog or validation text is displayed'
            }
          ]
        });
      }
    });

    logger.info(`AI-assisted testing: Generated ${scenarios.length} dynamic test scenarios.`);
    return scenarios;
  }
}

module.exports = AiScanner;
