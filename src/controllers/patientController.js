const { PrismaClient } = require("../generated/prisma");
const prisma = new PrismaClient();
const { logEvent } = require("../services/auditService");
const client = require("../config/elasticClient");

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
      departmentId: patient.departmentId,
      specialtyId: patient.specialtyId,
      diagnosis: patient.patientHistory?.medicalRecords?.map(r => r.diagnosis).join(", ") || "",
      createdAt: patient.createdAt
    }
  });
}

// Crear paciente
const createPatient = async (req, res) => {
  try {
    const { userId, gender, phone, address, departmentId, specialtyId } = req.body;

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

    // 🔒 Transacción para crear ambos registros juntos (demografía + historia)
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
          departmentId: departmentId || null,
          specialtyId: specialtyId || null,
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

    // ⚠️ Ajuste: necesitamos asignar patientId al crear la historia
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

// Obtener todos los pacientes
const getAllPatients = async (req, res) => {
  try {
    const patients = await prisma.patientDemographics.findMany({
      include: { user: true, department: true, specialty: true, patientHistory: true}
    });

    await logEvent({
      userId: req.user.id,
      email: req.user.email,
      role: req.user.role,
      action: "GET_ALL_DEMOGRAPHICS_PATIENTS",
      outcome: "SUCCESS",
      reason: `Se obtuvieron ${patients.length} demografias de los pacientes correctamente`,
      ip: req.ip,
      userAgent: req.headers["user-agent"],
    });

    return res.status(200).json(patients);
  } catch (err) {
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

    return res.status(500).json({ msg: "Error obteniendo la demografia de los pacientes", error: err.message });
  }
};

// Obtener paciente por ID
const getPatientById = async (req, res) => {
  const { id } = req.params;
  try {
    const patient = await prisma.patientDemographics.findUnique({
      where: { id },
      include: { user: true, department: true, specialty: true, patientHistory: true }
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
  deletePatient
};
