const BasePage = require('./basePage');

class AuthPage extends BasePage {
  constructor(driver) {
    super(driver);
  }

  // Locators
  get emailInput() { return '//android.widget.EditText[@content-desc="emailField"] | //android.widget.EditText[contains(@text, "Email")]'; }
  get passwordInput() { return '//android.widget.EditText[@content-desc="passwordField"] | //android.widget.EditText[contains(@text, "Password")]'; }
  get loginBtn() { return '//android.widget.Button[@content-desc="loginBtn"] | //android.widget.Button[contains(@text, "Login") or contains(@text, "GET STARTED")]'; }
  get registerTab() { return '//android.widget.TextView[contains(@text, "Register")] | //android.view.View[contains(@text, "Register")]'; }
  get nameInput() { return '//android.widget.EditText[@content-desc="nameField"] | //android.widget.EditText[contains(@text, "Name")]'; }
  get phoneInput() { return '//android.widget.EditText[@content-desc="phoneField"] | //android.widget.EditText[contains(@text, "Phone")]'; }
  get confirmPasswordInput() { return '//android.widget.EditText[@content-desc="confirmPasswordField"] | //android.widget.EditText[contains(@text, "Confirm")]'; }
  get registerBtn() { return '//android.widget.Button[@content-desc="registerBtn"] | //android.widget.Button[contains(@text, "Register")]'; }
  get validationErrorMsg() { return '//android.widget.TextView[contains(@text, "error") or contains(@text, "Please") or contains(@text, "invalid")]'; }
  get profileTab() { return '//android.widget.TextView[@text="Profile"] | //android.widget.ImageView[contains(@content-desc, "Profile")]'; }
  get logoutBtn() { return '//android.widget.Button[contains(@text, "Logout")] | //android.widget.TextView[contains(@text, "Logout")]'; }

  async login(email, password) {
    if (email) await this.type(this.emailInput, email);
    if (password) await this.type(this.passwordInput, password);
    await this.click(this.loginBtn);
  }

  async register(name, email, phone, password, confirmPassword) {
    await this.click(this.registerTab);
    if (name) await this.type(this.nameInput, name);
    if (email) await this.type(this.emailInput, email);
    if (phone) await this.type(this.phoneInput, phone);
    if (password) await this.type(this.passwordInput, password);
    if (confirmPassword) await this.type(this.confirmPasswordInput, confirmPassword);
    await this.click(this.registerBtn);
  }

  async logout() {
    await this.click(this.profileTab);
    await this.click(this.logoutBtn);
  }

  async getValidationError() {
    return await this.getText(this.validationErrorMsg);
  }
}

module.exports = AuthPage;
