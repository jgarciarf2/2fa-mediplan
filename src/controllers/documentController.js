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

module.exports = {
    downloadDocument,
    deleteDocument
}