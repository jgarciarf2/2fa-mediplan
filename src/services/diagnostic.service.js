const { PrismaClient } = require("../generated/prisma");
const fs = require("fs").promises;
const prisma = new PrismaClient();

class DiagnosticService {
  async createDiagnostic(patientId, doctorId, diagnosticData, files) {
    try {
      // Verificar que el paciente existe
      const patient = await prisma.patientDemographics.findUnique({
        where: { id: patientId },
        include: { user: true },
      });

      if (!patient) {
        throw new Error("Paciente no encontrado");
      }

      if (patient.state === "INACTIVE") {
        throw new Error("No se puede crear diagnóstico para paciente inactivo");
      }

      // Verificar que el doctor existe
      const doctor = await prisma.users.findUnique({
        where: { id: doctorId },
      });

      if (!doctor || (doctor.role !== "MEDICO" && doctor.role !== "ADMIN")) {
        throw new Error("Solo los médicos pueden crear diagnósticos");
      }

      // Crear diagnóstico con documentos
      const diagnostic = await prisma.$transaction(async (tx) => {
        // 1. Crear diagnóstico
        const newDiagnostic = await tx.medicalRecord.create({
          data: {
            patientId: patientId,
            doctorId: doctorId,
            title: diagnosticData.title,
            description: diagnosticData.description,
            symptoms: diagnosticData.symptoms,
            diagnosis: diagnosticData.diagnosis,
            treatment: diagnosticData.treatment,
            observations: diagnosticData.observations || null,
            nextAppointment: diagnosticData.nextAppointment
              ? new Date(diagnosticData.nextAppointment)
              : null,
          },
        });

        // 2. Si hay archivos, crear registros de documentos
        if (files && files.length > 0) {
          const documentRecords = files.map((file) => ({
            diagnosticId: newDiagnostic.id,
            filename: file.originalname,
            storedFilename: file.filename,
            filePath: file.path,
            fileType: file.originalname.split(".").pop().toLowerCase(),
            mimeType: file.mimetype,
            fileSize: file.size,
            description: null,
            uploadedBy: doctorId,
          }));

          await tx.diagnosticDocument.createMany({
            data: documentRecords,
          });
        }

        return newDiagnostic;
      });

      // 3. Retornar diagnóstico completo
      return await prisma.medicalRecord.findUnique({
        where: { id: diagnostic.id },
        include: {
          patient: {
            include: {
              user: {
                select: {
                  id: true,
                  fullname: true,
                  email: true,
                },
              },
            },
          },
          doctor: {
            select: {
              id: true,
              fullname: true,
              specialty: true,
            },
          },
          documents: true,
        },
      });
    } catch (error) {
      // Si hay error, eliminar archivos subidos
      if (files && files.length > 0) {
        try {
          for (const file of files) {
            await fs.unlink(file.path);
          }
        } catch (unlinkError) {
          console.error("Error eliminando archivo:", unlinkError);
        }
      }
      throw error;
    }
  }
}

module.exports = new DiagnosticService();
