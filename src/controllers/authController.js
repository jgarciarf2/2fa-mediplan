const { PrismaClient } = require("../generated/prisma");
const prisma = new PrismaClient();
const bcrypt = require("bcrypt");
const e = require("express");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");
const { generateVerificationCode, sendVerificationEmail } = require("../config/emailConfig");

const signUp = async (req, res) => {
    let { email, current_password, fullname } = req.body;
    if (!email || !current_password || !fullname) {
        return res.status(400).json({ msg: "Faltan datos obligatorios." });
    }

    // Convertir el email a minúsculas y eliminar espacios en blanco
    if (email) email = email.toLowerCase().trim();
    console.log(email);

    // Validar formato de email
    const emailregex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailregex.test(email)) {
        return res.status(400).json({ msg: "Formato de correo electronico incorrecto." });
    }

    // Validar longitud contraseña
    if (current_password.length < 6) {
        return res.status(400).json({ msg: "La contraseña debe tener al menos 6 caracteres." });
    }

    // Validar complejidad contraseña
    const passwordregex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[$@$!%*?&#.$($)$-$_])[A-Za-z\d$@$!%*?&#.$($)$-$_]{6,15}$/;
    if (!passwordregex.test(current_password)) {
        return res.status(400).json({ msg: "La contraseña debe contener al menos una letra mayúscula, una letra minúscula, un número, un carácter especial y no debe contener espacios." });
    }

    // Verificar si el usuario ya existe
    let userExists = await prisma.users.findUnique({where: { email }});
    if (userExists) {
        return res.status(400).json({ msg: "El correo electronico ya está registrado." });
        console.log(userExists);
    }

    //incluye el codigo de verificacion --> 15 minutos
    const verificationCode = generateVerificationCode();
    const verificationExpires = new Date();
    verificationExpires.setMinutes(verificationExpires.getMinutes() + 15);

    // Crear nuevo usuario con estado PENDING y hashear la contraseña
    const createUser = await prisma.users.create({
        data: {
            email,
            current_password: await bcrypt.hash(current_password, 10),
            fullname,
            status: 'PENDING',
            verificationCode: verificationCode,
            verificationCodeExpires: verificationExpires
        }
    });

    const emailResult = await sendVerificationEmail(email, fullname, verificationCode);

    if (!emailResult.success) {
        //si hay un error borramos el usuario creado
        await prisma.users.delete({ where: { id: createUser.id } });
        return res.status(500).json({ 
            msg: "Error enviando el email de verificación. Intente nuevamente" });
    }

    return res.status(201).json(createUser);
};

const verifyEmail = async (req, res) => {
  try {
    const { email, verificationCode } = req.body;
    if (!email || !verificationCode) {
      return res.status(400).json({
        message: "Email y código de verificación son requeridos",
      });
    }

    // Buscar usuario por email
    const user = await prisma.users.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (!user) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }

    if (user.status === "ACTIVE") {
      return res.status(400).json({ message: "La cuenta ya está verificada" });
    }

    // Verificar si el código ha expirado
    if (new Date() > user.verificationCodeExpires) {
      return res.status(400).json({
        message: "El código de verificación ha expirado",
      });
    }

    // Verificar el código
    if (user.verificationCode !== verificationCode) {
      return res.status(400).json({
        message: "Código de verificación incorrecto",
      });
    }

    // Activar la cuenta
    const updatedUser = await prisma.users.update({
      where: { id: user.id },
      data: {
        status: "ACTIVE",
        verificationCode: null,
        verificationCodeExpires: null,
      },
    });

    return res.status(200).json({
      message: "Email verificado exitosamente. Tu cuenta está ahora activa.",
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        fullname: updatedUser.fullname,
        status: updatedUser.status,
      },
    });
  } catch (error) {
    return res.status(500).json({
      message: "Error interno del servidor",
    });
  }
};

const resendVerificationCode = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({message: "El email es requerido"});
    }

    const user = await prisma.users.findUnique({
      where: { email: email.toLowerCase().trim() },
    });
    if (!user) {
      return res.status(404).json({message: "Usuario no encontrado"});
    }
    if (user.status === "ACTIVE") {
      return res.status(400).json({message: "La cuenta ya está verificada"});
    }

    // Generar nuevo código
    const verificationCode = generateVerificationCode();
    const verificationExpires = new Date();
    verificationExpires.setMinutes(verificationExpires.getMinutes() + 15);

    // Actualizar usuario con nuevo código
    await prisma.users.update({
      where: { id: user.id },
      data: {
        verificationCode,
        verificationCodeExpires: verificationExpires,
      },
    });

    // Enviar email
    const emailResult = await sendVerificationEmail(
      email,
      user.fullname,
      verificationCode
    );

    if (!emailResult.success) {
      return res.status(500).json({message: "Error enviando el email de verificación"});
    }

    // Respuesta final
    return res.status(200).json({message: "Nuevo código de verificación enviado a tu email"});
  } catch (error) {
    console.error("Error en resendVerificationCode:", error);
    return res.status(500).json({
      message: "Error interno del servidor",
    });
  }
};

const signIn = async (req, res) => {
    let { email, current_password } = req.body;
    console.log(req.body);
};

module.exports = {signUp, verifyEmail, resendVerificationCode, signIn};