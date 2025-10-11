const fs = require("fs");
const csv = require("csv-parser");
const bcrypt = require("bcrypt");
const { PrismaClient, Role } = require("../generated/prisma");
const prisma = new PrismaClient();
const path = require("path");
const multer = require("multer");
const { logEvent } = require("../services/auditService");
const { generateVerificationCode, sendVerificationEmail } = require("../config/emailConfig");

// Función para calcular la edad a partir de la fecha de nacimiento
const calculateAge = (date) => {
  const today = new Date();
  const birthDate = new Date(date);
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
};

const formatFullname = (name) => {
  if (!name) return null;
  return name
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ") // quita espacios dobles
    .split(" ")
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};

// Mapeo de roles
const roleMap = {
  ADMINISTRADOR: Role.ADMIN,
  ADMIN: Role.ADMIN,
  MEDICO: Role.MEDICO,
  MEDICA: Role.MEDICO,
  ENFERMERA: Role.ENFERMERO,
  ENFERMERO: Role.ENFERMERO,
  PACIENTE: Role.PACIENTE,
  USER: Role.USER
};

const regex = {
  fullname: /^([A-ZÁÉÍÓÚÑ][a-záéíóúñ]+(?:-[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+)?)(\s[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+(?:-[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+)?)*$/,
  license_number: /^[0-9A-Za-z\-]{4,20}$/, // Identificación alfanumérica
  phone: /^\+?[0-9\s-]{7,20}$/, // Teléfono con dígitos, espacios, guiones y opcional +
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, // Formato email
};

// Función genérica para limpiar strings contra XSS
const sanitizeInput = (value) => {
  if (!value || typeof value !== "string") return value;
  return value
    .replace(/<.*?>/g, "") // elimina etiquetas HTML
    .replace(/[^\w\s@.\-ÁÉÍÓÚÑáéíóú]/g, ""); // restringe caracteres extraños
};

// Validación de edad
const validateAge = (dob) => {
  const age = calculateAge(dob);
  if (age < 0 || age > 100) {
    throw new Error(`Edad inválida (${age}). Debe estar entre 0 y 100 años.`);
  }
  return age;
};
// Validar formato de archivo
const validateFileFormat = (file) => {
  const allowedExt = [".csv", ".xlsx"];
  const ext = path.extname(file.originalname).toLowerCase();

  if (!allowedExt.includes(ext)) {
    throw new Error(`Formato no permitido (${ext}). Solo se aceptan CSV o XLSX`);
  }
};

// Validar tamaño de archivo y configurar multer
const upload = multer({
  limits: { fileSize: 60 * 1024 * 1024 },  // 60MB
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, "uploads/"),
    filename: (req, file, cb) => cb(null, Date.now() + "-" + file.originalname),
  }),
});

async function checkExistingFile(req, res) {
  const existingFile = await prisma.fileUploadLog.findUnique({
    where: { filename: req.file.originalname },
  });

  if (existingFile) {
    fs.unlink(req.file.path, () => {});
    res.status(400).json({
      message: `El archivo ${req.file.originalname} ya fue cargado anteriormente.`,
    });
    return true;
  }
  return false;
}

function parseCsv(filePath) {
  return new Promise((resolve, reject) => {
    const users = [];
    fs.createReadStream(filePath, { encoding: "utf8" })
      .pipe(csv({
        separator: ",",
        mapHeaders: ({ header }) => header.replace(/^\uFEFF/, "").trim(),
      }))
      .on("data", (row) => users.push(row))
      .on("end", () => resolve(users))
      .on("error", (err) => reject(err));
  });
}

async function preprocessUsers(usersToInsert) {
  const errorRecords = [];
  const validUsers = [];

  for (let i = 0; i < usersToInsert.length; i++) {
    const user = usersToInsert[i];

    try {
      sanitizeUserFields(user);
      validateRequiredFields(user);
      validateUserFormats(user);

      const dob = new Date(user.date_of_birth);
      user.age = validateAge(dob);
      user.date_of_birth = dob;
      user.role = roleMap[user.role?.toUpperCase()] || Role.USER;

      if (user.status === "PENDING") assignVerificationData(user);

      validUsers.push(user);
    } catch (err) {
      errorRecords.push({ row: i + 1, email: user.email, error: err.message });
    }
  }

  return { validUsers, errorRecords };
}

function sanitizeUserFields(user) {
  user.fullname = formatFullname(sanitizeInput(user.fullname)?.trim());
  user.email = sanitizeInput(user.email)?.trim().toLowerCase();
  user.license_number = sanitizeInput(user.license_number)?.trim();
  user.phone = sanitizeInput(user.phone)?.trim();
}

function validateRequiredFields(user) {
  const required = [user.email, user.fullname, user.current_password, user.date_of_birth];
  if (required.some((field) => !field))
    throw new Error("Campos obligatorios faltantes");
}

function validateUserFormats(user) {
  if (!regex.fullname.test(user.fullname)) throw new Error("Nombre inválido");
  if (user.license_number && !regex.license_number.test(user.license_number))
    throw new Error("Identificación inválida");
  if (user.phone && !regex.phone.test(user.phone))
    throw new Error("Teléfono inválido");
  if (!regex.email.test(user.email)) throw new Error("Email inválido");
}

function assignVerificationData(user) {
  user.verificationCode = generateVerificationCode();
  user.verificationCodeExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);
}

async function ensureDepartmentsAndSpecialties(validUsers) {
  const uniqueDepartments = [
    ...new Set(validUsers.map((u) => u.department?.toUpperCase()).filter(Boolean)),
  ];

  const existingDepartments = await prisma.department.findMany({
    where: { name: { in: uniqueDepartments } },
    select: { name: true },
  });

  const existingDeptNames = new Set(existingDepartments.map((d) => d.name));
  const newDepartments = uniqueDepartments
    .filter((d) => !existingDeptNames.has(d))
    .map((name) => ({ name }));

  if (newDepartments.length > 0)
    await prisma.department.createMany({ data: newDepartments });

  const deptMap = Object.fromEntries(
    (await prisma.department.findMany()).map((d) => [d.name, d.id])
  );

  const uniqueSpecs = [
    ...new Set(
      validUsers
        .filter((u) => u.specialty && u.department)
        .map((u) => `${u.specialty.toUpperCase()}|${u.department.toUpperCase()}`)
    ),
  ];

  const specData = uniqueSpecs.map((pair) => {
    const [name, dept] = pair.split("|");
    return { name, departmentId: deptMap[dept] };
  });

  const existingSpecs = await prisma.specialty.findMany({
    where: {
      OR: specData.map((s) => ({
        name: s.name,
        departmentId: s.departmentId,
      })),
    },
    select: { name: true, departmentId: true },
  });

  const existingSpecSet = new Set(
    existingSpecs.map((s) => `${s.name}|${s.departmentId}`)
  );

  const newSpecs = specData.filter(
    (s) => !existingSpecSet.has(`${s.name}|${s.departmentId}`)
  );

  if (newSpecs.length > 0)
    await prisma.specialty.createMany({ data: newSpecs });

  const allSpecs = await prisma.specialty.findMany();
  const specMap = Object.fromEntries(
    allSpecs.map((s) => [`${s.name}|${s.departmentId}`, s.id])
  );

  return { deptMap, specMap };
}

async function hashPasswords(validUsers) {
  await Promise.all(
    validUsers.map(async (u) => {
      u.hashedPassword = await bcrypt.hash(u.current_password, 10);
    })
  );
}

async function insertUsers(validUsers, deptMap, specMap) {
  await prisma.users.createMany({
    data: validUsers.map((u) => ({
      email: u.email,
      fullname: u.fullname,
      current_password: u.hashedPassword,
      status: u.status || "PENDING",
      date_of_birth: u.date_of_birth,
      age: u.age,
      license_number: u.license_number || null,
      phone: u.phone || null,
      role: u.role,
      departmentId: u.department ? deptMap[u.department?.toUpperCase()] : null,
      specialtyId:
        u.specialty && u.department
          ? specMap[`${u.specialty.toUpperCase()}|${deptMap[u.department?.toUpperCase()]}`]
          : null,
      verificationCode: u.verificationCode || null,
      verificationCodeExpires: u.verificationCodeExpires || null,
    })),
  });
}

async function sendVerificationEmails(validUsers) {
  const pendingUsers = validUsers.filter(
    (u) => u.status === "PENDING" && u.verificationCode
  );

  // No esperamos el resultado
  Promise.all(
    pendingUsers.map((u) =>
      sendVerificationEmail(u.email, u.fullname, u.verificationCode).catch(() => {})
    )
  ).then(() => {
    
  });
}

async function finalizeUpload(req, validUsers) {
  fs.unlink(req.file.path, () => {});
  await prisma.fileUploadLog.create({
    data: { filename: req.file.originalname, userId: req.user?.id || null },
  });

  await logEvent({
    userId: req.user.id,
    email: req.user.email,
    role: req.user.role,
    action: "BULK_UPLOAD_USERS",
    outcome: "SUCCESS",
    reason: `Carga masiva de ${validUsers.length} usuarios`,
    ip: req.ip,
    userAgent: req.headers["user-agent"],
  });
}

// ======================================================
// MÉTODO PRINCIPAL: bulkUploadUsers
// ======================================================

const bulkUploadUsers = async (req, res) => {
  if (!req.file)
    return res.status(400).json({ message: "Archivo CSV requerido." });

  if (await checkExistingFile(req, res)) return;

  try {
    validateFileFormat(req.file);
  } catch (err) {
    return res.status(400).json({ message: err.message });
  }

  try {
    const usersToInsert = await parseCsv(req.file.path);
    const { validUsers, errorRecords } = await preprocessUsers(usersToInsert);

    if (validUsers.length === 0)
      return res.status(400).json({
        message: "Todos los registros son inválidos",
        errors: errorRecords,
      });

    const { deptMap, specMap } = await ensureDepartmentsAndSpecialties(validUsers);
    await hashPasswords(validUsers);
    await insertUsers(validUsers, deptMap, specMap);
    sendVerificationEmails(validUsers);
    await finalizeUpload(req, validUsers);

    res.status(200).json({
      message: "Carga masiva completada",
      success: validUsers.length,
      failed: errorRecords.length,
      errors: errorRecords,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error procesando CSV", error: err.message });
  }
};

async function processUserDeletions(usersToDelete) {
  const successRecords = [];
  const errorRecords = [];

  const deletionPromises = usersToDelete.map(async (user, index) => {
    const row = index + 1;

    try {
      if (!user.email) throw new Error("El campo email es obligatorio");

      const deleted = await prisma.users.deleteMany({
        where: { email: user.email },
      });

      if (deleted.count > 0) {
        successRecords.push({ row, email: user.email });
      } else {
        throw new Error(`No se encontró usuario con email: ${user.email}`);
      }
    } catch (err) {
      errorRecords.push({
        row,
        email: user.email || null,
        error: err.message,
      });
    }
  });

  await Promise.all(deletionPromises);
  return { successRecords, errorRecords };
}

async function finalizeDelete(req, successRecords, errorRecords) {
  await prisma.fileUploadLog.deleteMany({
    where: { filename: req.file.originalname },
  });

  await logEvent({
    userId: req.user.id,
    email: req.user.email,
    role: req.user.role,
    action: "BULK_DELETE_USERS",
    outcome: "SUCCESS",
    reason: `Eliminación masiva: ${successRecords.length} exitosos, ${errorRecords.length} fallidos`,
    ip: req.ip,
    userAgent: req.headers["user-agent"],
  });
}

// ======================================================
// MÉTODO PRINCIPAL: bulkDeleteUsers
// ======================================================

const bulkDeleteUsers = async (req, res) => {
  if (!req.file)
    return res.status(400).json({ message: "Archivo CSV requerido." });

  try {
    const usersToDelete = await parseCsv(req.file.path);
    const { successRecords, errorRecords } = await processUserDeletions(usersToDelete);

    await finalizeDelete(req, successRecords, errorRecords);

    res.status(200).json({
      message: "Eliminación masiva procesada",
      success: successRecords.length,
      failed: errorRecords.length,
      successes: successRecords,
      errors: errorRecords,
    });
  } catch (err) {
    res.status(400).json({ message: "Error en eliminación masiva", error: err.message });
  } finally {
    fs.unlink(req.file.path, () => {});
  }
};

module.exports = { bulkUploadUsers, bulkDeleteUsers };
