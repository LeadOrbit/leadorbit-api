const nodemailer =require("nodemailer");

/**
 * Sends an email using Nodemailer.
 * @param {string} to - Recipient email.
 * @param {string} subject - Email subject.
 * @param {string} html - HTML content of the email.
 * @returns {Promise<boolean>} True if sent successfully, false otherwise.
 */
 const sendEmail = async ({ to, subject, html }) => {
  try {
      // 🚀 Create Nodemailer Transporter
    const transporter = nodemailer.createTransport({
      host: "smtp.zoho.in", // For India use smtp.zoho.in, for US use smtp.zoho.com
      port: 465,
      secure: true,
      auth: {
        user: process.env.ZOHO_USER, // Zoho email
        pass: process.env.ZOHO_PASS, // App password or account password
      },
    });

    const mailOptions = {
      from: `"AutoFlow" <${process.env.ZOHO_USER}>`,
      to,
      subject,
      html,
    };

    await transporter.sendMail(mailOptions);
    console.log("✅ Email sent to:", to);
    return true;
  } catch (error) {
    console.error("❌ Email send error:", error);
    return false;
  }
};

module.exports=sendEmail;