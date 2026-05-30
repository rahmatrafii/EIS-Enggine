import nodemailer from 'nodemailer'

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: Number(process.env.EMAIL_PORT),
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
})

/**
 * Mengirim email menggunakan Nodemailer
 * @param {{ to: string, subject: string, html: string }} options
 */
export async function sendEmail({ to, subject, html }) {
  const info = await transporter.sendMail({
    from: `"EIS Engine" <${process.env.EMAIL_FROM}>`,
    to,
    subject,
    html,
  })

  return info
}
