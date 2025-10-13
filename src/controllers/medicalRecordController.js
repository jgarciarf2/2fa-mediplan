const { PrismaClient } = require("../generated/prisma");
const prisma = new PrismaClient();
const { logEvent } = require("../services/auditService");

// Crear un nuevo registro médico
const createMedicalRecord = async (req, res) => {
  try {
    const { patientHistoryId, doctorId, diagnosis, treatment, notes, date } = req.body;

    const history = await prisma.patientHistory.findUnique({ where: { id: patientHistoryId } });
    if (!history) return res.status(404).json({ msg: "Historia clínica no encontrada" });

    const record = await prisma.medicalRecord.create({
      data: {
        patientHistoryId,
        doctorId: doctorId || null,
        diagnosis,
        treatment,
        notes,
        date: date ? new Date(date) : new Date(),
      },
      include: { doctor: true },
    });

    await logEvent({
      userId: req.user.id,
      email: req.user.email,
      role: req.user.role,
      action: "CREATE_MEDICAL_RECORD",
      outcome: "SUCCESS",
      reason: `Registro médico creado para paciente ${patientHistoryId}`,
      ip: req.ip,
      userAgent: req.headers["user-agent"],
    });

    res.status(201).json(record);
  } catch (err) {
    await logEvent({
      userId: req.user?.id,
      email: req.user?.email,
      role: req.user?.role,
      action: "CREATE_MEDICAL_RECORD",
      outcome: "FAILURE",
      reason: err.message,
      ip: req.ip,
      userAgent: req.headers["user-agent"],
    });

    res.status(500).json({ msg: "Error creando registro médico", error: err.message });
  }
};

// Obtener todos los registros de una historia
const getMedicalRecordsByHistory = async (req, res) => {
  const { patientHistoryId } = req.params;
  try {
    const records = await prisma.medicalRecord.findMany({
      where: { patientHistoryId },
      include: { doctor: true },
      orderBy: { date: "desc" },
    });

    if (!records.length) {
      return res.status(404).json({ msg: "No hay registros médicos para este paciente" });
    }

    await logEvent({
      userId: req.user.id,
      email: req.user.email,
      role: req.user.role,
      action: "GET_MEDICAL_RECORDS",
      outcome: "SUCCESS",
      reason: `Registros médicos obtenidos para historia ${patientHistoryId}`,
      ip: req.ip,
      userAgent: req.headers["user-agent"],
    });

    res.status(200).json(records);
  } catch (err) {
    await logEvent({
      userId: req.user?.id,
      email: req.user?.email,
      role: req.user?.role,
      action: "GET_MEDICAL_RECORDS",
      outcome: "FAILURE",
      reason: err.message,
      ip: req.ip,
      userAgent: req.headers["user-agent"],
    });

    res.status(500).json({ msg: "Error obteniendo registros médicos", error: err.message });
  }
};

// Actualizar un registro médico
const updateMedicalRecord = async (req, res) => {
  const { id } = req.params;
  const { diagnosis, treatment, notes } = req.body;

  try {
    const updated = await prisma.medicalRecord.update({
      where: { id },
      data: { diagnosis, treatment, notes },
    });

    await logEvent({
      userId: req.user.id,
      email: req.user.email,
      role: req.user.role,
      action: "UPDATE_MEDICAL_RECORD",
      outcome: "SUCCESS",
      reason: `Registro médico ${id} actualizado correctamente`,
      ip: req.ip,
      userAgent: req.headers["user-agent"],
    });

    res.status(200).json(updated);
  } catch (err) {
    await logEvent({
      userId: req.user?.id,
      email: req.user?.email,
      role: req.user?.role,
      action: "UPDATE_MEDICAL_RECORD",
      outcome: "FAILURE",
      reason: err.message,
      ip: req.ip,
      userAgent: req.headers["user-agent"],
    });

    res.status(500).json({ msg: "Error actualizando registro médico", error: err.message });
  }
};

module.exports = {
  createMedicalRecord,
  getMedicalRecordsByHistory,
  updateMedicalRecord,
};