import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

const transporter = nodemailer.createTransport({
  service: "gmail", // Gmail automáticamente configura host y puerto
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

export const enviarCorreo = async (
  to: string,
  subject: string,
  text: string,
  html?: string
) => {
  const mailOptions = {
    from: `"PandaWok" <${process.env.EMAIL_USER}>`,
    to,
    subject,
    text,
    html,
  };

  return transporter.sendMail(mailOptions);
};
