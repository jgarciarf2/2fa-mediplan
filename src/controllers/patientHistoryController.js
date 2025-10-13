const { PrismaClient } = require("../generated/prisma");
const prisma = new PrismaClient();
const { logEvent } = require("../services/auditService");

// Obtener historia clínica de un paciente
const getPatientHistory = async (req, res) => {
  const { patientId } = req.params;

  try {
    const history = await prisma.patientHistory.findUnique({
      where: { patientId },
      include: { 
        patient: true,
        medicalRecords: {
          include: { doctor: true },
          orderBy: { date: "desc" } // últimos primero
        }
      }  
    });

    if (!history) return res.status(404).json({ msg: "Historia clínica no encontrada" });

    await logEvent({
      userId: req.user.id,
      email: req.user.email,
      role: req.user.role,
      action: "GET_PATIENT_HISTORY",
      outcome: "SUCCESS",
      reason: `Historia clínica del paciente ${patientId} consultada correctamente`,
      ip: req.ip,
      userAgent: req.headers["user-agent"],
    });

    res.status(200).json(history);
  } catch (err) {
    await logEvent({
      userId: req.user?.id,
      email: req.user?.email,
      role: req.user?.role,
      action: "GET_PATIENT_HISTORY",
      outcome: "FAILURE",
      reason: err.message,
      ip: req.ip,
      userAgent: req.headers["user-agent"],
    });

    res.status(500).json({ msg: "Error obteniendo historia clínica", error: err.message });
  }
};

// Actualizar historia clínica
const updatePatientHistory = async (req, res) => {
  const { patientId } = req.params;
  const { allergies, chronicDiseases, bloodType } = req.body;

  try {
    const existing = await prisma.patientHistory.findUnique({ where: { patientId } });
    if (!existing) {
      return res.status(404).json({ msg: "Historia clínica no encontrada" });
    }

    const updated = await prisma.patientHistory.update({
      where: { patientId },
      data: {
        allergies: allergies ?? existing.allergies,
        chronicDiseases: chronicDiseases ?? existing.chronicDiseases,
        bloodType: bloodType ?? existing.bloodType,
      },
    });

    await logEvent({
      userId: req.user.id,
      email: req.user.email,
      role: req.user.role,
      action: "UPDATE_PATIENT_HISTORY",
      outcome: "SUCCESS",
      reason: `Historia clínica del paciente ${id} actualizada correctamente`,
      ip: req.ip,
      userAgent: req.headers["user-agent"],
    });

    res.status(200).json(updated);
  } catch (err) {
    await logEvent({
      userId: req.user?.id,
      email: req.user?.email,
      role: req.user?.role,
      action: "UPDATE_PATIENT_HISTORY",
      outcome: "FAILURE",
      reason: err.message,
      ip: req.ip,
      userAgent: req.headers["user-agent"],
    });

    res.status(500).json({ msg: "Error actualizando historia clínica", error: err.message });
  }
};

const getPatientTimeline = async (req, res) => {
  const { patientId } = req.params;

  try {
    // Buscamos la historia clínica
    const history = await prisma.patientHistory.findUnique({
      where: { patientId },
      select: {
        id: true,
        medicalRecords: {
          include: { doctor: true },
          orderBy: { date: "desc" } // últimos primero
        }
      }
    });

    if (!history) return res.status(404).json({ msg: "Historia clínica no encontrada" });

    // Mapear los registros para la timeline
    const timeline = history.medicalRecords.map(record => ({
      id: record.id,
      date: record.date,
      diagnosis: record.diagnosis,
      treatment: record.treatment,
      doctor: record.doctor ? record.doctor.fullname : null,
      notes: record.notes
    }));

    await logEvent({
      userId: req.user.id,
      email: req.user.email,
      role: req.user.role,
      action: "GET_PATIENT_TIMELINE",
      outcome: "SUCCESS",
      reason: `Timeline del paciente ${patientId} consultada correctamente`,
      ip: req.ip,
      userAgent: req.headers["user-agent"],
    });

    res.status(200).json(timeline);
  } catch (err) {
    await logEvent({
      userId: req.user?.id,
      email: req.user?.email,
      role: req.user?.role,
      action: "GET_PATIENT_TIMELINE",
      outcome: "FAILURE",
      reason: err.message,
      ip: req.ip,
      userAgent: req.headers["user-agent"],
    });

    res.status(500).json({ msg: "Error obteniendo timeline", error: err.message });
  }
};

module.exports = {
  getPatientHistory,
  updatePatientHistory,
  getPatientTimeline,
};
