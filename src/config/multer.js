const multer = require("multer");
const path = require("path");
const fs = require("fs");

const ensureDirectoryExists = (directory) => {
  if (!fs.existsSync(directory)) {
    fs.mkdirSync(directory, { recursive: true });
  }
};

const diagnosticStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadPath = path.join("uploads", "patients/diagnostics");
    ensureDirectoryExists(uploadPath);
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    const patientId = req.params.patientId || "unknown";
    const timestamp = Date.now();
    const randomString = Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);

    const filename = `diagnostic-${patientId}-${timestamp}-${randomString}${ext}`;
    cb(null, filename);
  },
});

// Filtro de tipos de archivo permitidos
const diagnosticFileFilter = (req, file, cb) => {
  // Tipos MIME permitidos
  const allowedMimeTypes = [
    "application/pdf",
    "image/jpeg",
    "image/jpg",
    "image/png",
  ];

  // Extensiones permitidas (regex)
  const allowedExtensions = /pdf|jpeg|jpg|png/;
  const extname = allowedExtensions.test(
    path.extname(file.originalname).toLowerCase()
  );

  const mimetype = allowedMimeTypes.includes(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  }

  cb(
    new Error(
      `Tipo de archivo no permitido. Solo se permiten: PDF, JPEG, PNG. Recibido: ${file.mimetype}`
    )
  );
};

// Configuración principal de multer
const uploadDiagnostic = multer({
  storage: diagnosticStorage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB por archivo
    files: 5, // Máximo 5 archivos
  },
  fileFilter: diagnosticFileFilter,
});

// Exportación de funciones de carga
module.exports = {
  uploadSingle: uploadDiagnostic.single("document"),
  uploadMultiple: uploadDiagnostic.array("documents", 5),
};
