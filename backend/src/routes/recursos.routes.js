const router = require("express").Router();
const { auth, requireRole } = require("../middleware/auth");
const {
  crearRecurso, listarRecursos, actualizarRecurso, eliminarRecurso,
  asignarRecursoEvento, recursosDeEvento,eliminarAsignacionRecursoEvento,
} = require("../controllers/recursos.controller");

// ADMIN recursos
router.get("/", auth, requireRole("ADMIN"), listarRecursos);
router.post("/", auth, requireRole("ADMIN"), crearRecurso);
router.put("/:id", auth, requireRole("ADMIN"), actualizarRecurso);
router.delete("/:id", auth, requireRole("ADMIN"), eliminarRecurso);
router.delete("/evento/asignacion/:id",auth,requireRole("ADMIN"),eliminarAsignacionRecursoEvento
);

// ADMIN asignar a evento
router.post("/evento/:eventoId", auth, requireRole("ADMIN"), asignarRecursoEvento);
router.get("/evento/:eventoId", auth, recursosDeEvento);

module.exports = router;
