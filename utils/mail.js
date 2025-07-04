// utils/mail.js
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'yasminehosny930@gmail.com', // ✨ اكتب إيميلك هنا
    pass: 'uwrx riap uloz kahe'   // ✨ كلمة مرور التطبيقات من الصورة
  }
});

async function sendCode(to, code) {
  await transporter.sendMail({
    from: '"Real Estate Support" <YOUR_EMAIL@gmail.com>', // ✨ إيميلك
    to,
    subject: "Reset your password",
    html: `<p>Your verification code is:</p><h2>${code}</h2><p>It will expire in 10 minutes.</p>`
  });
}

module.exports = sendCode;
