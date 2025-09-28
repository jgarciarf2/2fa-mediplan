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

const sendLoginVerificationEmail = async (email, fullname, verificationCode) => {
  const mailOptions = {
    from: process.env.SMTP_USER,
    to: email,
    subject: 'Código de verificación - Inicio de sesión',
    html: `
      <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif;">
        <div style="background: linear-gradient(135deg, #763abbff 0%, #667aaa 100%); padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0;">Verificación de inicio de sesión</h1>
        </div>
        <div style="padding: 30px; background-color: #f9f9f9;">
          <h2 style="color: #333;">Hola ${fullname},</h2>
          <p style="color: #555; line-height: 1.6;">
            Hemos detectado un intento de inicio de sesión en tu cuenta.  
            Para confirmar que eres tú, introduce el siguiente código de verificación:
          </p>
          <div style="text-align: center; margin: 30px 0;">
            <div style="background-color: #763abbff; color: white; font-size: 32px; 
                        font-weight: bold; padding: 15px 30px; border-radius: 8px; 
                        display: inline-block; letter-spacing: 3px;">
              ${verificationCode}
            </div>
          </div>
          <p style="color: #555; line-height: 1.6;">
            Introduce este código en la aplicación para completar tu inicio de sesión.
          </p>
          <p><strong>Este código expira en 10 minutos.</strong></p>
        </div>
      </div>
    `
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('Email de inicio de sesión enviado:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error enviando email de login:', error);
    return { success: false, error: error.message };
  }
};

const sendPasswordResetEmail = async (email, fullname, verificationCode) => {
  const mailOptions = {
    from: process.env.SMTP_USER,
    to: email,
    subject: 'Recuperación de Contraseña - Código de Verificación',
    html: `
      <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif;">
        <div style="background: linear-gradient(135deg, #667aaa 0%, #763abbff 100%); padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0;">Recupera tu contraseña</h1>
        </div>
        <div style="padding: 30px; background-color: #f9f9f9;">
          <h2 style="color: #333;">Hola ${fullname},</h2>
          <p style="color: #555; line-height: 1.6;">
            Hemos recibido una solicitud para restablecer la contraseña de tu cuenta.
            Si no realizaste esta solicitud, puedes ignorar este mensaje.
          </p>
          <p style="color: #555; line-height: 1.6;">
            Si fuiste tú, utiliza el siguiente código de verificación para establecer una nueva contraseña:
          </p>
          <div style="text-align: center; margin: 30px 0;">
            <div style="background-color: #667aaa; color: white; font-size: 32px; 
                        font-weight: bold; padding: 15px 30px; border-radius: 8px; 
                        display: inline-block; letter-spacing: 3px;">
              ${verificationCode}
            </div>
          </div>
          <p style="color: #555; line-height: 1.6;">
            Este código expira en <strong>15 minutos</strong>. Después de ese tiempo deberás solicitar uno nuevo.
          </p>
          <p style="color: #999; font-size: 12px; text-align: center;">
            Si no solicitaste este cambio, por favor contacta a soporte o ignora este mensaje.
          </p>
        </div>
      </div>
    `
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('Email de recuperación enviado:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error enviando email de recuperación:', error);
    return { success: false, error: error.message };
  }
};

module.exports = {
    transporter,
    generateVerificationCode,
    sendVerificationEmail,
    sendLoginVerificationEmail,
    sendPasswordResetEmail
};