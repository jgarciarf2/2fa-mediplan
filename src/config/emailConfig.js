const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD
    }
});

// aca genera un numero random de 6 digitos
const generateVerificationCode = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};

const sendVerificationEmail = async (email, fullname, verificationCode) => {
  const mailOptions = {
    from: process.env.SMTP_USER,
    to: email,
    subject: 'Verificación de Cuenta - Confirma tu email',
    html: `
      <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif;">
        <div style="background: linear-gradient(135deg, #667aaa 0%, #763abbff 100%); padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0;">¡Bienvenido!</h1>
        </div>
        <div style="padding: 30px; background-color: #f9f9f9;">
          <h2 style="color: #333;">Hola ${fullname},</h2>
          <p style="color: #555; line-height: 1.6;">
            Gracias por registrarte en nuestra plataforma. Para completar tu registro,
            necesitas verificar tu dirección de correo electrónico.
          </p>
          <div style="text-align: center; margin: 30px 0;">
            <div style="background-color: #667aaa; color: white; font-size: 32px; 
                        font-weight: bold; padding: 15px 30px; border-radius: 8px; 
                        display: inline-block; letter-spacing: 3px;">
              ${verificationCode}
            </div>
          </div>
          <p style="color: #555; line-height: 1.6;">
            Introduce este código en la aplicación para activar tu cuenta.
          </p>
          <p><strong>Este código expira en 15 minutos.</strong></p>
        </div>
      </div>
    `
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('Email enviado:', info.messageId);
    return { success: true, messageId: info.mensajeId };
  } catch (error) {
    console.error('Error enviando email:', error);
    return { success: false, error: error.message };
  }
};

module.exports = {
    transporter,
    generateVerificationCode,
    sendVerificationEmail
};