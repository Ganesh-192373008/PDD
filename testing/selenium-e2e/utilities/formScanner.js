const fs = require('fs');
const path = require('path');
const logger = require('./logger');

class FormScanner {
  static scanReactRoutesAndForms(frontendSrcDir) {
    logger.info(`Enterprise Form Scanner: Initiating scan on React project: ${frontendSrcDir}`);
    const appJsxPath = path.join(frontendSrcDir, 'App.jsx');
    
    if (!fs.existsSync(appJsxPath)) {
      logger.warn('App.jsx not found in target path. Skipping automated scanning.');
      return [];
    }

    const appContent = fs.readFileSync(appJsxPath, 'utf8');
    const routes = [];

    // Parse routes from Route path="..." element={<View />}
    const routeRegex = /<Route\s+path="([^"]+)"\s+element=\{[\s\S]*?<(\w+)\s*\/>/g;
    let match;
    while ((match = routeRegex.exec(appContent)) !== null) {
      const routePath = match[1];
      const componentName = match[2];
      
      // Map component to view file
      const viewFilePath = path.join(frontendSrcDir, 'views', `${componentName}.jsx`);
      if (fs.existsSync(viewFilePath)) {
        routes.push({
          path: routePath,
          componentName,
          filePath: viewFilePath
        });
        logger.info(`Discovered route "${routePath}" mapped to view: ${componentName}.jsx`);
      }
    }

    const discoveredForms = [];

    // For each view, search for form inputs & validation rules
    routes.forEach(route => {
      const viewContent = fs.readFileSync(route.filePath, 'utf8');
      
      // Look for form tag or inputs
      if (viewContent.includes('<form') || viewContent.includes('<input')) {
        logger.info(`Scanning form inputs in ${route.componentName}.jsx...`);
        const inputs = [];

        // Regex for capturing <input> attributes (id, name, type, required)
        const inputRegex = /<input[\s\S]*?type="([^"]+)"[\s\S]*?name="([^"]+)"([\s\S]*?required)?/g;
        let inputMatch;
        while ((inputMatch = inputRegex.exec(viewContent)) !== null) {
          inputs.push({
            type: inputMatch[1],
            name: inputMatch[2],
            required: !!inputMatch[3],
            locator: `input[name="${inputMatch[2]}"]`
          });
        }

        // Look for buttons
        const buttonRegex = /<button[\s\S]*?>([\s\S]*?)<\/button>/g;
        const buttons = [];
        let btnMatch;
        while ((btnMatch = buttonRegex.exec(viewContent)) !== null) {
          const btnText = btnMatch[1].replace(/<[^>]*>/g, '').trim();
          buttons.push({
            text: btnText,
            locator: `button:contains("${btnText}")` // JQuery style fallback
          });
        }

        // Parse custom error validations
        const errorValidations = [];
        const validationRegex = /if\s*\([\s\S]*?(\w+)\.length\s*<\s*(\d+)[\s\S]*?\)\s*\{[\s\S]*?setError\('([^']+)'\)/g;
        let valMatch;
        while ((valMatch = validationRegex.exec(viewContent)) !== null) {
          errorValidations.push({
            field: valMatch[1],
            minLength: parseInt(valMatch[2]),
            message: valMatch[3]
          });
        }

        discoveredForms.push({
          route: route.path,
          componentName: route.componentName,
          inputs,
          buttons,
          errorValidations
        });
      }
    });

    logger.info(`Enterprise Form Scanner: Completed. Identified ${discoveredForms.length} forms with dynamic E2E potential.`);
    return discoveredForms;
  }
}

module.exports = FormScanner;
