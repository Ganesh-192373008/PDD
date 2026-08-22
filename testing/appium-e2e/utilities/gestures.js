const logger = require('./logger');

class Gestures {
  static async tap(driver, element) {
    logger.info('Performing gesture: Tap');
    await element.click();
  }

  static async doubleTap(driver, element) {
    logger.info('Performing gesture: Double Tap');
    const location = await element.getLocation();
    const size = await element.getSize();
    const x = location.x + size.width / 2;
    const y = location.y + size.height / 2;

    await driver.performActions([
      {
        type: 'pointer',
        id: 'finger1',
        parameters: { pointerType: 'touch' },
        actions: [
          { type: 'pointerMove', duration: 0, x, y },
          { type: 'pointerDown', button: 0 },
          { type: 'pointerUp', button: 0 },
          { type: 'pause', duration: 100 },
          { type: 'pointerDown', button: 0 },
          { type: 'pointerUp', button: 0 }
        ]
      }
    ]);
  }

  static async longPress(driver, element, durationMs = 2000) {
    logger.info(`Performing gesture: Long Press (${durationMs}ms)`);
    const location = await element.getLocation();
    const size = await element.getSize();
    const x = location.x + size.width / 2;
    const y = location.y + size.height / 2;

    await driver.performActions([
      {
        type: 'pointer',
        id: 'finger1',
        parameters: { pointerType: 'touch' },
        actions: [
          { type: 'pointerMove', duration: 0, x, y },
          { type: 'pointerDown', button: 0 },
          { type: 'pause', duration: durationMs },
          { type: 'pointerUp', button: 0 }
        ]
      }
    ]);
  }

  static async scroll(driver, fromX, fromY, toX, toY, durationMs = 1000) {
    logger.info(`Performing gesture: Scroll from (${fromX}, ${fromY}) to (${toX}, ${toY})`);
    await driver.performActions([
      {
        type: 'pointer',
        id: 'finger1',
        parameters: { pointerType: 'touch' },
        actions: [
          { type: 'pointerMove', duration: 0, x: fromX, y: fromY },
          { type: 'pointerDown', button: 0 },
          { type: 'pointerMove', duration: durationMs, x: toX, y: toY },
          { type: 'pointerUp', button: 0 }
        ]
      }
    ]);
  }

  static async swipe(driver, direction, startRatio = 0.8, endRatio = 0.2) {
    logger.info(`Performing gesture: Swipe ${direction}`);
    const size = await driver.getWindowSize();
    const width = size.width;
    const height = size.height;

    let fromX, fromY, toX, toY;

    switch (direction.toLowerCase()) {
      case 'left':
        fromX = Math.round(width * startRatio);
        toX = Math.round(width * endRatio);
        fromY = toY = Math.round(height / 2);
        break;
      case 'right':
        fromX = Math.round(width * endRatio);
        toX = Math.round(width * startRatio);
        fromY = toY = Math.round(height / 2);
        break;
      case 'up':
        fromY = Math.round(height * startRatio);
        toY = Math.round(height * endRatio);
        fromX = toX = Math.round(width / 2);
        break;
      case 'down':
        fromY = Math.round(height * endRatio);
        toY = Math.round(height * startRatio);
        fromX = toX = Math.round(width / 2);
        break;
      default:
        throw new Error(`Unsupported swipe direction: ${direction}`);
    }

    await this.scroll(driver, fromX, fromY, toX, toY, 800);
  }

  static async dragAndDrop(driver, sourceElement, targetElement) {
    logger.info('Performing gesture: Drag and Drop');
    const sourceLoc = await sourceElement.getLocation();
    const sourceSize = await sourceElement.getSize();
    const targetLoc = await targetElement.getLocation();
    const targetSize = await targetElement.getSize();

    const fromX = sourceLoc.x + sourceSize.width / 2;
    const fromY = sourceLoc.y + sourceSize.height / 2;
    const toX = targetLoc.x + targetSize.width / 2;
    const toY = targetLoc.y + targetSize.height / 2;

    await driver.performActions([
      {
        type: 'pointer',
        id: 'finger1',
        parameters: { pointerType: 'touch' },
        actions: [
          { type: 'pointerMove', duration: 0, x: fromX, y: fromY },
          { type: 'pointerDown', button: 0 },
          { type: 'pause', duration: 500 },
          { type: 'pointerMove', duration: 1000, x: toX, y: toY },
          { type: 'pointerUp', button: 0 }
        ]
      }
    ]);
  }

  static async pinch(driver, element) {
    logger.info('Performing gesture: Pinch (Zoom In/Out)');
    const location = await element.getLocation();
    const size = await element.getSize();
    const centerX = location.x + size.width / 2;
    const centerY = location.y + size.height / 2;

    await driver.performActions([
      {
        type: 'pointer',
        id: 'finger1',
        parameters: { pointerType: 'touch' },
        actions: [
          { type: 'pointerMove', duration: 0, x: centerX - 100, y: centerY },
          { type: 'pointerDown', button: 0 },
          { type: 'pointerMove', duration: 1000, x: centerX - 20, y: centerY },
          { type: 'pointerUp', button: 0 }
        ]
      },
      {
        type: 'pointer',
        id: 'finger2',
        parameters: { pointerType: 'touch' },
        actions: [
          { type: 'pointerMove', duration: 0, x: centerX + 100, y: centerY },
          { type: 'pointerDown', button: 0 },
          { type: 'pointerMove', duration: 1000, x: centerX + 20, y: centerY },
          { type: 'pointerUp', button: 0 }
        ]
      }
    ]);
  }

  static async zoom(driver, element) {
    logger.info('Performing gesture: Zoom');
    const location = await element.getLocation();
    const size = await element.getSize();
    const centerX = location.x + size.width / 2;
    const centerY = location.y + size.height / 2;

    await driver.performActions([
      {
        type: 'pointer',
        id: 'finger1',
        parameters: { pointerType: 'touch' },
        actions: [
          { type: 'pointerMove', duration: 0, x: centerX - 20, y: centerY },
          { type: 'pointerDown', button: 0 },
          { type: 'pointerMove', duration: 1000, x: centerX - 150, y: centerY },
          { type: 'pointerUp', button: 0 }
        ]
      },
      {
        type: 'pointer',
        id: 'finger2',
        parameters: { pointerType: 'touch' },
        actions: [
          { type: 'pointerMove', duration: 0, x: centerX + 20, y: centerY },
          { type: 'pointerDown', button: 0 },
          { type: 'pointerMove', duration: 1000, x: centerX + 150, y: centerY },
          { type: 'pointerUp', button: 0 }
        ]
      }
    ]);
  }
}

module.exports = Gestures;
