const { PrismaClient } = require("../generated/prisma");
const prisma = new PrismaClient();
const { logEvent } = require("../services/auditService");
const client = require("../config/elasticClient");
const diagnosticService = require("../services/diagnostic.service");

// Crear diagnóstico para un paciente (con posibilidad de subir documentos)
const createDiagnostic = async (req, res) => {
  console.log("Payload del token:", req.user);
  try {
    const { patientId } = req.params;
    const doctorId = req.user.userId;
    const files = req.files; // Array de archivos de multer

    // Validar campos requeridos
    const { title, description, symptoms, diagnosis, treatment } = req.body;

    if (!title || !description || !symptoms || !diagnosis || !treatment) {
      // Si hay error, eliminar archivos subidos
      if (files && files.length > 0) {
        const fs = require("fs").promises;
        for (const file of files) {
          try {
            await fs.unlink(file.path);
        } catch (error) {
          console.error("Error eliminando archivo:", error);
        }
      }
    }

      return res.status(400).json({
        message: "Faltan campos obligatorios",
        required: [
          "title",
          "description",
          "symptoms",
          "diagnosis",
          "treatment",
        ],
      });
    }

    const diagnostic = await diagnosticService.createDiagnostic(
      patientId,
      doctorId,
      req.body,
      files
    );

    return res.status(201).json({
      message: "Diagnóstico creado exitosamente",
      data: diagnostic,
    });
  } catch (error) {
    console.error("Error creando diagnóstico:", error);
    return res.status(400).json({
      message: error.message || "Error al crear diagnóstico",
    });
  }
};

// Indexación de paciente para búsquedas avanzadas
async function indexPatient(patient) {
  await client.index({
    index: "patients",
    id: patient.id, // ID de MongoDB
    body: {
      fullName: patient.fullName,
      phone: patient.phone,
      email: patient.user?.email,
      age: patient.age,
      gender: patient.gender,
      address: patient.address,
      diagnosis: patient.patientHistory?.medicalRecords?.map(r => r.diagnosis).join(", ") || "",
      createdAt: patient.createdAt
    }
  });
}

// Obtener diagnósticos de un paciente con paginación
const getDiagnosticsByPatientId = async (req, res) => {
  const { patientId } = req.params;
  const { page, limit } = req.query;

  try {
    // Validar que se haya enviado el ID del paciente
    if (!patientId) {
      return res.status(400).json({ msg: "Se requiere el ID del paciente." });
    }

    let diagnostics;

    // Si hay paginación (page y limit)
    if (page && limit) {
      const pageNumber = parseInt(page);
      const pageSize = parseInt(limit);

      const [data, total] = await Promise.all([
        prisma.medicalRecord.findMany({
          where: { patientId },
          include: {
            doctor: { select: { fullname: true, email: true } },
            documents: true,
          },
          skip: (pageNumber - 1) * pageSize,
          take: pageSize,
          orderBy: { createdAt: 'desc' },
        }),
        prisma.medicalRecord.count({ where: { patientId } }),
      ]);

      diagnostics = data;

      if (diagnostics.length === 0) {
        return res.status(404).json({ msg: "No se encontraron diagnósticos para este paciente." });
      }

      return res
        .set('X-Total-Count', total)
        .set('X-Total-Pages', Math.ceil(total / pageSize))
        .status(200)
        .json(diagnostics);
    }

    // Si no hay paginación, listar todo
    diagnostics = await prisma.medicalRecord.findMany({
      where: { patientId },
      include: {
        doctor: { select: { fullname: true, email: true } },
        documents: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (diagnostics.length === 0) {
      return res.status(404).json({ msg: "No se encontraron diagnósticos para este paciente." });
    }

    return res.status(200).json(diagnostics);
  } catch (error) {
    console.error("Error obteniendo diagnósticos:", error);
    return res.status(500).json({
      msg: "Error al obtener los diagnósticos del paciente",
      error: error.message,
    });
  }
};

// Crear demografía e historia clínica del paciente
const createPatient = async (req, res) => {
  try {
    const { userId, gender, phone, address } = req.body;

    const user = await prisma.users.findUnique({ where: { id: userId } });
    if (!user) return res.status(404).json({ msg: "Usuario no encontrado" });

    if (user.role !== "PACIENTE") {
      return res.status(400).json({ msg: "El usuario no tiene rol de paciente." });
    }

    const existing = await prisma.patientDemographics.findUnique({ where: { userId } });
    if (existing) {
      return res.status(400).json({ msg: "Este paciente ya tiene un registro demográfico." });
    }

    const dob = new Date(user.date_of_birth);
    const age = new Date().getFullYear() - dob.getFullYear();

    // Transacción para crear ambos registros juntos (demografía + historia)
    const [patient, history] = await prisma.$transaction([
      prisma.patientDemographics.create({
        data: {
          userId: user.id,
          fullName: user.fullname,
          date_of_birth: user.date_of_birth,
          age,
          gender: gender || null,
          phone: phone || null,
          address: address || null,
        },
      }),
      prisma.patientHistory.create({
        data: {
          patientId: undefined, // se asigna luego dentro de la transacción
          allergies: null,
          chronicDiseases: null,
          bloodType: null,
        },
      }),
    ]);

    // Ajuste: necesitamos asignar patientId al crear la historia
    await prisma.patientHistory.update({
      where: { id: history.id },
      data: { patientId: patient.id },
    });

    await indexPatient(patient);

    await logEvent({
      userId: req.user.id,
      email: req.user.email,
      role: req.user.role,
      action: "CREATE_DEMOGRAPHIC_PATIENT",
      outcome: "SUCCESS",
      reason: `Demografía e historia clínica creadas para el paciente ${user.fullname}.`,
      ip: req.ip,
      userAgent: req.headers["user-agent"],
    });

    return res.status(201).json({
      msg: "Paciente y su historia clínica creados correctamente.",
      patient,
    });
  } catch (err) {
    await logEvent({
      userId: req.user?.id,
      email: req.user?.email,
      role: req.user?.role,
      action: "CREATE_DEMOGRAPHIC_PATIENT",
      outcome: "FAILURE",
      reason: err.message,
      ip: req.ip,
      userAgent: req.headers["user-agent"],
    });

    return res.status(500).json({
      msg: "Error creando la demografía o historia clínica del paciente",
      error: err.message,
    });
  }
};

// Obtener todos los pacientes con paginación
const getAllPatients = async (req, res) => {
  try {
    const { page, limit } = req.query;
    let patients;

    // Si hay paginación
    if (page && limit) {
      const pageNumber = parseInt(page);
      const pageSize = parseInt(limit);

      const [data, total] = await Promise.all([
        prisma.patientDemographics.findMany({
          skip: (pageNumber - 1) * pageSize,
          take: pageSize,
          include: { user: true, patientHistory: true },
          orderBy: { id: 'asc' },
        }),
        prisma.patientDemographics.count(),
      ]);

      patients = data;

      if (patients.length === 0) {
        return res.status(404).json({ msg: "No se encontraron pacientes." });
      }

      await logEvent({
        userId: req.user.id,
        email: req.user.email,
        role: req.user.role,
        action: "GET_ALL_DEMOGRAPHICS_PATIENTS",
        outcome: "SUCCESS",
        reason: `Se obtuvieron ${patients.length} pacientes (página ${pageNumber}) correctamente`,
        ip: req.ip,
        userAgent: req.headers["user-agent"],
      });

      return res
        .set('X-Total-Count', total)
        .set('X-Total-Pages', Math.ceil(total / pageSize))
        .status(200)
        .json(patients);
    }

    // Si no hay paginación, listar todo
    patients = await prisma.patientDemographics.findMany({
      include: { user: true, patientHistory: true },
      orderBy: { id: 'asc' },
    });

    await logEvent({
      userId: req.user.id,
      email: req.user.email,
      role: req.user.role,
      action: "GET_ALL_DEMOGRAPHICS_PATIENTS",
      outcome: "SUCCESS",
      reason: `Se obtuvieron ${patients.length} demografías de pacientes correctamente (sin paginación)`,
      ip: req.ip,
      userAgent: req.headers["user-agent"],
    });

    return res.status(200).json(patients);
  } catch (err) {
    console.error("Error obteniendo pacientes:", err);

    await logEvent({
      userId: req.user?.id,
      email: req.user?.email,
      role: req.user?.role,
      action: "GET_ALL_DEMOGRAPHICS_PATIENTS",
      outcome: "FAILURE",
      reason: err.message,
      ip: req.ip,
      userAgent: req.headers["user-agent"],
    });

    return res.status(500).json({
      msg: "Error obteniendo la demografía de los pacientes",
      error: err.message,
    });
  }
};

// Obtener paciente por ID
const getPatientById = async (req, res) => {
  const { id } = req.params;
  try {
    const patient = await prisma.patientDemographics.findUnique({
      where: { id },
      include: { user: true, patientHistory: true }
    });

    if (!patient) {
      return res.status(404).json({ msg: "demografia no encontrado" });
    }

    await logEvent({
      userId: req.user.id,
      email: req.user.email,
      role: req.user.role,
      action: "GET_DEMOGRAPHIC_PATIENT_BY_ID",
      outcome: "SUCCESS",
      reason: `Se obtuvo demografia del paciente con ID ${id}`,
      ip: req.ip,
      userAgent: req.headers["user-agent"],
    });

    return res.status(200).json(patient);
  } catch (err) {
    await logEvent({
      userId: req.user?.id,
      email: req.user?.email,
      role: req.user?.role,
      action: "GET_DEMOGRAPHIC_PATIENT_BY_ID",
      outcome: "FAILURE",
      reason: err.message,
      ip: req.ip,
      userAgent: req.headers["user-agent"],
    });

    return res.status(500).json({ msg: "Error obteniendo demografia del paciente", error: err.message });
  }
};

// Obtener demografía del paciente por ID de usuario
const getPatientByUserId = async (req, res) => {
  const { userId } = req.params;

  try {
    const patient = await prisma.patientDemographics.findUnique({
      where: { userId },
      include: {
        user: true,
        patientHistory: true
      }
    });

    if (!patient) {
      return res.status(404).json({ msg: "No se encontró una demografía asociada a este usuario." });
    }

    await logEvent({
      userId: req.user.id,
      email: req.user.email,
      role: req.user.role,
      action: "GET_DEMOGRAPHIC_PATIENT_BY_USER_ID",
      outcome: "SUCCESS",
      reason: `Se obtuvo demografía del paciente con userId ${userId}`,
      ip: req.ip,
      userAgent: req.headers["user-agent"],
    });

    return res.status(200).json(patient);
  } catch (err) {
    await logEvent({
      userId: req.user?.id,
      email: req.user?.email,
      role: req.user?.role,
      action: "GET_DEMOGRAPHIC_PATIENT_BY_USER_ID",
      outcome: "FAILURE",
      reason: err.message,
      ip: req.ip,
      userAgent: req.headers["user-agent"],
    });

    return res.status(500).json({
      msg: "Error obteniendo demografía del paciente por ID de usuario",
      error: err.message
    });
  }
};

// Actualizar paciente
const updatePatient = async (req, res) => {
  const { id } = req.params;
  const { userId, ...data } = req.body;

  try {
    const updated = await prisma.patientDemographics.update({
      where: { id },
      data
    });

    await indexPatient(updated);

    await logEvent({
      userId: req.user.id,
      email: req.user.email,
      role: req.user.role,
      action: "UPDATE_DEMOGRAPHIC_PATIENT",
      outcome: "SUCCESS",
      reason: `Demografia del aciente ${id} actualizado correctamente`,
      ip: req.ip,
      userAgent: req.headers["user-agent"],
    });

    return res.status(200).json(updated);
  } catch (err) {
    await logEvent({
      userId: req.user?.id,
      email: req.user?.email,
      role: req.user?.role,
      action: "UPDATE_DEMOGRAPHIC_PATIENT",
      outcome: "FAILURE",
      reason: err.message,
      ip: req.ip,
      userAgent: req.headers["user-agent"],
    });

    return res.status(500).json({ msg: "Error actualizando demografia del paciente", error: err.message });
  }
};

//borrar paciente del índice
async function removePatientFromIndex(patientId) {
  await client.delete({
    index: "patients",
    id: patientId
  });
}

// Eliminar paciente
const deletePatient = async (req, res) => {
  const { id } = req.params;
  try {
    await prisma.patientDemographics.delete({ where: { id } });
    await removePatientFromIndex(id);

    await logEvent({
      userId: req.user.id,
      email: req.user.email,
      role: req.user.role,
      action: "DELETE_DEMOGRAPHIC_PATIENT",
      outcome: "SUCCESS",
      reason: `Demografia del paciente ${id} eliminado correctamente`,
      ip: req.ip,
      userAgent: req.headers["user-agent"],
    });

    return res.status(200).json({ msg: "Registro demográfico eliminado" });
  } catch (err) {
    await logEvent({
      userId: req.user?.id,
      email: req.user?.email,
      role: req.user?.role,
      action: "DELETE_DEMOGRAPHIC_PATIENT",
      outcome: "FAILURE",
      reason: err.message,
      ip: req.ip,
      userAgent: req.headers["user-agent"],
    });

    return res.status(500).json({ msg: "Error eliminando demografia del paciente", error: err.message });
  }
};

module.exports = {
  createPatient,
  getAllPatients,
  getPatientById,
  updatePatient,
  deletePatient,
  getPatientByUserId,
  createDiagnostic,
  getDiagnosticsByPatientId,
};
