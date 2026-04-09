import { useEffect, useState } from "react";
import { get, post, put, del } from "../api";
import {
  toastSuccess,
  toastError,
  confirmDialog,
  confirmDelete,
} from "../utils/alerts";

export default function RecursosAdmin({ user }) {
  const [recursos, setRecursos] = useState([]);
  const [eventos, setEventos] = useState([]);
  const [nombre, setNombre] = useState("");
  const [tipo, setTipo] = useState("");
  const [eventoId, setEventoId] = useState("");
  const [recursoId, setRecursoId] = useState("");
  const [msg, setMsg] = useState("");
  const [editandoId, setEditandoId] = useState(null);

  // Tipos dinámicos
  const [tipos, setTipos] = useState([
    "Multimedia",
    "Infraestructura",
    "Tecnología",
    "Personal",
    "Logística",
  ]);
  const [nuevoTipo, setNuevoTipo] = useState("");
  const [crearNuevoTipo, setCrearNuevoTipo] = useState(false);

  const cargar = async () => {
    setMsg("");
    try {
      const r = await get("/recursos");
      setRecursos(r.data || []);

      const e = await get("/eventos");
      setEventos(e.data || []);
    } catch (err) {
      const message = err.message || "Error al cargar datos";
      setMsg("❌ " + message);
      toastError(message);
    }
  };

  useEffect(() => {
    if (user.rol === "ADMIN") cargar();
  }, []);

  const crearRecurso = async () => {
    const tipoFinal = crearNuevoTipo && nuevoTipo.trim() ? nuevoTipo.trim() : tipo;

    if (!nombre.trim() || !tipoFinal) {
      const message = "Nombre y tipo son obligatorios";
      setMsg("❌ " + message);
      toastError(message);
      return;
    }

    const resultConfirm = await confirmDialog({
      title: editandoId ? "¿Actualizar recurso?" : "¿Crear recurso?",
      text: editandoId
        ? `Se actualizará el recurso "${nombre}".`
        : `Se creará el recurso "${nombre}".`,
      icon: "question",
      confirmButtonText: editandoId ? "Sí, actualizar" : "Sí, crear",
      cancelButtonText: "Cancelar",
    });

    if (!resultConfirm.isConfirmed) return;

    try {
      if (editandoId) {
        const result = await put(`/recursos/${editandoId}`, { nombre, tipo: tipoFinal });
        setMsg("✅ " + result.msg);
        toastSuccess(result.msg || "Recurso actualizado correctamente");
        setEditandoId(null);
      } else {
        const result = await post("/recursos", { nombre, tipo: tipoFinal });
        setMsg("✅ " + result.msg);
        toastSuccess(result.msg || "Recurso creado correctamente");
      }

      // Si es un tipo nuevo, agregarlo a la lista
      if (crearNuevoTipo && nuevoTipo.trim() && !tipos.includes(nuevoTipo.trim())) {
        setTipos([...tipos, nuevoTipo.trim()]);
      }

      setNombre("");
      setTipo("");
      setNuevoTipo("");
      setCrearNuevoTipo(false);
      await cargar();
    } catch (err) {
      const message = err.message || "Error al guardar recurso";
      setMsg("❌ " + message);
      toastError(message);
    }
  };

  const asignar = async () => {
    if (!eventoId || !recursoId) {
      const message = "Debes seleccionar evento y recurso";
      setMsg("❌ " + message);
      toastError(message);
      return;
    }

    const eventoSeleccionado = eventos.find((e) => String(e.id) === String(eventoId));
    const recursoSeleccionado = recursos.find((r) => String(r.id) === String(recursoId));

    const resultConfirm = await confirmDialog({
      title: "¿Asignar recurso?",
      text: `Se asignará "${recursoSeleccionado?.nombre || "el recurso"}" al evento "${eventoSeleccionado?.titulo || "seleccionado"}".`,
      icon: "question",
      confirmButtonText: "Sí, asignar",
      cancelButtonText: "Cancelar",
    });

    if (!resultConfirm.isConfirmed) return;

    try {
      const result = await post(`/recursos/evento/${eventoId}`, { recurso_id: recursoId, cantidad: 1 });
      setMsg("✅ " + result.msg);
      toastSuccess(result.msg || "Recurso asignado correctamente");
    } catch (err) {
      const message = err.message || "Error al asignar recurso";
      setMsg("❌ " + message);
      toastError(message);
    }
  };

  const eliminarRecurso = async (id, nombreRecurso) => {
    const resultConfirm = await confirmDelete(`Se eliminará el recurso "${nombreRecurso}".`);
    if (!resultConfirm.isConfirmed) return;

    try {
      const result = await del(`/recursos/${id}`);
      setMsg("✅ " + result.msg);
      toastSuccess(result.msg || "Recurso eliminado correctamente");
      await cargar();
    } catch (err) {
      const message = err.message || "Error al eliminar recurso";
      setMsg("❌ " + message);
      toastError(message);
    }
  };

  const editarRecurso = (recurso) => {
    setNombre(recurso.nombre);
    setTipo(recurso.tipo);
    setNuevoTipo("");
    setCrearNuevoTipo(false);
    setEditandoId(recurso.id);
    setMsg(`✏️ Editando recurso: ${recurso.nombre}`);
  };

  if (user.rol !== "ADMIN") return null;

  // Paleta de colores y estilos
  const darkPalette = {
    background: "transparent",
    surface: "rgba(0, 0, 0, 0.7)",
    border: "rgba(255, 255, 255, 0.12)",
    borderLight: "rgba(255, 255, 255, 0.2)",
    text: "#ffffff",
    textMuted: "#b0b0b0",
    primary: "#3b82f6",
    success: "#10b981",
    danger: "#ef4444",
    inputBg: "rgba(0, 0, 0, 0.45)",
    cardBg: "rgba(0, 0, 0, 0.55)",
  };

  const glassStyle = {
    backdropFilter: "blur(12px)",
    WebkitBackdropFilter: "blur(12px)",
    border: `1px solid ${darkPalette.border}`,
    boxShadow: "0 8px 32px 0 rgba(0, 0, 0, 0.45)",
  };

  const actionButtonStyle = (colorRgb) => ({
    padding: "8px 18px",
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    color: "#ffffff",
    border: `1px solid rgba(${colorRgb}, 0.5)`,
    borderRadius: "10px",
    fontSize: "13px",
    fontWeight: "600",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: "8px",
    transition: "all 0.2s ease-in-out",
  });

  return (
    <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "20px", fontFamily: "'Inter', system-ui, sans-serif", minHeight: "100vh", color: darkPalette.text }}>
      <h3 style={{ fontSize: "24px", fontWeight: "700", marginBottom: "20px", paddingBottom: "10px", borderBottom: `2px solid ${darkPalette.primary}`, display: "inline-block" }}>
        Gestión de Recursos
      </h3>

      {msg && (
        <div style={{
          padding: "10px 15px",
          borderRadius: "8px",
          marginBottom: "20px",
          backgroundColor: msg.includes("✅") ? "rgba(16, 185, 129, 0.15)" : "rgba(239, 68, 68, 0.15)",
          color: msg.includes("✅") ? "#6ee7b7" : "#fca5a5",
          borderLeft: `4px solid ${msg.includes("✅") ? darkPalette.success : darkPalette.danger}`,
          backdropFilter: "blur(5px)",
          fontWeight: "500",
        }}>
          {msg}
        </div>
      )}

      {/* Formulario Crear/Editar */}
      <div style={{ ...glassStyle, padding: "20px", borderRadius: "16px", marginBottom: "20px", backgroundColor: darkPalette.surface }}>
        <h4 style={{ marginBottom: "15px", fontSize: "16px", fontWeight: "600" }}>
          {editandoId ? "✏️ Editar recurso" : "➕ Crear recurso"}
        </h4>
        <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
          <input
            placeholder="Nombre del recurso"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            style={{ flex: 2, padding: "10px 14px", border: `1px solid ${darkPalette.borderLight}`, borderRadius: "10px", backgroundColor: darkPalette.inputBg, color: "#fff", outline: "none" }}
          />
          <select
            value={crearNuevoTipo ? "nuevo" : tipo}
            onChange={(e) => {
              if (e.target.value === "nuevo") {
                setCrearNuevoTipo(true);
                setTipo("");
              } else {
                setTipo(e.target.value);
                setCrearNuevoTipo(false);
              }
            }}
            style={{ flex: 1, padding: "10px 14px", border: `1px solid ${darkPalette.borderLight}`, borderRadius: "10px", backgroundColor: darkPalette.inputBg, color: "#fff", cursor: "pointer" }}
          >
            <option value="" style={{ backgroundColor: "#111" }}>Tipo...</option>
            {tipos.map((t, i) => (
              <option key={i} value={t} style={{ backgroundColor: "#111" }}>{t}</option>
            ))}
            <option value="nuevo" style={{ backgroundColor: "#111" }}>➕ Nuevo...</option>
          </select>
          {crearNuevoTipo && (
            <input
              placeholder="Nuevo tipo de recurso"
              value={nuevoTipo}
              onChange={(e) => setNuevoTipo(e.target.value)}
              style={{ flex: 1, padding: "10px 14px", border: `1px solid ${darkPalette.borderLight}`, borderRadius: "10px", backgroundColor: darkPalette.inputBg, color: "#fff", outline: "none" }}
            />
          )}
          <button
            onClick={crearRecurso}
            style={{ padding: "10px 24px", backgroundColor: darkPalette.primary, color: "white", border: "none", borderRadius: "10px", fontWeight: "600", cursor: "pointer" }}
          >
            {editandoId ? "Actualizar" : "Guardar"}
          </button>
        </div>
      </div>

      {/* Asignar recurso a evento */}
      <div style={{ ...glassStyle, padding: "20px", borderRadius: "16px", marginBottom: "30px", backgroundColor: darkPalette.surface }}>
        <h4 style={{ marginBottom: "15px", fontSize: "16px", fontWeight: "600" }}>Asignar recurso a evento</h4>
        <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
          <select value={eventoId} onChange={(e) => setEventoId(e.target.value)} style={{ flex: 1, padding: "10px 14px", border: `1px solid ${darkPalette.borderLight}`, borderRadius: "10px", backgroundColor: darkPalette.inputBg, color: "#fff" }}>
            <option value="" style={{ backgroundColor: "#111" }}>Seleccionar evento</option>
            {eventos.map((e) => <option key={e.id} value={e.id} style={{ backgroundColor: "#111" }}>{e.titulo}</option>)}
          </select>
          <select value={recursoId} onChange={(e) => setRecursoId(e.target.value)} style={{ flex: 1, padding: "10px 14px", border: `1px solid ${darkPalette.borderLight}`, borderRadius: "10px", backgroundColor: darkPalette.inputBg, color: "#fff" }}>
            <option value="" style={{ backgroundColor: "#111" }}>Seleccionar recurso</option>
            {recursos.map((r) => <option key={r.id} value={r.id} style={{ backgroundColor: "#111" }}>{r.nombre}</option>)}
          </select>
          <button onClick={asignar} style={{ padding: "10px 24px", backgroundColor: darkPalette.primary, color: "white", border: "none", borderRadius: "10px", cursor: "pointer" }}>Asignar</button>
        </div>
      </div>

      {/* Lista de recursos */}
      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        <h4 style={{ marginBottom: "5px", fontSize: "16px", fontWeight: "600" }}>Recursos existentes ({recursos.length})</h4>
        {recursos.map((r) => (
          <div key={r.id} style={{ ...glassStyle, display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 20px", borderRadius: "14px", backgroundColor: darkPalette.cardBg }}>
            <div style={{ flex: 1 }}>
              <span style={{ fontWeight: "600", fontSize: "15px" }}>{r.nombre}</span>
              <span style={{ marginLeft: "12px", padding: "4px 10px", backgroundColor: "rgba(255,255,255,0.06)", borderRadius: "6px", fontSize: "11px", textTransform: "uppercase", color: darkPalette.textMuted }}>{r.tipo}</span>
            </div>

            <div style={{ display: "flex", gap: "12px" }}>
              <button
                onClick={() => editarRecurso(r)}
                style={actionButtonStyle("16, 185, 129")}
                onMouseOver={(e) => {
                  e.currentTarget.style.backgroundColor = "rgba(16, 185, 129, 0.2)";
                  e.currentTarget.style.transform = "translateY(-2px)";
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.05)";
                  e.currentTarget.style.transform = "translateY(0)";
                }}
              >Editar</button>

              <button
                onClick={() => eliminarRecurso(r.id, r.nombre)}
                style={actionButtonStyle("239, 68, 68")}
                onMouseOver={(e) => {
                  e.currentTarget.style.backgroundColor = "rgba(239, 68, 68, 0.2)";
                  e.currentTarget.style.transform = "translateY(-2px)";
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.05)";
                  e.currentTarget.style.transform = "translateY(0)";
                }}
              >Borrar</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}