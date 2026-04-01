const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

async function enviarCorreo(destino, asunto, html) {
  try {
    const info = await transporter.sendMail({
      from: process.env.EMAIL_FROM,
      to: destino,
      subject: asunto,
      html: html,
    });

    console.log("Correo enviado:", info.messageId);
  } catch (error) {
    console.error("Error enviando correo:", error.message);
  }
}

module.exports = { enviarCorreo };