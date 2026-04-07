const pool = require("../config/db");
const { notificarInscripcion } = require("../services/notificationService");
const { enviarCorreo } = require("../services/emailService");

// POST /api/inscripciones/:eventoId  (CLIENTE)
async function inscribir(req, res) {
  const eventoId = Number(req.params.eventoId);
  const userId = req.user.id;

  try {
    // 1) Verificar evento y cupo
    const [evRows] = await pool.query(
      `SELECT id, titulo, fecha_inicio, cupo, estado
       FROM eventos
       WHERE id=?`,
      [eventoId]
    );

    if (evRows.length === 0) {
      return res.status(404).json({ ok: false, msg: "Evento no existe" });
    }

    const evento = evRows[0];
    if (evento.estado !== "ACTIVO") {
      return res.status(400).json({ ok: false, msg: "Evento no está activo" });
    }

    // 2) Verificar si ya existe inscripción
    const [insRows] = await pool.query(
      `SELECT id, estado FROM inscripciones
       WHERE user_id=? AND evento_id=?`,
      [userId, eventoId]
    );

    if (insRows.length > 0) {
      const inscripcion = insRows[0];

      // Si estaba cancelada, reactivar
      if (inscripcion.estado === "CANCELADA") {
        const [[{ usados }]] = await pool.query(
          `SELECT COUNT(*) AS usados FROM inscripciones
           WHERE evento_id=? AND estado='ACTIVA'`,
          [eventoId]
        );

        if (usados >= evento.cupo) {
          return res.status(400).json({ ok: false, msg: "Cupo lleno" });
        }

        // 1️⃣ Actualizar inscripción
        await pool.query(`UPDATE inscripciones SET estado='ACTIVA' WHERE id=?`, [inscripcion.id]);

        // 2️⃣ Enviar correo
        try {
          const usuario = await obtenerEmailUsuario(userId);
          await enviarCorreo(
            usuario.email,
            "Inscripción reactivada",
            `
            <h2>Inscripción reactivada</h2>
            <p>Hola ${usuario.nombre},</p>
            <p>Has reactivado tu inscripción al evento: <b>${evento.titulo}</b></p>
            <p>Fecha: ${new Date(evento.fecha_inicio).toLocaleString()}</p>
            <p>Te esperamos.</p>
            `
          );
        } catch (correoError) {
          console.error("Error enviando correo de reactivación:", correoError);
        }

        // 3️⃣ Notificación interna (si la tienes)
        await notificarInscripcion(userId, evento);

        return res.status(200).json({ ok: true, msg: "Inscripción reactivada" });
      }

      // Si ya estaba activa
      return res.status(409).json({ ok: false, msg: "Ya estás inscrito en este evento" });
    }

    // 3) Contar inscritos activos
    const [[{ usados }]] = await pool.query(
      `SELECT COUNT(*) AS usados FROM inscripciones
       WHERE evento_id=? AND estado='ACTIVA'`,
      [eventoId]
    );

    if (evento.cupo > 0 && usados >= evento.cupo) {
      return res.status(400).json({ ok: false, msg: "Cupo lleno" });
    }

    // 4) Insertar inscripción nueva
    await pool.query(
      `INSERT INTO inscripciones (user_id, evento_id, estado)
       VALUES (?,?, 'ACTIVA')`,
      [userId, eventoId]
    );

    // 5️⃣ Enviar correo de inscripción
    try {
      const usuario = await obtenerEmailUsuario(userId);
      await enviarCorreo(
        usuario.email,
        "Inscripción confirmada",
        `
        <h2>Inscripción exitosa</h2>
        <p>Hola ${usuario.nombre},</p>
        <p>Te has inscrito correctamente al evento: <b>${evento.titulo}</b></p>
        <p>Fecha: ${new Date(evento.fecha_inicio).toLocaleString()}</p>
        <p>Te esperamos.</p>
        `
      );
    } catch (correoError) {
      console.error("Error enviando correo de inscripción:", correoError);
    }

    // 6️⃣ Notificación interna
    await notificarInscripcion(userId, evento);

    return res.status(201).json({ ok: true, msg: "Inscrito correctamente" });

  } catch (err) {
    console.error("Error inscribiendo usuario:", err);
    return res.status(500).json({ ok: false, msg: "Error al inscribir", error: err.message });
  }
}

// DELETE /api/inscripciones/:eventoId  (CLIENTE) -> cancela
async function cancelar(req, res) {
  const eventoId = Number(req.params.eventoId);
  const userId = req.user.id;

  try {
    // 1) Verificar que exista la inscripción
    const [rows] = await pool.query(
      `SELECT i.id, i.estado, e.titulo, e.fecha_inicio, u.nombre, u.email
       FROM inscripciones i
       JOIN eventos e ON i.evento_id = e.id
       JOIN users u ON i.user_id = u.id
       WHERE i.user_id=? AND i.evento_id=?`,
      [userId, eventoId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ ok: false, msg: "No estás inscrito en este evento" });
    }

    const inscripcion = rows[0];

    // 2) Actualizar estado a CANCELADA
    await pool.query(
      `UPDATE inscripciones SET estado='CANCELADA' WHERE user_id=? AND evento_id=?`,
      [userId, eventoId]
    );

    // 3) Enviar correo de cancelación
    try {
      await enviarCorreo(
        inscripcion.email,
        "Inscripción cancelada",
        `
        <h2>Inscripción cancelada</h2>
        <p>Hola ${inscripcion.nombre},</p>
        <p>Tu inscripción al evento <b>${inscripcion.titulo}</b> ha sido cancelada correctamente.</p>
        <p>Fecha del evento: ${new Date(inscripcion.fecha_inicio).toLocaleString()}</p>
        <p>Esperamos verte en otro evento pronto.</p>
        `
      );
    } catch (correoError) {
      console.error("Error enviando correo de cancelación:", correoError);
    }

    return res.json({ ok: true, msg: "Inscripción cancelada" });

  } catch (err) {
    console.error("Error cancelando inscripción:", err);
    return res.status(500).json({ ok: false, msg: "Error al cancelar", error: err.message });
  }
}

// GET /api/inscripciones/mis-inscripciones (CLIENTE)
async function misInscripciones(req, res) {
  const userId = req.user.id;

  try {
    const [rows] = await pool.query(
      `SELECT i.id, i.estado, i.created_at,
              e.id AS evento_id, e.titulo, e.ubicacion, e.fecha_inicio, e.fecha_fin
       FROM inscripciones i
       INNER JOIN eventos e ON e.id = i.evento_id
       WHERE i.user_id=?
       ORDER BY i.created_at DESC`,
      [userId]
    );

    return res.json({ ok: true, data: rows });
  } catch (err) {
    return res.status(500).json({ ok: false, msg: "Error listando inscripciones", error: err.message });
  }
}

// GET /api/inscripciones/evento/:eventoId (ADMIN) -> ver inscritos
async function inscritosPorEvento(req, res) {
  const eventoId = Number(req.params.eventoId);

  try {
    const [rows] = await pool.query(
      `SELECT i.id, i.estado, i.created_at,
              u.id AS user_id, u.nombre, u.email
       FROM inscripciones i
       INNER JOIN users u ON u.id = i.user_id
       WHERE i.evento_id=?
       ORDER BY i.created_at ASC`,
      [eventoId]
    );

    return res.json({ ok: true, data: rows });
  } catch (err) {
    return res.status(500).json({ ok: false, msg: "Error listando inscritos", error: err.message });
  }
}

module.exports = { inscribir, cancelar, misInscripciones, inscritosPorEvento };