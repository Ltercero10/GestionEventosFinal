import { useEffect, useState } from "react";
import { get, post, put, del } from "../api";
import {
  toastSuccess,
  toastError,
  confirmSave,
  confirmDelete,
  confirmDialog,
} from "../utils/alerts";

// Año actual para validaciones de fecha
const currentYear = new Date().getFullYear();
const minDate = `${currentYear}-01-01T00:00`;

const emptyForm = {
  id: null,
  titulo: "",
  descripcion: "",
  ubicacion: "",
  fecha_inicio: "",
  fecha_fin: "",
  cupo: 5,
  estado: "ACTIVO",
};

function toDatetimeLocal(value) {
  if (!value) return "";
  const s = String(value).replace(" ", "T");
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}

function toMySQL(datetimeLocal) {
  if (!datetimeLocal) return null;
  return datetimeLocal.replace("T", " ") + ":00";
}

export default function AdminRecursosEventos({ user }) {
  if (user.rol !== "ADMIN") return null;

  const [eventos, setEventos] = useState([]);
  const [form, setForm] = useState(emptyForm);

  const [recursos, setRecursos] = useState([]);
  const [nombre, setNombre] = useState("");
  const [tipo, setTipo] = useState("");
  const [eventoId, setEventoId] = useState("");
  const [recursoId, setRecursoId] = useState("");
  const [editandoId, setEditandoId] = useState(null);

  const [msg, setMsg] = useState("");

  const cargar = async () => {
    setMsg("");
    try {
      const e = await get("/eventos");
      setEventos(e.data || []);

      const r = await get("/recursos");
      setRecursos(r.data || []);
    } catch (err) {
      const message = err.message || "Error al cargar datos";
      setMsg("❌ " + message);
      toastError(message);
    }
  };

  useEffect(() => {
    cargar();
  }, []);

  const onChange = (k, v) => {
    if (k === "cupo") {
      if (v === "") {
        setForm((p) => ({ ...p, [k]: "" }));
        return;
      }
      if (!/^\d+$/.test(v)) return;
    }
    setForm((p) => ({ ...p, [k]: v }));
  };

  const limpiar = () => setForm(emptyForm);

  const submitEvento = async (e) => {
    e.preventDefault();
    setMsg("");

    const payload = {
      titulo: form.titulo,
      descripcion: form.descripcion,
      ubicacion: form.ubicacion,
      fecha_inicio: toMySQL(form.fecha_inicio),
      fecha_fin: toMySQL(form.fecha_fin),
      cupo: Number(form.cupo || 0),
      estado: form.estado,
    };

    if (!payload.titulo || !payload.fecha_inicio || !payload.fecha_fin) {
      const message = "Título, fecha_inicio y fecha_fin son requeridos";
      setMsg("❌ " + message);
      toastError(message);
      return;
    }

    if (new Date(form.fecha_inicio).getFullYear() < currentYear) {
      const message = `La fecha inicio no puede ser menor al año ${currentYear}`;
      setMsg("❌ " + message);
      toastError(message);
      return;
    }

    if (new Date(form.fecha_fin).getFullYear() < currentYear) {
      const message = `La fecha fin no puede ser menor al año ${currentYear}`;
      setMsg("❌ " + message);
      toastError(message);
      return;
    }

    if (new Date(form.fecha_fin) <= new Date(form.fecha_inicio)) {
      const message = "La fecha fin debe ser mayor que la fecha inicio";
      setMsg("❌ " + message);
      toastError(message);
      return;
    }

    if (Number(form.cupo) < 5) {
      const message = "El cupo no puede ser menor a 5";
      setMsg("❌ " + message);
      toastError(message);
      return;
    }

    const resultConfirm = await confirmSave(!!form.id);
    if (!resultConfirm.isConfirmed) return;

    try {
      if (form.id) {
        const result = await put(`/eventos/${form.id}`, payload);
        setMsg("✅ " + result.msg);
        toastSuccess(result.msg || "Evento actualizado correctamente");
      } else {
        const result = await post("/eventos", payload);
        setMsg("✅ " + result.msg);
        toastSuccess(result.msg || "Evento creado correctamente");
      }

      limpiar();
      await cargar();
    } catch (err) {
      const message = err.message || "Error al guardar evento";
      setMsg("❌ " + message);
      toastError(message);
    }
  };

  const eliminarEvento = async (id, titulo) => {
    const resultConfirm = await confirmDelete(`Se eliminará el evento "${titulo}".`);
    if (!resultConfirm.isConfirmed) return;

    setMsg("");
    try {
      const result = await del(`/eventos/${id}`);
      setMsg("✅ " + result.msg);
      toastSuccess(result.msg || "Evento eliminado correctamente");
      await cargar();
    } catch (err) {
      const message = err.message || "Error al eliminar evento";
      setMsg("❌ " + message);
      toastError(message);
    }
  };

  const cargarFormulario = (e) => {
    setForm({
      id: e.id,
      titulo: e.titulo || "",
      descripcion: e.descripcion || "",
      ubicacion: e.ubicacion || "",
      fecha_inicio: toDatetimeLocal(e.fecha_inicio),
      fecha_fin: toDatetimeLocal(e.fecha_fin),
      cupo: e.cupo ?? 5,
      estado: e.estado || "ACTIVO",
    });
    setMsg("✏️ Editando evento ID " + e.id);
  };

  const crearRecurso = async () => {
    if (!nombre.trim() || !tipo.trim()) {
      const message = "Nombre y tipo son requeridos para el recurso";
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
        const result = await put(`/recursos/${editandoId}`, { nombre, tipo });
        setMsg("✅ " + result.msg);
        toastSuccess(result.msg || "Recurso actualizado correctamente");
        setEditandoId(null);
      } else {
        const result = await post("/recursos", { nombre, tipo });
        setMsg("✅ " + result.msg);
        toastSuccess(result.msg || "Recurso creado correctamente");
      }

      setNombre("");
      setTipo("");
      await cargar();
    } catch (err) {
      const message = err.message || "Error al guardar recurso";
      setMsg("❌ " + message);
      toastError(message);
    }
  };

  const editarRecurso = (r) => {
    setNombre(r.nombre);
    setTipo(r.tipo);
    setEditandoId(r.id);
    setMsg(`✏️ Editando recurso: ${r.nombre}`);
  };

  const eliminarRecurso = async (id, nombreRecurso) => {
    const resultConfirm = await confirmDelete(
      `Se eliminará el recurso "${nombreRecurso}".`
    );
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

  const asignarRecurso = async () => {
    if (!eventoId || !recursoId) {
      const message = "Debes seleccionar un evento y un recurso";
      setMsg("❌ " + message);
      toastError(message);
      return;
    }

    const eventoSeleccionado = eventos.find((e) => String(e.id) === String(eventoId));
    const recursoSeleccionado = recursos.find((r) => String(r.id) === String(recursoId));

    const resultConfirm = await confirmDialog({
      title: "¿Asignar recurso al evento?",
      text: `Se asignará "${
        recursoSeleccionado?.nombre || "el recurso"
      }" al evento "${eventoSeleccionado?.titulo || "seleccionado"}".`,
      icon: "question",
      confirmButtonText: "Sí, asignar",
      cancelButtonText: "Cancelar",
    });

    if (!resultConfirm.isConfirmed) return;

    try {
      const result = await post(`/recursos/evento/${eventoId}`, {
        recurso_id: recursoId,
        cantidad: 1,
      });
      setMsg("✅ " + result.msg);
      toastSuccess(result.msg || "Recurso asignado correctamente");
    } catch (err) {
      const message = err.message || "Error al asignar recurso";
      setMsg("❌ " + message);
      toastError(message);
    }
  };

  return (
    <div style={{ marginTop: 20 }}>
      <h3>Panel Administrativo: Eventos y Recursos</h3>
      <button onClick={cargar} style={{ padding: 8, marginBottom: 10 }}>
        Recargar
      </button>
      {msg && <p>{msg}</p>}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div style={{ border: "1px solid #444", borderRadius: 12, padding: 12 }}>
          <h4>{form.id ? "Editar evento" : "Crear evento"}</h4>
          <form onSubmit={submitEvento} style={{ display: "grid", gap: 10 }}>
            <input
              placeholder="Título"
              value={form.titulo}
              onChange={(e) => onChange("titulo", e.target.value)}
            />

            <select
              value={form.ubicacion}
              onChange={(e) => onChange("ubicacion", e.target.value)}
            >
              <option value="">Seleccionar ubicación</option>
              <option value="Auditorio">Auditorio</option>
              <option value="Sala 1">Sala 1</option>
              <option value="Sala 2">Sala 2</option>
              <option value="Sala de conferencias">Sala de conferencias</option>
            </select>

            <textarea
              placeholder="Descripción"
              value={form.descripcion}
              onChange={(e) => onChange("descripcion", e.target.value)}
              style={{ minHeight: 70 }}
            />

            <label style={{ fontSize: 13, opacity: 0.8 }}>Fecha inicio</label>
            <input
              type="datetime-local"
              value={form.fecha_inicio}
              min={minDate}
              onChange={(e) => onChange("fecha_inicio", e.target.value)}
            />

            <label style={{ fontSize: 13, opacity: 0.8 }}>Fecha fin</label>
            <input
              type="datetime-local"
              value={form.fecha_fin}
              min={minDate}
              onChange={(e) => onChange("fecha_fin", e.target.value)}
            />

            <label style={{ fontSize: 13, opacity: 0.8 }}>Cupos</label>
            <input
              type="number"
              placeholder="Cupo"
              value={form.cupo}
              min="5"
              onChange={(e) => onChange("cupo", e.target.value)}
            />

            <label style={{ fontSize: 13, opacity: 0.8 }}>Estado</label>
            <select
              value={form.estado}
              onChange={(e) => onChange("estado", e.target.value)}
            >
              <option value="ACTIVO">ACTIVO</option>
              <option value="CANCELADO">CANCELADO</option>
            </select>

            <div style={{ display: "flex", gap: 10 }}>
              <button style={{ flex: 1 }}>
                {form.id ? "Guardar cambios" : "Crear"}
              </button>
              <button type="button" onClick={limpiar} style={{ flex: 1 }}>
                Limpiar
              </button>
            </div>
          </form>
        </div>

        <div style={{ border: "1px solid #444", borderRadius: 12, padding: 12 }}>
          <h4>Eventos</h4>
          {eventos.length === 0 ? (
            <p>No hay eventos.</p>
          ) : (
            eventos.map((e) => (
              <div
                key={e.id}
                style={{
                  border: "1px solid #555",
                  borderRadius: 12,
                  padding: 12,
                  marginBottom: 6,
                }}
              >
                <b>{e.titulo}</b>
                <div style={{ fontSize: 13 }}>
                  ID: {e.id} | {String(e.estado)}
                </div>
                <div style={{ fontSize: 13 }}>
                  Cupo: {e.cupo} | Usado: {e.cupo_usado ?? 0}
                </div>
                <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                  <button onClick={() => cargarFormulario(e)} style={{ flex: 1 }}>
                    Editar
                  </button>
                  <button
                    onClick={() => eliminarEvento(e.id, e.titulo)}
                    style={{ flex: 1, background: "#ff4d4f", color: "white" }}
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div style={{ border: "1px solid #444", borderRadius: 12, padding: 12, marginTop: 20 }}>
        <h4>Crear/Editar recurso</h4>

        <input
          placeholder="Nombre"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          style={{ padding: 8, marginRight: 8 }}
        />

        <select value={tipo} onChange={(e) => setTipo(e.target.value)}>
          <option value="">Seleccionar tipo</option>
          <option value="Multimedia">Multimedia</option>
          <option value="Infraestructura">Infraestructura</option>
          <option value="Tecnología">Tecnología</option>
          <option value="Personal">Personal</option>
          <option value="Logística">Logística</option>
        </select>

        <button onClick={crearRecurso}>
          {editandoId ? "Actualizar" : "Crear"}
        </button>

        <h4 style={{ marginTop: 20 }}>Recursos existentes</h4>
        {recursos.map((r) => (
          <div
            key={r.id}
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: 8,
              border: "1px solid #555",
              borderRadius: 8,
              marginBottom: 6,
            }}
          >
            <span>
              {r.nombre} — {r.tipo}
            </span>
            <div style={{ display: "flex", gap: 6 }}>
              <button onClick={() => editarRecurso(r)}>Editar</button>
              <button
                onClick={() => eliminarRecurso(r.id, r.nombre)}
                style={{ background: "#ff4d4f", color: "white" }}
              >
                Eliminar
              </button>
            </div>
          </div>
        ))}

        <h4 style={{ marginTop: 20 }}>Asignar recurso a evento</h4>

        <select
          value={eventoId}
          onChange={(e) => setEventoId(e.target.value)}
          style={{ marginRight: 8 }}
        >
          <option value="">Seleccionar evento</option>
          {eventos.map((e) => (
            <option key={e.id} value={e.id}>
              {e.titulo}
            </option>
          ))}
        </select>

        <select value={recursoId} onChange={(e) => setRecursoId(e.target.value)}>
          <option value="">Seleccionar recurso</option>
          {recursos.map((r) => (
            <option key={r.id} value={r.id}>
              {r.nombre} — {r.tipo}
            </option>
          ))}
        </select>

        <button onClick={asignarRecurso} style={{ marginLeft: 8 }}>
          Asignar
        </button>
      </div>
    </div>
  );
}