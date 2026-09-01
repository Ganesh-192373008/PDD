const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const https = require('https');
const User = require('../models/User');
const OtpVerification = require('../models/OtpVerification');
const { sendResetPasswordEmail, sendLoginOTPEmail } = require('../utils/mailer');

// Helper to generate JWT token
const generateToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET || 'super_secret_agroassist_key_2026', {
    expiresIn: '30d',
  });
};

// @route   POST api/auth/register
// @desc    Register a new user
router.post('/register', async (req, res) => {
  try {
    const { name, email, phone, password, confirmPassword } = req.body;

    // 1. Validation
    if (!name || !email || !phone || !password || !confirmPassword) {
      return res.status(400).json({ message: 'All fields are required.' });
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: 'Invalid email format.' });
    }

    // Password strength check
    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters long.' });
    }

    // Password match check
    if (password !== confirmPassword) {
      return res.status(400).json({ message: 'Passwords do not match.' });
    }

    // Phone format check (simple numeric validation)
    const cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.length < 10) {
      return res.status(400).json({ message: 'Invalid phone number format.' });
    }

    // 2. Check duplicate accounts
    let userExists = await User.findOne({ $or: [{ email }, { phone: cleanPhone }] });
    if (userExists) {
      return res.status(400).json({ message: 'Account with this email or phone number already exists.' });
    }

    // 3. Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Generate a temporary 4-digit registration OTP
    const otpCode = Math.floor(1000 + Math.random() * 9000).toString();

    // Store in OtpVerification with a 10-minute expiration
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    const otpSalt = await bcrypt.genSalt(10);
    const hashedOtp = await bcrypt.hash(otpCode, otpSalt);

    await OtpVerification.create({
      phone: `REG_OTP_${email.toLowerCase()}`,
      otp: hashedOtp,
      expiresAt
    });

    // Attempt to send the verification code via Brevo
    let emailSent = false;
    try {
      emailSent = await sendLoginOTPEmail(email, otpCode);
    } catch (mailError) {
      console.error('[REGISTRATION OTP ERROR] Failed to send email via Brevo:', mailError);
    }

    if (emailSent) {
      res.status(200).json({
        message: 'Verification OTP sent successfully via email.',
        tempUser: { name, email: email.toLowerCase(), phone: cleanPhone, password: hashedPassword }
      });
    } else {
      // Fallback: print to console for development
      console.log(`[DEVELOPMENT REGISTRATION OTP LOG] Email to: ${email} | Code: ${otpCode}`);
      res.status(200).json({
        message: 'Verification OTP sent successfully (Development console).',
        tempUser: { name, email: email.toLowerCase(), phone: cleanPhone, password: hashedPassword }
      });
    }

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Server error during registration.' });
  }
});

// @route   POST api/auth/login
// @desc    Authenticate user & get token
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required.' });
    }

    // Find user
    const user = await User.findOne({ email });
    if (!user || !user.password) {
      return res.status(400).json({ message: 'Invalid email or password.' });
    }

    // Compare passwords
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid email or password.' });
    }

    const token = generateToken(user._id);

    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        location: user.location,
        preferredLanguage: user.preferredLanguage,
        crops: user.crops,
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error during login.' });
  }
});

// @route   POST api/auth/google-login
// @desc    Google OAuth login/register
router.post('/google-login', async (req, res) => {
  try {
    const { idToken, email: directEmail, name: directName, googleId: directGoogleId, picture: directPicture } = req.body;
    
    // 1. Direct / Mobile Google Authentication (allowing any Google account from mobile)
    if (directEmail) {
      const email = directEmail.toLowerCase().trim();
      const name = directName || email.split('@')[0];
      const googleId = directGoogleId || `google_${email.replace(/[^a-zA-Z0-9]/g, '_')}`;
      const picture = directPicture || '';

      let user = await User.findOne({ $or: [{ googleId }, { email }] });
      if (user) {
        if (!user.googleId) {
          user.googleId = googleId;
          if (picture && !user.profileImage) user.profileImage = picture;
          await user.save();
        }
      } else {
        user = await User.create({
          name,
          email,
          googleId,
          profileImage: picture,
          preferredLanguage: 'en',
        });
      }

      const token = generateToken(user._id);
      return res.json({
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          profileImage: user.profileImage,
          location: user.location,
          preferredLanguage: user.preferredLanguage,
          crops: user.crops,
        }
      });
    }

    if (!idToken) {
      return res.status(400).json({ message: 'Google ID token or account details required.' });
    }

    // 2. Call Google's tokeninfo API to verify the token signature and details
    https.get(`https://oauth2.googleapis.com/tokeninfo?id_token=${idToken}`, (response) => {
      let data = '';
      response.on('data', (chunk) => { data += chunk; });
      response.on('end', async () => {
        try {
          const payload = JSON.parse(data);

          if (payload.error_description || payload.error) {
            return res.status(400).json({ message: 'Google Token verification failed.', error: payload.error_description });
          }

          const { email, name, sub: googleId, picture } = payload;

          // Find or create user
          let user = await User.findOne({ $or: [{ googleId }, { email }] });

          if (user) {
            // Update Google ID if matched via email
            if (!user.googleId) {
              user.googleId = googleId;
              if (picture && !user.profileImage) user.profileImage = picture;
              await user.save();
            }
          } else {
            // Create new Google Auth User
            user = await User.create({
              name,
              email,
              googleId,
              profileImage: picture || '',
            });
          }

          const token = generateToken(user._id);

          res.json({
            token,
            user: {
              id: user._id,
              name: user.name,
              email: user.email,
              phone: user.phone,
              profileImage: user.profileImage,
              location: user.location,
              preferredLanguage: user.preferredLanguage,
              crops: user.crops,
            }
          });
        } catch (e) {
          res.status(400).json({ message: 'Error parsing Google Token data.' });
        }
      });
    }).on('error', (err) => {
      res.status(500).json({ message: 'Network error verifying Google token.' });
    });

  } catch (error) {
    console.error('Google login error:', error);
    res.status(500).json({ message: 'Server error during Google login.' });
  }
});

// @route   POST api/auth/register/verify
// @desc    Verify OTP and complete registration
router.post('/register/verify', async (req, res) => {
  try {
    const { tempUser, otp } = req.body;

    if (!tempUser || !otp) {
      return res.status(400).json({ message: 'Temp user data and OTP are required.' });
    }

    const { name, email, phone, password } = tempUser;

    // Find OTP records
    const otpRecords = await OtpVerification.find({ phone: `REG_OTP_${email.toLowerCase()}` }).sort({ createdAt: -1 });

    if (otpRecords.length === 0) {
      return res.status(400).json({ message: 'OTP code has expired or is invalid.' });
    }

    const latestOtpRecord = otpRecords[0];

    // Check expiration
    if (latestOtpRecord.expiresAt < new Date()) {
      await OtpVerification.deleteMany({ phone: `REG_OTP_${email.toLowerCase()}` });
      return res.status(400).json({ message: 'OTP code has expired.' });
    }

    // Verify OTP code hash
    const isMatch = await bcrypt.compare(otp, latestOtpRecord.otp);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid OTP code.' });
    }

    // Delete verification record
    await OtpVerification.deleteMany({ phone: `REG_OTP_${email.toLowerCase()}` });

    // Double check duplicate account
    let userExists = await User.findOne({ $or: [{ email }, { phone }] });
    if (userExists) {
      return res.status(400).json({ message: 'Account with this email or phone number already exists.' });
    }

    // Create user in DB
    const user = await User.create({
      name,
      email,
      phone,
      password, // already hashed
    });

    const token = generateToken(user._id);

    res.status(201).json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
      }
    });

  } catch (error) {
    console.error('Registration OTP verification error:', error);
    res.status(500).json({ message: 'Server error during registration verification.' });
  }
});

// @route   POST api/auth/forgot-password
// @desc    Forgot Password initialization
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: 'Email is required.' });

    const cleanEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: cleanEmail });
    if (!user) {
      return res.status(404).json({ message: 'No account found registered with this email address. Please check your email or create a new account.' });
    }

    // Generate a temporary 4-digit password reset code
    const resetCode = Math.floor(1000 + Math.random() * 9000).toString();

    // Store in OtpVerification
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 mins
    const salt = await bcrypt.genSalt(10);
    const hashedCode = await bcrypt.hash(resetCode, salt);

    await OtpVerification.deleteMany({ phone: `RESET_${cleanEmail}` });

    await OtpVerification.create({
      phone: `RESET_${cleanEmail}`,
      otp: hashedCode,
      expiresAt
    });

    // Attempt to send email via Brevo SMTP
    let emailSent = false;
    try {
      emailSent = await sendResetPasswordEmail(cleanEmail, resetCode);
    } catch (mailError) {
      console.error('[PASSWORD RESET ERROR] Failed to send email via Brevo:', mailError);
    }

    console.log(`[PASSWORD RESET LOG] Email to: ${cleanEmail} | Code: ${resetCode} | Sent: ${emailSent}`);

    if (emailSent) {
      res.json({ message: 'Recovery code sent successfully to your email.' });
    } else {
      res.json({ message: `Recovery code: ${resetCode} (Development fallback)` });
    }
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ message: error.message || 'Server error during forgot password.' });
  }
});

// @route   POST api/auth/reset-password
// @desc    Reset password using reset code
router.post('/reset-password', async (req, res) => {
  try {
    const { email, code, newPassword } = req.body;

    if (!email || !code || !newPassword) {
      return res.status(400).json({ message: 'All fields are required.' });
    }

    const cleanEmail = email.toLowerCase().trim();
    const resetRecords = await OtpVerification.find({ phone: `RESET_${cleanEmail}` }).sort({ createdAt: -1 });
    if (resetRecords.length === 0) {
      return res.status(400).json({ message: 'Invalid or expired reset code.' });
    }

    const latestReset = resetRecords[0];

    if (latestReset.expiresAt < new Date()) {
      await OtpVerification.deleteMany({ phone: `RESET_${cleanEmail}` });
      return res.status(400).json({ message: 'Reset code has expired.' });
    }

    const isMatch = await bcrypt.compare(code, latestReset.otp);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid reset code. Please check the code in your email.' });
    }

    // Clean up
    await OtpVerification.deleteMany({ phone: `RESET_${cleanEmail}` });

    const user = await User.findOne({ email: cleanEmail });
    if (!user) return res.status(404).json({ message: 'User account not found.' });

    // Update password
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    await user.save();

    res.json({ message: 'Password has been reset successfully. Please log in with your new password.' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ message: error.message || 'Server error resetting password.' });
  }
});

// @route   POST api/auth/otp/send
// @desc    Send OTP to a mobile phone number
router.post('/otp/send', async (req, res) => {
  try {
    const { countryCode, phone } = req.body;
    if (!phone) {
      return res.status(400).json({ message: 'Phone number is required.' });
    }

    const cleanPhone = (countryCode || '') + phone.replace(/\D/g, '');
    
    // Generate a 6-digit OTP
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();

    // Store in OtpVerification
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes expiration
    const salt = await bcrypt.genSalt(10);
    const hashedOtp = await bcrypt.hash(otpCode, salt);

    await OtpVerification.deleteMany({ phone: cleanPhone }); // clear existing
    await OtpVerification.create({
      phone: cleanPhone,
      otp: hashedOtp,
      expiresAt
    });

    // SMS Gateway Mock / Twilio / SMS sending integration:
    console.log(`[SMS GATEWAY ONLINE] Sending Verification OTP code ${otpCode} to ${cleanPhone}`);

    res.status(200).json({
      message: 'OTP sent successfully.',
      otp: otpCode // return in body so the client app can easily auto-read or display it during testing
    });

  } catch (error) {
    console.error('Error sending mobile OTP:', error);
    res.status(500).json({ message: 'Error sending OTP.' });
  }
});

// @route   POST api/auth/otp/verify
// @desc    Verify OTP code and return JWT token
router.post('/otp/verify', async (req, res) => {
  try {
    const { countryCode, phone, otp } = req.body;
    if (!phone || !otp) {
      return res.status(400).json({ message: 'Phone number and OTP are required.' });
    }

    const cleanPhone = (countryCode || '') + phone.replace(/\D/g, '');
    const otpRecords = await OtpVerification.find({ phone: cleanPhone }).sort({ createdAt: -1 });

    if (otpRecords.length === 0) {
      return res.status(400).json({ message: 'OTP has expired or is invalid.' });
    }

    const latestOtpRecord = otpRecords[0];

    if (latestOtpRecord.expiresAt < new Date()) {
      await OtpVerification.deleteMany({ phone: cleanPhone });
      return res.status(400).json({ message: 'OTP has expired.' });
    }

    const isMatch = await bcrypt.compare(otp, latestOtpRecord.otp);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid OTP code.' });
    }

    // Clean up used OTP
    await OtpVerification.deleteMany({ phone: cleanPhone });

    // Find or create User
    let user = await User.findOne({ phone: cleanPhone });
    if (!user) {
      const shortPhone = cleanPhone.slice(-4);
      user = await User.create({
        name: `Farmer ${shortPhone}`,
        phone: cleanPhone,
        preferredLanguage: 'en'
      });
    }

    const token = generateToken(user._id);

    res.status(200).json({
      token,
      user: {
        id: user._id,
        name: user.name,
        phone: user.phone
      }
    });

  } catch (error) {
    console.error('Error verifying mobile OTP:', error);
    res.status(500).json({ message: 'Error verifying OTP.' });
  }
});

module.exports = router;
