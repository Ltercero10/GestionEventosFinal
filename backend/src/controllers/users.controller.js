const pool = require("../config/db");
const bcrypt = require("bcryptjs");

async function listarUsuarios(req, res) {
  try {
    const [rows] = await pool.query(
      "SELECT id, nombre, email, rol FROM users ORDER BY id ASC"
    );

    return res.json({
      ok: true,
      data: rows,
    });
  } catch (err) {
    return res.status(500).json({
      ok: false,
      msg: "Error al obtener los usuarios",
      error: err.message,
    });
  }
}

async function crearUsuario(req, res) {
  try {
    const { nombre, email, password, rol } = req.body;

    if (!nombre || !email || !password || !rol) {
      return res.status(400).json({
        ok: false,
        msg: "nombre, email, password y rol son requeridos",
      });
    }

    if (!["ADMIN", "CLIENTE"].includes(rol)) {
      return res.status(400).json({
        ok: false,
        msg: "Rol inválido",
      });
    }

    const [exist] = await pool.query(
      "SELECT id FROM users WHERE email = ?",
      [email]
    );

    if (exist.length > 0) {
      return res.status(409).json({
        ok: false,
        msg: "Ese email ya está registrado",
      });
    }

    const password_hash = await bcrypt.hash(password, 10);

    const [result] = await pool.query(
      "INSERT INTO users (nombre, email, password_hash, rol) VALUES (?,?,?,?)",
      [nombre, email, password_hash, rol]
    );

    return res.status(201).json({
      ok: true,
      msg: "Usuario creado correctamente",
      data: {
        id: result.insertId,
        nombre,
        email,
        rol,
      },
    });
  } catch (err) {
    return res.status(500).json({
      ok: false,
      msg: "Error al crear usuario",
      error: err.message,
    });
  }
}

async function actualizarUsuario(req, res) {
  try {
    const { id } = req.params;
    const { nombre, email, rol, password } = req.body;

    if (!nombre || !email || !rol) {
      return res.status(400).json({
        ok: false,
        msg: "nombre, email y rol son requeridos",
      });
    }

    if (!["ADMIN", "CLIENTE"].includes(rol)) {
      return res.status(400).json({
        ok: false,
        msg: "Rol inválido",
      });
    }

    const [usuarioRows] = await pool.query(
      "SELECT id, rol FROM users WHERE id = ?",
      [id]
    );

    if (usuarioRows.length === 0) {
      return res.status(404).json({
        ok: false,
        msg: "Usuario no encontrado",
      });
    }

    const usuarioActual = usuarioRows[0];

    const [emailExist] = await pool.query(
      "SELECT id FROM users WHERE email = ? AND id <> ?",
      [email, id]
    );

    if (emailExist.length > 0) {
      return res.status(409).json({
        ok: false,
        msg: "Ese email ya está siendo usado por otro usuario",
      });
    }

    if (usuarioActual.rol === "ADMIN" && rol !== "ADMIN") {
      const [admins] = await pool.query(
        "SELECT COUNT(*) AS total FROM users WHERE rol = 'ADMIN'"
      );

      if (admins[0].total <= 1) {
        return res.status(400).json({
          ok: false,
          msg: "No se puede cambiar el rol del último admin",
        });
      }
    }

    if (password && password.trim() !== "") {
      const password_hash = await bcrypt.hash(password, 10);

      await pool.query(
        "UPDATE users SET nombre = ?, email = ?, rol = ?, password_hash = ? WHERE id = ?",
        [nombre, email, rol, password_hash, id]
      );
    } else {
      await pool.query(
        "UPDATE users SET nombre = ?, email = ?, rol = ? WHERE id = ?",
        [nombre, email, rol, id]
      );
    }

    return res.json({
      ok: true,
      msg: "Usuario actualizado correctamente",
    });
  } catch (err) {
    return res.status(500).json({
      ok: false,
      msg: "Error al actualizar usuario",
      error: err.message,
    });
  }
}

async function eliminarUsuario(req, res) {
  try {
    const { id } = req.params;

    const [usuarioRows] = await pool.query(
      "SELECT id, rol FROM users WHERE id = ?",
      [id]
    );

    if (usuarioRows.length === 0) {
      return res.status(404).json({
        ok: false,
        msg: "Usuario no encontrado",
      });
    }

    const usuario = usuarioRows[0];

    if (Number(req.user.id) === Number(id)) {
      return res.status(400).json({
        ok: false,
        msg: "No puedes eliminar tu propio usuario",
      });
    }

    if (usuario.rol === "ADMIN") {
      const [admins] = await pool.query(
        "SELECT COUNT(*) AS total FROM users WHERE rol = 'ADMIN'"
      );

      if (admins[0].total <= 1) {
        return res.status(400).json({
          ok: false,
          msg: "No se puede eliminar el último admin",
        });
      }
    }

    await pool.query("DELETE FROM users WHERE id = ?", [id]);

    return res.json({
      ok: true,
      msg: "Usuario eliminado correctamente",
    });
  } catch (err) {
    return res.status(500).json({
      ok: false,
      msg: "Error al eliminar usuario",
      error: err.message,
    });
  }
}

module.exports = {
  listarUsuarios,
  crearUsuario,
  actualizarUsuario,
  eliminarUsuario,
};