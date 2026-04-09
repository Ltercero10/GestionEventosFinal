const pool = require("../config/db");
const { notificarInscripcion } = require("../services/notificationService");
const { enviarCorreo } = require("../services/emailService");

// CREATE (ADMIN)
async function crearEvento(req, res) {
  try {
    const { titulo, descripcion, ubicacion, fecha_inicio, fecha_fin, cupo } = req.body;

    if (!titulo || !fecha_inicio || !fecha_fin) {
      return res.status(400).json({ ok: false, msg: "titulo, fecha_inicio y fecha_fin son requeridos" });
    }

    // VALIDAR CONFLICTO DE HORARIO
    const [conflicto] = await pool.query(
      `SELECT id, titulo, fecha_inicio, fecha_fin
       FROM eventos
       WHERE ubicacion = ?
       AND estado = 'ACTIVO'
       AND (? < fecha_fin AND ? > fecha_inicio)
       LIMIT 1`,
      [ubicacion, fecha_inicio, fecha_fin]
    );

    if (conflicto.length > 0) {
      return res.status(400).json({
        ok: false,
        msg: "Ya existe un evento en esta ubicación en ese horario"
      });
    }

    const [result] = await pool.query(
      `INSERT INTO eventos
       (titulo, descripcion, ubicacion, fecha_inicio, fecha_fin, cupo, created_by)
       VALUES (?,?,?,?,?,?,?)`,
      [titulo, descripcion || null, ubicacion || null, fecha_inicio, fecha_fin, Number(cupo || 0), req.user.id]
    );

    return res.status(201).json({ ok: true, msg: "Evento creado", id: result.insertId });

  } catch (err) {
    return res.status(500).json({ ok: false, msg: "Error creando evento", error: err.message });
  }
}

// READ LIST (público)
async function listarEventos(req, res) {
  try {
    const [rows] = await pool.query(`
      SELECT 
        e.id, e.titulo, e.descripcion, e.ubicacion,
        e.fecha_inicio, e.fecha_fin, e.cupo, e.estado, e.created_by, e.created_at,
        IFNULL(x.inscritos_activos, 0) AS cupo_usado,
        CASE 
          WHEN e.cupo = 0 THEN NULL
          ELSE GREATEST(e.cupo - IFNULL(x.inscritos_activos, 0), 0)
        END AS cupo_disponible,
        CASE
          WHEN e.cupo = 0 THEN NULL
          ELSE ROUND((IFNULL(x.inscritos_activos, 0) / e.cupo) * 100, 2)
        END AS porcentaje_ocupado
      FROM eventos e
      LEFT JOIN (
        SELECT evento_id, COUNT(*) AS inscritos_activos
        FROM inscripciones
        WHERE estado='ACTIVA'
        GROUP BY evento_id
      ) x ON x.evento_id = e.id
      ORDER BY e.fecha_inicio ASC
    `);

    return res.json({ ok: true, data: rows });
  } catch (err) {
    return res.status(500).json({ ok: false, msg: "Error listando eventos", error: err.message });
  }
}

// READ ONE (público)
async function obtenerEvento(req, res) {
  try {
    const [rows] = await pool.query("SELECT * FROM eventos WHERE id=?", [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ ok: false, msg: "Evento no encontrado" });
    return res.json({ ok: true, data: rows[0] });
  } catch (err) {
    return res.status(500).json({ ok: false, msg: "Error obteniendo evento", error: err.message });
  }
}



// UPDATE (ADMIN)
// UPDATE (ADMIN)
async function actualizarEvento(req, res) {
  try {
    const { titulo, descripcion, ubicacion, fecha_inicio, fecha_fin, cupo, estado } = req.body;

    // 1) Verificar que el evento exista
    const [existRows] = await pool.query(
      "SELECT * FROM eventos WHERE id = ?",
      [req.params.id]
    );
    if (existRows.length === 0) {
      return res.status(404).json({ ok: false, msg: "Evento no encontrado" });
    }

    // Guardar los datos anteriores del evento para enviar en el correo
    const eventoPrevio = existRows[0];

    // 2) Validar campos requeridos si se están actualizando
    if ((titulo !== undefined && !titulo) || (fecha_inicio !== undefined && !fecha_inicio) || (fecha_fin !== undefined && !fecha_fin)) {
      return res.status(400).json({ ok: false, msg: "titulo, fecha_inicio y fecha_fin son requeridos" });
    }

    // 3) Validar conflicto de horario si se actualiza ubicación o fechas
    if (ubicacion || fecha_inicio || fecha_fin) {
      const [conflicto] = await pool.query(
        `SELECT id FROM eventos
         WHERE ubicacion = COALESCE(?, ubicacion)
           AND estado = 'ACTIVO'
           AND id != ?
           AND (? < fecha_fin AND ? > fecha_inicio)
         LIMIT 1`,
        [ubicacion, req.params.id, fecha_inicio, fecha_fin]
      );
      if (conflicto.length > 0) {
        return res.status(400).json({ ok: false, msg: "Ya existe un evento en esta ubicación en ese horario" });
      }
    }

    // 4) Actualizar evento
    await pool.query(
      `UPDATE eventos SET
        titulo = COALESCE(?, titulo),
        descripcion = COALESCE(?, descripcion),
        ubicacion = COALESCE(?, ubicacion),
        fecha_inicio = COALESCE(?, fecha_inicio),
        fecha_fin = COALESCE(?, fecha_fin),
        cupo = COALESCE(?, cupo),
        estado = COALESCE(?, estado)
      WHERE id = ?`,
      [
        titulo ?? null,
        descripcion ?? null,
        ubicacion ?? null,
        fecha_inicio ?? null,
        fecha_fin ?? null,
        cupo !== undefined ? Number(cupo) : null,
        estado ?? null,
        req.params.id,
      ]
    );

    // 5) Obtener usuarios activos inscritos
    const [usuarios] = await pool.query(
      `SELECT u.email, u.nombre
       FROM users u
       JOIN inscripciones i ON u.id = i.user_id
       WHERE i.evento_id = ? AND i.estado = 'ACTIVA'`,
      [req.params.id]
    );

    // 6) Enviar correos de actualización
    for (const usuario of usuarios) {
      try {
        await enviarCorreo(
          usuario.email,
          "Actualización de evento",
          `
          <h2>Evento actualizado</h2>
          <p>Hola ${usuario.nombre},</p>
          <p>El evento <b>${titulo ?? eventoPrevio.titulo}</b> en el que estás inscrito ha sido actualizado.</p>
          <p>Fecha inicio: ${fecha_inicio ?? eventoPrevio.fecha_inicio}<br>
          Fecha fin: ${fecha_fin ?? eventoPrevio.fecha_fin}<br>
          Ubicación: ${ubicacion ?? eventoPrevio.ubicacion}</p>
          <p>Por favor revisa los detalles actualizados en el sistema.</p>
          `
        );
      } catch (e) {
        console.error(`Error enviando correo a ${usuario.email}: ${e.message}`);
      }
    }

    return res.json({ ok: true, msg: "Evento actualizado y notificaciones enviadas" });
  } catch (err) {
    return res.status(500).json({ ok: false, msg: "Error actualizando evento", error: err.message });
  }
}

// DELETE (ADMIN)
async function eliminarEvento(req, res) {
  try {
    const [exist] = await pool.query("SELECT id FROM eventos WHERE id=?", [req.params.id]);
    if (exist.length === 0) return res.status(404).json({ ok: false, msg: "Evento no encontrado" });

    
    const [evento] = await pool.query("SELECT * FROM eventos WHERE id=?", [req.params.id]);
    
    
    if (typeof notificarEventoEliminado === 'function') {
      await notificarEventoEliminado(evento[0]);
    }

    await pool.query("DELETE FROM eventos WHERE id=?", [req.params.id]);

    return res.json({ ok: true, msg: "Evento eliminado" });
  } catch (err) {
    return res.status(500).json({ ok: false, msg: "Error eliminando evento", error: err.message });
  }
}

module.exports = { crearEvento, listarEventos, obtenerEvento, actualizarEvento, eliminarEvento };