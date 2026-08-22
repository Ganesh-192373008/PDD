require('dotenv').config();
const { sendResetPasswordEmail } = require('./utils/mailer');

async function test() {
  try {
    const recipient = 'ksaravananb9@gmail.com';
    // Modify SMTP_FROM temporarily to test ganeshgidda4@gmail.com as sender
    process.env.SMTP_FROM = 'ganeshgidda4@gmail.com';
    
    console.log(`Testing Brevo REST API email with sender=ganeshgidda4@gmail.com to: ${recipient}...`);
    const success = await sendResetPasswordEmail(recipient, '888777');
    console.log('Result:', success ? 'Email Sent Successfully!' : 'Email Failed');
  } catch (error) {
    console.error('Test script failed:', error);
  }
}

test();
