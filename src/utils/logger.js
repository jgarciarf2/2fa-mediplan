import winston from "winston";
import path from "path";
import fs from "fs";

// Ruta absoluta al archivo de logs
const logDir = path.resolve("logs");

// Si la carpeta no existe, la crea automáticamente
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir);
}

const logger = winston.createLogger({
  level: "info", // puedes usar: error, warn, info, http, verbose, debug, silly
  format: winston.format.combine(
    winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
    winston.format.printf(({ timestamp, level, message }) => {
      return `[${timestamp}] ${level.toUpperCase()}: ${message}`;
    })
  ),
  transports: [
    // Guarda logs en archivo
    new winston.transports.File({ filename: path.join(logDir, "app.log") }),

    // También muestra en consola si estás en modo desarrollo
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      ),
    }),
  ],
});

export default logger;
