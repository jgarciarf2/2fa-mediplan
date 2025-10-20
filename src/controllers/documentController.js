const { PrismaClient } = require("../generated/prisma");
const prisma = new PrismaClient();
const diagnosticService = require("../services/diagnostic.service");
const path = require("path");
const fs = require("fs");

// Descargar documento por ID
const downloadDocument = async (req, res) => {
  try {
    const { id } = req.params;

    // Buscar el documento por ID en la base de datos
    const document = await diagnosticService.findDocumentById(id);

    if (!document) {
      return res.status(404).json({ message: "Documento no encontrado" });
    }

    const filePath = path.resolve(document.filePath);

    // Verificar que el archivo exista físicamente
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: "El archivo no existe en el servidor" });
    }

    // Descargar archivo
    res.download(filePath, document.filename, (err) => {
      if (err) {
        console.error("Error descargando el archivo:", err);
        res.status(500).json({ message: "Error al descargar el archivo" });
      }
    });
  } catch (error) {
    console.error("Error en downloadDocument:", error);
    res.status(500).json({ message: "Error al procesar la descarga" });
  }
};

// Eliminar documento por ID
const deleteDocument = async (req, res) => {
  try {
    const { id } = req.params;

    // Buscar el documento
    const document = await diagnosticService.findDocumentById(id);

    if (!document) {
      return res.status(404).json({ message: "Documento no encontrado" });
    }

    const filePath = path.resolve(document.filePath);

    // Eliminar archivo del sistema
    try {
      await fsPromises.unlink(filePath);
    } catch (error) {
      console.warn("Advertencia: el archivo no existía físicamente:", filePath);
    }

    // Eliminar referencia del documento en la base de datos
    await diagnosticService.deleteDocumentReference(id);

    res.status(200).json({ message: "Documento eliminado correctamente" });
  } catch (error) {
    console.error("Error en deleteDocument:", error);
    res.status(500).json({ message: "Error al eliminar el documento" });
  }
};

const uploadDocument = async (req, res) => {
  try {
    const { patientId, diagnosticId } = req.body;
    const uploadedBy = req.user.userId; // del token JWT

    // Validar campos
    if (!patientId || !diagnosticId) {
      return res.status(400).json({
        message: "Faltan los campos obligatorios patientId o diagnosticId.",
      });
    }

    // Verificar que el diagnóstico exista y pertenezca al paciente
    const diagnostic = await prisma.medicalRecord.findUnique({
      where: { id: diagnosticId },
    });

    if (!diagnostic) {
      return res.status(404).json({
        message: "No se encontró el diagnóstico especificado.",
      });
    }

    if (diagnostic.patientId !== patientId) {
      return res.status(400).json({
        message:
          "El diagnóstico no pertenece al paciente indicado. Verifica los datos.",
      });
    }

    // Subir documentos
    const documents = await Promise.all(
      req.files.map(async (file) => {
        return prisma.diagnosticDocument.create({
          data: {
            diagnosticId,
            filename: file.originalname,
            storedFilename: file.filename,
            filePath: file.path,
            fileType: path.extname(file.originalname).replace(".", ""),
            mimeType: file.mimetype,
            fileSize: file.size,
            uploadedBy,
          },
        });
      })
    );

    res.status(201).json({
      message: "Documentos subidos correctamente.",
      patientId,
      diagnosticId,
      documents,
    });
  } catch (error) {
    console.error("Error en uploadDocument:", error);
    res.status(500).json({ message: "Error al subir los documentos." });
  }
};

// GET /api/documents/patient/:patientId
const getDocumentsByPatient = async (req, res) => {
  try {
    const { patientId } = req.params;
    const documents = await prisma.diagnosticDocument.findMany({
      where: { diagnostic: { patientId } },
      include: { diagnostic: true },
      orderBy: { createdAt: "desc" },
    });

    if (!documents.length) {
      return res.status(404).json({ message: "No se encontraron documentos para este paciente" });
    }

    res.status(200).json(documents);
  } catch (error) {
    console.error("Error en getDocumentsByPatient:", error);
    res.status(500).json({ message: "Error al obtener documentos" });
  }
};

module.exports = {
    downloadDocument,
    deleteDocument,
    uploadDocument,
    getDocumentsByPatient
}