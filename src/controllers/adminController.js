const fs = require("fs");
const csv = require("csv-parser");
const bcrypt = require("bcrypt");
const { PrismaClient } = require("../generated/prisma");
const prisma = new PrismaClient();

const bulkUploadUsers = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: "Archivo CSV requerido." });
  }

  const users = [];

  // Leer CSV
  fs.createReadStream(req.file.path)
    .pipe(csv())
    .on("data", (row) => {
      users.push(row);
    })
    .on("end", async () => {
      try {
        // Validación previa
        for (const user of users) {
          if (!user.email || !user.fullname || !user.current_password) {
            throw new Error(`Usuario inválido detectado: ${JSON.stringify(user)}`);
          }
        }

        // Ejecutar transacción para upsert masivo
        const results = await prisma.$transaction(
          users.map((user) =>
            prisma.users.upsert({
              where: { email: user.email },
              update: {
                fullname: user.fullname,
                current_password: user.current_password,
                status: user.status || "PENDING",
                date_of_birth: user.date_of_birth ? new Date(user.date_of_birth) : null,
                license_number: user.license_number || null,
                phone: user.phone || null,
                role: user.role || "USER",
                departmentId: user.departmentId || null,
              },
              create: {
                email: user.email,
                fullname: user.fullname,
                current_password: user.current_password,
                status: user.status || "PENDING",
                date_of_birth: user.date_of_birth ? new Date(user.date_of_birth) : null,
                license_number: user.license_number || null,
                phone: user.phone || null,
                role: user.role || "USER",
                departmentId: user.departmentId || null,
              },
            })
          )
        );

        return res.status(200).json({
          message: "Usuarios procesados correctamente",
          count: results.length,
        });
      } catch (err) {
        return res.status(400).json({ message: "Error en carga masiva", error: err.message });
      } finally {
        // Opcional: borrar archivo temporal después de procesarlo
        fs.unlink(req.file.path, () => {});
      }
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

  fs.createReadStream(req.file.path)
    .pipe(csv())
    .on("data", (row) => {
      usersToDelete.push(row);
    })
    .on("end", async () => {
      try {
        // Validación previa
        for (const user of usersToDelete) {
          if (!user.email) {
            throw new Error(`Usuario inválido detectado: ${JSON.stringify(user)}`);
          }
        }

        // Transacción de eliminación masiva
        await prisma.$transaction(
          usersToDelete.map((user) =>
            prisma.users.deleteMany({
              where: { email: user.email }
            })
          )
        );

        return res.status(200).json({
          message: "Usuarios eliminados correctamente",
          count: usersToDelete.length,
        });
      } catch (err) {
        return res.status(400).json({ message: "Error en eliminación masiva", error: err.message });
      } finally {
        // Borrar archivo temporal
        fs.unlink(req.file.path, () => {});
      }
    })
    .on("error", (err) => {
      return res.status(500).json({ message: "Error leyendo CSV", error: err.message });
    });
};

module.exports = { bulkUploadUsers, bulkDeleteUsers };
