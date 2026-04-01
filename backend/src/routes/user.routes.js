const router = require("express").Router();
const { auth, requireRole } = require("../middleware/auth");
const {
  listarUsuarios,
  crearUsuario,
  actualizarUsuario,
  eliminarUsuario,
} = require("../controllers/users.controller");

router.get("/", auth, requireRole("ADMIN"), listarUsuarios);
router.post("/", auth, requireRole("ADMIN"), crearUsuario);
router.put("/:id", auth, requireRole("ADMIN"), actualizarUsuario);
router.delete("/:id", auth, requireRole("ADMIN"), eliminarUsuario);

module.exports = router;