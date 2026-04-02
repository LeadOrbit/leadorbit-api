const nodemailer = require('nodemailer');
const db = require('../models');
const { decrypt } = require('../utils/encryption'); // import the decrypt function

async function sendEmail(fromEmail, toEmail, subject, html,replyTo) {
  const smtp = await db.Smtp.findOne({ where: { user: fromEmail } });
  if (!smtp) throw new Error(`No SMTP credentials found for ${fromEmail}`);

  const decryptedPassword = decrypt(smtp.password); // 🔐 decrypt the stored password

  const transporter = nodemailer.createTransport({
    host: smtp.host,
    port: smtp.port,
    secure: smtp.encryption === 'ssl',
    auth: {
      user: smtp.user,
      pass: decryptedPassword, // ✅ use decrypted password here
    },
    tls: smtp.encryption === 'tls' ? { rejectUnauthorized: false } : undefined,
  });

  const mailOptions = {
    from: smtp.user,
    to: toEmail,
    subject,
    html,
    replyTo
  };

  await transporter.sendMail(mailOptions);
}

module.exports = { sendEmail };
