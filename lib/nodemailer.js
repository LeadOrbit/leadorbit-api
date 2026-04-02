const nodemailer = require('nodemailer');

// Function to create and verify transporter for each email account
const createEmailTransporter = async (emailConfig) => {
  try {
    const transporter = nodemailer.createTransport({
      host: 'smtp.zoho.in',
      port: 465,
      secure: true, // true for 465, false for other ports
      auth: {
        user: emailConfig.emailUser,
        pass: emailConfig.emailPassword
      },
      // tls: {
      //   rejectUnauthorized: emailConfig.rejectUnauthorized || false
      // },
      connectionTimeout: 10000,
    });

    // Verify connection
    await transporter.verify();
    console.log(`✅ Email server ready for ${emailConfig.emailUser}`);
    return transporter;
  } catch (error) {
    console.error(`❌ Email connection failed for ${emailConfig.emailUser}:`, error);
    throw error;
  }
};

// Email sending function that can be called from your crons
const sendEmail = async (emailConfig, mailOptions) => {
  try {
    // Create transporter with dynamic configuration
    const transporter = await createEmailTransporter(emailConfig);
    
    // Send email
    const info = await transporter.sendMail({
      from: `"${emailConfig.name || 'System'}" <${emailConfig.emailUser}>`,
      to: mailOptions.to,
      subject: mailOptions.subject,
    //   text: mailOptions.text,
      html: mailOptions.html,
    //   attachments: mailOptions.attachments || []
    });

    console.log(`Email sent from ${emailConfig.emailUser} to ${mailOptions.to}`);
    return info;
  } catch (error) {
    console.error(`Failed to send email from ${emailConfig.emailUser}:`, error);
    throw error;
  }
};

module.exports = {
  createEmailTransporter,
  sendEmail
};