const SeleniumHelper = require('../utilities/seleniumHelper');

class BasePage {
  constructor(driver) {
    this.driver = driver;
    this.helper = new SeleniumHelper(driver);
  }

  async open(url) {
    await this.driver.get(url);
  }

  async getTitle() {
    return await this.driver.getTitle();
  }

  async getCurrentUrl() {
    return await this.driver.getCurrentUrl();
  }

  async refresh() {
    await this.driver.navigate().refresh();
  }

  async back() {
    await this.driver.navigate().back();
  }

  async forward() {
    await this.driver.navigate().forward();
  }
}

module.exports = BasePage;
