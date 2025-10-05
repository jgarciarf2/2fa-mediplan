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

const bulkUploadUsers = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: "Archivo CSV requerido." });
  }

  const existingFile = await prisma.fileUploadLog.findUnique({
    where: { filename: req.file.originalname }
  });

  if (existingFile) {
    fs.unlink(req.file.path, () => {}); // borrar el archivo subido
    return res.status(400).json({ message: `El archivo ${req.file.originalname} ya fue cargado anteriormente.` });
  }

  try {
    validateFileFormat(req.file);
  } catch (err) {
    return res.status(400).json({ message: err.message });
  }

  const errorRecords = [];
  const successRecords = [];
  const results = [];
  const usersToInsert = [];

  fs.createReadStream(req.file.path, { encoding: "utf8" })
    .pipe(
      csv({
        separator: ",",
        mapHeaders: ({ header }) =>
          header.replace(/^\uFEFF/, "").trim(), // quita BOM y espacios
      })
    )
    .on("data", (row) => {
      usersToInsert.push({
        email: row.email,
        fullname: row.fullname,
        role: row.role,
        current_password: row.current_password,
        status: row.status,
        specialty: row.specialization,
        department: row.department,
        license_number: row.license_number,
        phone: row.phone,
        date_of_birth: row.date_of_birth,
      });
    })
    .on("end", async () => {
      for (let index = 0; index < usersToInsert.length; index++) {
        const user = usersToInsert[index];
        try {
          // Sanitizar inputs
          user.fullname = formatFullname(user.fullname);
          user.fullname = sanitizeInput(user.fullname)?.trim();
          user.email = sanitizeInput(user.email)?.trim().toLowerCase();
          user.license_number = sanitizeInput(user.license_number)?.trim();
          user.phone = sanitizeInput(user.phone)?.trim();

          // Campos obligatorios
          if (!user.email || !user.fullname || !user.current_password || !user.date_of_birth) {
            throw new Error("Campos obligatorios faltantes (email, nombre, contraseña, fecha de nacimiento)");
          }

          // Regex
          if (!regex.fullname.test(user.fullname)) {
            throw new Error("Nombre inválido. Debe estar en formato 'Nombre Apellido', solo letras y espacios.");
          }
          if (user.license_number && !regex.license_number.test(user.license_number)) {
            throw new Error("Identificación inválida");
          }
          if (user.phone && !regex.phone.test(user.phone)) {
            throw new Error("Teléfono inválido");
          }
          if (!regex.email.test(user.email)) {
            throw new Error("Email inválido");
          }

          // Validación edad
          if (user.date_of_birth) {
            const dob = new Date(user.date_of_birth);
            user.age = validateAge(dob);
            user.date_of_birth = dob;
          }

          // Hash password
          user.hashedPassword = await bcrypt.hash(user.current_password, 10);

          // Normalizar role
          if (!user.role) {
            user.role = Role.USER;
          } else {
            const mappedRole = roleMap[user.role.toUpperCase()];
            if (!mappedRole) {
              throw new Error(
                `Rol inválido (${user.role}). Debe ser uno de: ${Object.keys(roleMap).join(", ")}`
              );
            }
            user.role = mappedRole;
          }

          // Department
          if (user.department) {
            const dept = await prisma.department.upsert({
              where: { name: user.department.toUpperCase() },
              update: {},
              create: { name: user.department.toUpperCase() },
            });
            user.departmentId = dept.id;
          }

          // Specialty
          if (user.specialty && user.departmentId) {
            const spec = await prisma.specialty.upsert({
              where: {
                name_departmentId: {
                  name: user.specialty.toUpperCase(),
                  departmentId: user.departmentId
                }
              },
              update: {},
              create: {
                name: user.specialty.toUpperCase(),
                departmentId: user.departmentId
              }
            });
            user.specialtyId = spec.id;
          }


          // Generar código de verificación si el estado es PENDING
          if (user.status === "PENDING") {
            user.verificationCode = generateVerificationCode();
            user.verificationCodeExpires = new Date();
            user.verificationCodeExpires.setHours(user.verificationCodeExpires.getHours() + 24);
          }

          // Insert/Update usuario
          const savedUser = await prisma.users.create({
            data: {
              email: user.email,
              fullname: user.fullname,
              current_password: user.hashedPassword,
              status: user.status || "PENDING",
              date_of_birth: user.date_of_birth,
              age: user.age,
              license_number: user.license_number || null,
              phone: user.phone || null,
              role: user.role,
              departmentId: user.departmentId || null,
              specialtyId: user.specialtyId || null,
              verificationCode: user.verificationCode || null,
              verificationCodeExpires: user.verificationCodeExpires || null,
            }
          });

          // Enviar email de verificación si el estado es PENDING
          if (savedUser.status === "PENDING" && savedUser.verificationCode) {
            await sendVerificationEmail(
              savedUser.email,
              savedUser.fullname,
              savedUser.verificationCode
            );
          }

          successRecords.push(savedUser);
        } catch (err) {
          errorRecords.push({
            row: index + 1,
            email: user.email || null,
            error: err.message,
          });
        }
      }

      fs.unlink(req.file.path, () => {});

      // Registrar el archivo subido en FileUploadLog
      await prisma.fileUploadLog.create({
        data: {
          filename: req.file.originalname,
          userId: req.user?.id || null
        }
      });

      // Log de auditoría
      await logEvent({
          userId: req.user.id,
          email: req.user.email,
          role: req.user.role,
          action: "BULK_UPLOAD_USERS",
          outcome: "SUCCESS",
          reason: `Cargue masivo de ${results.length} usuarios`,
          ip: req.ip,
          userAgent: req.headers["user-agent"]
        });

      return res.status(200).json({
        message: "Carga masiva procesada",
        success: successRecords.length,
        failed: errorRecords.length,
        errors: errorRecords,
      });
    })
    .on("error", (err) => {
      return res.status(500).json({ message: "Error leyendo CSV", error: err.message });
    });
};

const bulkDeleteUsers = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: "Archivo CSV requerido." });
  }

  const usersToDelete = [];

  fs.createReadStream(req.file.path, { encoding: "utf8" })
    .pipe(
      csv({
        separator: ",",
        mapHeaders: ({ header }) =>
          header.replace(/^\uFEFF/, "").trim(),
      })
    )
    .on("data", (row) => {
      usersToDelete.push(row);
    })
    .on("end", async () => {
      const successRecords = [];
      const errorRecords = [];

      try {
        for (let i = 0; i < usersToDelete.length; i++) {
          const user = usersToDelete[i];
          try {
            if (!user.email) {
              throw new Error("El campo email es obligatorio");
            }

            // Intentar eliminar usuario
            const deleted = await prisma.users.deleteMany({
              where: { email: user.email }
            });

            if (deleted.count > 0) {
              successRecords.push({ row: i + 1, email: user.email });
            } else {
              throw new Error(`No se encontró usuario con email: ${user.email}`);
            }
          } catch (err) {
            errorRecords.push({
              row: i + 1,
              email: user.email || null,
              error: err.message
            });
          }
        }

        // Eliminar referencia al archivo de la tabla FileUploadLog
        await prisma.fileUploadLog.deleteMany({
          where: { filename: req.file.originalname }
        });

        // Log de auditoría
        await logEvent({
          userId: req.user.id,
          email: req.user.email,
          role: req.user.role,
          action: "BULK_DELETE_USERS",
          outcome: "SUCCESS",
          reason: `Eliminación masiva: ${successRecords.length} exitosos, ${errorRecords.length} fallidos`,
          ip: req.ip,
          userAgent: req.headers["user-agent"]
        });

        return res.status(200).json({
          message: "Eliminación masiva procesada",
          success: successRecords.length,
          failed: errorRecords.length,
          successes: successRecords,
          errors: errorRecords
        });
      } catch (err) {
        return res.status(400).json({ message: "Error en eliminación masiva", error: err.message });
      } finally {
        // Borrar archivo temporal subido
        fs.unlink(req.file.path, () => {});
      }
    })
    .on("error", (err) => {
      return res.status(500).json({ message: "Error leyendo CSV", error: err.message });
    });
};

module.exports = { bulkUploadUsers, bulkDeleteUsers };
