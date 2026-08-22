const { By } = require('selenium-webdriver');
const BasePage = require('./basePage');

class AuthPage extends BasePage {
  constructor(driver) {
    super(driver);
  }

  // Locators
  get emailInput() { return By.css('input[type="email"], input[name="email"]'); }
  get passwordInput() { return By.css('input[type="password"], input[name="password"]'); }
  get submitBtn() { return By.css('button[type="submit"], button.btn-primary'); }
  get toggleRegTab() { return By.xpath("//button[contains(text(), 'Register') or contains(text(), 'Sign Up')]"); }
  
  get nameInput() { return By.css('input[name="name"]'); }
  get phoneInput() { return By.css('input[name="phone"]'); }
  get confirmPasswordInput() { return By.css('input[name="confirmPassword"]'); }
  
  get errorAlert() { return By.css('.error-message, .alert-danger, [role="alert"]'); }
  get successAlert() { return By.css('.success-message, .alert-success'); }

  async login(email, password) {
    if (email) await this.helper.type(this.emailInput, email);
    if (password) await this.helper.type(this.passwordInput, password);
    await this.helper.click(this.submitBtn);
  }

  async register(name, email, phone, password, confirmPassword) {
    try {
      await this.helper.click(this.toggleRegTab);
    } catch (e) {
      // Toggle may not be present if already on page, ignore
    }
    
    if (name) await this.helper.type(this.nameInput, name);
    if (email) await this.helper.type(this.emailInput, email);
    if (phone) await this.helper.type(this.phoneInput, phone);
    if (password) await this.helper.type(this.passwordInput, password);
    if (confirmPassword) await this.helper.type(this.confirmPasswordInput, confirmPassword);
    
    await this.helper.click(this.submitBtn);
  }

  async getErrorMessage() {
    return await this.helper.getText(this.errorAlert);
  }
}

module.exports = AuthPage;
