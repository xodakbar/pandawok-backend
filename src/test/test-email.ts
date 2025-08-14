// test-email.ts
import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

async function testSendEmail() {
  try {
    // Configura el transporter con Gmail
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER, // tu Gmail desde .env
        pass: process.env.EMAIL_PASS, // contraseña de aplicación
      },
    });

    const mailOptions = {
      from: `"PandaWok" <${process.env.EMAIL_USER}>`,
      to: "Nacho.Xodakbar@gmail.com", // correo destino para la prueba
      subject: "Correo de prueba desde Nodemailer + Gmail",
      text: "Este es un mensaje de prueba para verificar el envío de correos.",
      html: "<b>Este es un mensaje de prueba para verificar el envío de correos.</b>",
    };

    const info = await transporter.sendMail(mailOptions);

    console.log("✅ Mensaje enviado:", info.messageId);
  } catch (error) {
    console.error("❌ Error enviando correo de prueba:", error);
  }
}

testSendEmail();
