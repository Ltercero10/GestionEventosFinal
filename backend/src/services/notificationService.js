const pool = require("../config/db");
const { enviarCorreo } = require("./emailService");

async function notificarInscripcion(userId, evento) {
  const [rows] = await pool.query(
    "SELECT nombre, email FROM Users WHERE id=?",
    [userId]
  );

  const usuario = rows[0];
  if (!usuario) return;

  await enviarCorreo(
    usuario.email,
    "Inscripción confirmada",
    `
    <h2>Inscripción exitosa</h2>
    <p>Hola ${usuario.nombre},</p>
    <p>Te has inscrito correctamente al evento:</p>
    <b>${evento.titulo}</b>
    <p>Fecha: ${new Date(evento.fecha_inicio).toLocaleString()}</p>
    `
  );
}

async function notificarCancelacion(userId, evento) {
  const [rows] = await pool.query(
    "SELECT nombre, email FROM Users WHERE id=?",
    [userId]
  );

  const usuario = rows[0];
  if (!usuario) return;

  await enviarCorreo(
    usuario.email,
    "Cancelación de inscripción",
    `
    <h2>Inscripción cancelada</h2>
    <p>Hola ${usuario.nombre},</p>
    <p>Tu inscripción al evento <b>${evento.titulo}</b> ha sido cancelada.</p>
    `
  );
}

async function notificarEventoActualizado(evento) {
  const [usuarios] = await pool.query(
    `
    SELECT u.nombre, u.email
    FROM Users u
    JOIN inscripciones i ON u.id = i.user_id
    WHERE i.evento_id = ?
    AND i.estado='ACTIVA'
    `,
    [evento.id]
  );

  for (const usuario of usuarios) {
    await enviarCorreo(
      usuario.email,
      "Evento actualizado",
      `
      <h2>Evento actualizado</h2>
      <p>Hola ${usuario.nombre},</p>
      <p>El evento <b>${evento.titulo}</b> ha sido actualizado.</p>
      `
    );
  }
}

async function notificarEventoEliminado(evento) {
  const [usuarios] = await pool.query(
    `
    SELECT u.nombre, u.email
    FROM Users u
    JOIN inscripciones i ON u.id = i.user_id
    WHERE i.evento_id = ?
    AND i.estado='ACTIVA'
    `,
    [evento.id]
  );

  for (const usuario of usuarios) {
    await enviarCorreo(
      usuario.email,
      "Evento eliminado",
      `
      <h2>Evento eliminado</h2>
      <p>Hola ${usuario.nombre},</p>
      <p>El evento <b>${evento.titulo}</b> ha sido eliminado.</p>
      `
    );
  }
}

module.exports = {
  notificarInscripcion,
  notificarCancelacion,
  notificarEventoActualizado,
  notificarEventoEliminado,
};