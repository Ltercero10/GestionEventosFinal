import { useEffect, useState } from "react";
import { get, post, put, del } from "../api";

import {
  toastSuccess,
  toastError,
  confirmSave,
  confirmDelete,
} from "../utils/alerts";

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

function formatFecha(value) {
  if (!value) return "-";
  const d = new Date(String(value).replace(" ", "T"));
  if (Number.isNaN(d.getTime())) return String(value);

  return new Intl.DateTimeFormat("es-HN", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

export default function AdminEventos({ user }) {
  if (user.rol !== "ADMIN") return null;

  const [eventos, setEventos] = useState([]);
  const [recursos, setRecursos] = useState([]);
  const [recursosPorEvento, setRecursosPorEvento] = useState({});
  const [expandedEvent, setExpandedEvent] = useState(null);

  const [form, setForm] = useState(emptyForm);
  const [msg, setMsg] = useState("");

  const [search, setSearch] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("ACTIVO");
  const [filtroMes, setFiltroMes] = useState("TODOS");
  const [usuarios, setUsuarios] = useState([]);
  const [seleccionados, setSeleccionados] = useState([]);
  const [originalInscritos, setOriginalInscritos] = useState([]); // Para comparar al editar

  const [step, setStep] = useState(1);
  const [openModal, setOpenModal] = useState(false);

  const [selectedRecursos, setSelectedRecursos] = useState([]);
  const [recursosActualesEvento, setRecursosActualesEvento] = useState([]);

  // NUEVO: para permitir agregar nueva ubicación
const [nuevaUbicacion, setNuevaUbicacion] = useState("");
const [mostrarNuevaUbicacion, setMostrarNuevaUbicacion] = useState(false);

  const nextStep = () => setStep((prev) => Math.min(prev + 1, 4));
  const prevStep = () => setStep((prev) => Math.max(prev - 1, 1));

  const cargarRecursosPorEvento = async (eventoId) => {
    try {
      const recursosRes = await get(`/recursos/evento/${eventoId}`);
      setRecursosPorEvento(prev => ({
        ...prev,
        [eventoId]: recursosRes.data || []
      }));
    } catch (err) {
      console.error("Error al cargar recursos del evento:", err);
      setRecursosPorEvento(prev => ({
        ...prev,
        [eventoId]: []
      }));
    }
  };

  const cargar = async () => {
    setMsg("");
    try {
      const [eventosRes, recursosRes] = await Promise.all([
        get("/eventos"),
        get("/recursos"),
      ]);

      const eventosData = eventosRes.data || [];
      setEventos(eventosData);
      setRecursos(recursosRes.data || []);

      for (const evento of eventosData) {
        await cargarRecursosPorEvento(evento.id);
      }
    } catch (err) {
      const message = err.message || "Error al cargar datos";
      setMsg("❌ " + message);
      toastError(message);
    }
  };

  useEffect(() => {
    const cargarUsuarios = async () => {
      try {
        const usersRes = await get("/users");
        setUsuarios(usersRes.data || []);
      } catch (err) {
        console.error("Error cargando usuarios", err);
      }
    };

    cargarUsuarios();
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

  const limpiar = () => {
    setForm(emptyForm);
    setStep(1);
    setMsg("");
    setSelectedRecursos([]);
    setRecursosActualesEvento([]);
    setSeleccionados([]);
    setOriginalInscritos([]);
    setNuevaUbicacion("");
    setMostrarNuevaUbicacion(false);
  };

  const abrirModalCrear = () => {
    limpiar();
    setOpenModal(true);
  };

  const cerrarModal = () => {
    setOpenModal(false);
    limpiar();
  };

  const estaFinalizado = (evento) => {
    if (!evento?.fecha_fin) return false;
    return new Date(formatFecha(evento.fecha_fin).replace(" ", "T")) < new Date();
  };

  const getEstadoVisual = (evento) => {
    if (evento.estado === "CANCELADO") return "CANCELADO";
    if (estaFinalizado(evento)) return "FINALIZADO";
    return "ACTIVO";
  };

  const getBadgeStyle = (estado) => {
    if (estado === "ACTIVO") {
      return {
        background: "rgba(34,197,94,.18)",
        color: "#86efac",
        border: "1px solid rgba(34,197,94,.35)",
      };
    }

    if (estado === "CANCELADO") {
      return {
        background: "rgba(239,68,68,.18)",
        color: "#fca5a5",
        border: "1px solid rgba(239,68,68,.35)",
      };
    }

    return {
      background: "rgba(59,130,246,.18)",
      color: "#93c5fd",
      border: "1px solid rgba(59,130,246,.35)",
    };
  };

  const puedeEditar = (evento) => {
    const estadoVisual = getEstadoVisual(evento);
    return estadoVisual === "ACTIVO";
  };

  const puedeEliminar = (evento) => {
    const estadoVisual = getEstadoVisual(evento);
    return estadoVisual === "ACTIVO";
  };

  const toggleExpand = (eventoId) => {
    if (expandedEvent === eventoId) {
      setExpandedEvent(null);
    } else {
      setExpandedEvent(eventoId);
    }
  };

  const eventosFiltrados = eventos.filter((e) => {
    const titulo = (e.titulo || "").toLowerCase();
    const coincideBusqueda = titulo.includes(search.toLowerCase());

    let coincideEstado = true;

    if (filtroEstado === "ACTIVO") {
      coincideEstado = getEstadoVisual(e) === "ACTIVO";
    } else if (filtroEstado === "CANCELADO") {
      coincideEstado = getEstadoVisual(e) === "CANCELADO";
    } else if (filtroEstado === "FINALIZADO") {
      coincideEstado = getEstadoVisual(e) === "FINALIZADO";
    }

    let coincideMes = true;

    if (filtroMes !== "TODOS" && e.fecha_inicio) {
      const mesEvento =
        new Date(formatFecha(e.fecha_inicio).replace(" ", "T")).getMonth() + 1;
      coincideMes = String(mesEvento) === filtroMes;
    }

    return coincideBusqueda && coincideEstado && coincideMes;
  });

  const validarPaso1 = () => {
    if (!form.titulo || !form.fecha_inicio || !form.fecha_fin) {
      const message = "Título, fecha_inicio y fecha_fin son requeridos";
      setMsg("❌ " + message);
      toastError(message);
      return false;
    }

    if (new Date(form.fecha_inicio).getFullYear() < currentYear) {
      const message = `La fecha inicio no puede ser menor al año ${currentYear}`;
      setMsg("❌ " + message);
      toastError(message);
      return false;
    }

    if (new Date(form.fecha_fin).getFullYear() < currentYear) {
      const message = `La fecha fin no puede ser menor al año ${currentYear}`;
      setMsg("❌ " + message);
      toastError(message);
      return false;
    }

    if (new Date(form.fecha_fin) <= new Date(form.fecha_inicio)) {
      const message = "La fecha fin debe ser mayor que la fecha inicio";
      setMsg("❌ " + message);
      toastError(message);
      return false;
    }

    if (Number(form.cupo) < 5) {
      const message = "El cupo no puede ser menor a 5";
      setMsg("❌ " + message);
      toastError(message);
      return false;
    }

    return true;
  };

  const continuarPaso1 = () => {
    setMsg("");
    if (!validarPaso1()) return;
    setStep(2);
  };

  const continuarPaso2 = () => {
    setMsg("");
    setStep(3);
  };

  const toggleRecurso = (recurso) => {
    setSelectedRecursos((prev) => {
      const existe = prev.some((r) => r.recurso_id === recurso.id);

      if (existe) {
        return prev.filter((r) => r.recurso_id !== recurso.id);
      }

      return [
        ...prev,
        {
          recurso_id: recurso.id,
          nombre: recurso.nombre,
          tipo: recurso.tipo,
          cantidad: 1,
        },
      ];
    });
  };

  const recursoYaAsignado = (recursoId) => {
    return recursosActualesEvento.some(
      (r) => String(r.recurso_id) === String(recursoId)
    );
  };

  const agregarRecursoAEventoExistente = async (recurso) => {
    try {
      if (!form.id) return;

      const result = await post(`/recursos/evento/${form.id}`, {
        recurso_id: recurso.id,
        cantidad: 1,
      });

      toastSuccess(result.msg || "Recurso agregado al evento");

      const recursosRes = await get(`/recursos/evento/${form.id}`);
      setRecursosActualesEvento(recursosRes.data || []);
      
      setRecursosPorEvento(prev => ({
        ...prev,
        [form.id]: recursosRes.data || []
      }));
    } catch (err) {
      toastError(err.message || "Error al agregar recurso al evento");
    }
  };

  const quitarRecursoDeEvento = async (asignacionId) => {
    try {
      const result = await del(`/recursos/evento/asignacion/${asignacionId}`);
      toastSuccess(result.msg || "Recurso quitado del evento");

      setRecursosActualesEvento((prev) =>
        prev.filter((r) => String(r.id) !== String(asignacionId))
      );
      
      if (form.id) {
        setRecursosPorEvento(prev => ({
          ...prev,
          [form.id]: prev[form.id]?.filter(r => String(r.id) !== String(asignacionId)) || []
        }));
      }
    } catch (err) {
      toastError(err.message || "Error al quitar recurso del evento");
    }
  };

  // Validar cupo antes de seleccionar usuarios en paso 3
  const validarCupo = (nuevoSeleccionado, esAgregar) => {
    const cupoTotal = Number(form.cupo);
    const inscritosActuales = form.id ? originalInscritos.length : 0;
    let nuevosSeleccionados = seleccionados.length;
    if (esAgregar) {
      nuevosSeleccionados++;
    } else {
      nuevosSeleccionados--;
    }
    const totalInscripciones = inscritosActuales + nuevosSeleccionados;
    if (totalInscripciones > cupoTotal) {
      toastError(`No se puede exceder el cupo máximo de ${cupoTotal} personas.`);
      return false;
    }
    return true;
  };

  const submitEvento = async (e) => {
    e.preventDefault();

    const payload = {
      titulo: form.titulo,
      descripcion: form.descripcion,
      ubicacion: form.ubicacion,
      fecha_inicio: toMySQL(form.fecha_inicio),
      fecha_fin: toMySQL(form.fecha_fin),
      cupo: Number(form.cupo || 0),
      estado: form.estado,
    };

    const resultConfirm = await confirmSave(!!form.id);
    if (!resultConfirm.isConfirmed) return;

    try {
      if (form.id) {
        // 🔹 ACTUALIZAR EVENTO
        const result = await put(`/eventos/${form.id}`, payload);

        // Sincronizar inscripciones
        const inscritosActualesIds = originalInscritos.map((i) => Number(i.user_id));
        const nuevosSeleccionadosIds = seleccionados.map((id) => Number(id));

        const aAgregar = nuevosSeleccionadosIds.filter(
          (id) => !inscritosActualesIds.includes(id)
        );
        const aEliminar = inscritosActualesIds.filter(
          (id) => !nuevosSeleccionadosIds.includes(id)
        );

        if (aAgregar.length > 0) {
          await post(`/inscripciones/admin/${form.id}`, {
            userIds: aAgregar,
          });
        }

        for (const userId of aEliminar) {
          await del(`/inscripciones/evento/${form.id}/user/${userId}`);
        }

        toastSuccess(result.msg || "Evento actualizado correctamente");
      } else {
        // 🔹 CREAR EVENTO
        const result = await post("/eventos", payload);
        const newEventId =
          result?.data?.id ||
          result?.id ||
          result?.evento?.id ||
          result?.data?.evento?.id;

        // Asignar recursos seleccionados
        if (selectedRecursos.length > 0) {
          for (const recurso of selectedRecursos) {
            await post(`/recursos/evento/${newEventId}`, {
              recurso_id: recurso.recurso_id,
              cantidad: recurso.cantidad,
            });
          }
        }

        // Inscribir usuarios seleccionados
        if (seleccionados.length > 0) {
          await post(`/inscripciones/admin/${newEventId}`, {
            userIds: seleccionados.map((id) => Number(id)),
          });
        }

        toastSuccess(result.msg || "Evento creado correctamente");
      }

      cerrarModal();
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

  const cargarFormulario = async (evento) => {
    try {
      setMsg("");

      const usersRes = await get("/users");
      setUsuarios(usersRes.data || []);

      const recursosRes = await get(`/recursos/evento/${evento.id}`);
      const recursosAsignados = recursosRes.data || [];

      const insRes = await get(`/inscripciones/evento/${evento.id}`);
      const inscritos = insRes.data.data || [];

      const inscritosIds = inscritos.map((i) => Number(i.user_id));
      setSeleccionados(inscritosIds);
      setOriginalInscritos(inscritos);

      setForm({
        id: evento.id,
        titulo: evento.titulo || "",
        descripcion: evento.descripcion || "",
        ubicacion: evento.ubicacion || "",
        fecha_inicio: formatFecha(evento.fecha_inicio),
        fecha_fin: formatFecha(evento.fecha_fin),
        cupo: evento.cupo ?? 5,
        estado: evento.estado || "ACTIVO",
      });

      setRecursosActualesEvento(recursosAsignados);
      setSelectedRecursos([]);
      setStep(1);
      setOpenModal(true);
    } catch (err) {
      toastError("Error al cargar evento");
    }
  };

  return (
    <div style={{ marginTop: 20, padding: "0 20px" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 24,
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <h3 style={{ margin: 0, fontSize: 24 }}>Panel Administrativo: Eventos</h3>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={cargar} style={{ padding: "8px 16px", cursor: "pointer" }}>
            Recargar
          </button>
          <button onClick={abrirModalCrear} style={{ padding: "8px 16px", cursor: "pointer" }}>
            + Nuevo evento
          </button>
        </div>
      </div>

      {msg && (
        <div style={{
          padding: "12px 16px",
          marginBottom: 20,
          borderRadius: 8,
          background: msg.includes("✅") ? "rgba(34,197,94,.1)" : "rgba(239,68,68,.1)",
          border: `1px solid ${msg.includes("✅") ? "#22c55e" : "#ef4444"}`,
          color: msg.includes("✅") ? "#86efac" : "#fca5a5"
        }}>
          {msg}
        </div>
      )}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
          gap: 16,
          marginBottom: 24,
        }}
      >
        <input
          type="text"
          placeholder="🔍 Buscar por título..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            padding: "10px 14px",
            borderRadius: 8,
            border: "1px solid #444",
            background: "#1f2937",
            color: "#fff",
          }}
        />

        <select
          value={filtroEstado}
          onChange={(e) => setFiltroEstado(e.target.value)}
          style={{
            padding: "10px 14px",
            borderRadius: 8,
            border: "1px solid #444",
            background: "#1f2937",
            color: "#fff",
            cursor: "pointer",
          }}
        >
          <option value="ACTIVO"> Activos</option>
          <option value="CANCELADO"> Cancelados</option>
          <option value="FINALIZADO"> Finalizados</option>
          <option value="TODOS"> Todos</option>
        </select>

        <select
          value={filtroMes}
          onChange={(e) => setFiltroMes(e.target.value)}
          style={{
            padding: "10px 14px",
            borderRadius: 8,
            border: "1px solid #444",
            background: "#1f2937",
            color: "#fff",
            cursor: "pointer",
          }}
        >
          <option value="TODOS"> Todos los meses</option>
          <option value="1">Enero</option>
          <option value="2">Febrero</option>
          <option value="3">Marzo</option>
          <option value="4">Abril</option>
          <option value="5">Mayo</option>
          <option value="6">Junio</option>
          <option value="7">Julio</option>
          <option value="8">Agosto</option>
          <option value="9">Septiembre</option>
          <option value="10">Octubre</option>
          <option value="11">Noviembre</option>
          <option value="12">Diciembre</option>
        </select>
      </div>

      {/* Grid de eventos */}
      {eventosFiltrados.length === 0 ? (
        <div style={{
          textAlign: "center",
          padding: "60px 20px",
          border: "1px dashed #444",
          borderRadius: 12,
          background: "#1f2937"
        }}>
          <p style={{ fontSize: 16, margin: 0, opacity: 0.7 }}>
            No hay eventos para los filtros seleccionados.
          </p>
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(380px, 1fr))",
            gap: 20,
            alignItems: "start",
          }}
        >
          {eventosFiltrados.map((e) => {
            const estadoVisual = getEstadoVisual(e);
            const puedeEditarEvento = puedeEditar(e);
            const puedeEliminarEvento = puedeEliminar(e);
            const recursosEvento = recursosPorEvento[e.id] || [];
            const isExpanded = expandedEvent === e.id;

            return (
              <div
                key={e.id}
                style={{
                  border: "1px solid #333",
                  borderRadius: 16,
                  padding: 20,
                  background: "#1a1f2e",
                  transition: "transform 0.2s, box-shadow 0.2s",
                  display: "flex",
                  flexDirection: "column",
                  boxShadow: "0 4px 6px rgba(0,0,0,0.3)",
                  opacity: puedeEditarEvento ? 1 : 0.85,
                }}
                onMouseEnter={(ev) => {
                  if (puedeEditarEvento) {
                    ev.currentTarget.style.transform = "translateY(-4px)";
                    ev.currentTarget.style.boxShadow = "0 8px 12px rgba(0,0,0,0.4)";
                    ev.currentTarget.style.borderColor = "#6c4cff";
                  }
                }}
                onMouseLeave={(ev) => {
                  ev.currentTarget.style.transform = "translateY(0)";
                  ev.currentTarget.style.boxShadow = "0 4px 6px rgba(0,0,0,0.3)";
                  ev.currentTarget.style.borderColor = "#333";
                }}
              >
                <div 
                  style={{ 
                    cursor: "pointer",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    marginBottom: 12
                  }}
                  onClick={() => toggleExpand(e.id)}
                >
                  <div style={{ fontWeight: 800, fontSize: 20, color: "#fff", flex: 1 }}>
                    {e.titulo}
                  </div>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <span
                      style={{
                        ...getBadgeStyle(estadoVisual),
                        borderRadius: 999,
                        padding: "4px 12px",
                        fontSize: 12,
                        fontWeight: 600,
                        display: "inline-block",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {estadoVisual}
                    </span>
                    <span style={{ fontSize: 20, color: "#9ca3af" }}>
                      {isExpanded ? "▼" : "▶"}
                    </span>
                  </div>
                </div>

                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 14, color: "#9ca3af", marginBottom: 4 }}>
                     Ubicación
                  </div>
                  <div style={{ fontSize: 15, fontWeight: 500 }}>
                    {e.ubicacion || "Sin ubicación"}
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
                  <div>
                    <div style={{ fontSize: 12, color: "#9ca3af", marginBottom: 4 }}>
                       Inicio
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>
                      {formatFecha(e.fecha_inicio)}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 12, color: "#9ca3af", marginBottom: 4 }}>
                       Fin
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>
                      {formatFecha(e.fecha_fin)}
                    </div>
                  </div>
                </div>

                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 12, color: "#9ca3af", marginBottom: 4 }}>
                     Cupos
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 500 }}>
                    <span style={{ color: "#86efac" }}>{e.cupo}</span> totales |
                    <span style={{ color: "#fbbf24" }}> {e.cupo_usado ?? 0}</span> usados |
                    <span style={{ color: "#60a5fa" }}> {e.cupo_disponible ?? (e.cupo === 0 ? "∞" : "-")}</span> disponibles
                  </div>
                </div>

                {e.descripcion && (
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ fontSize: 12, color: "#9ca3af", marginBottom: 4 }}>
                       Descripción
                    </div>
                    <div style={{ fontSize: 13, color: "#d1d5db", lineHeight: 1.5 }}>
                      {e.descripcion.length > 100 ? `${e.descripcion.substring(0, 100)}...` : e.descripcion}
                    </div>
                  </div>
                )}

                {isExpanded && (
                  <div style={{ 
                    marginTop: 12, 
                    marginBottom: 16,
                    padding: "12px",
                    background: "#111827",
                    borderRadius: 12,
                    border: "1px solid #2d3748"
                  }}>
                    <div style={{ fontSize: 14, color: "#9ca3af", marginBottom: 8, fontWeight: 600 }}>
                       Recursos asignados
                    </div>
                    {recursosEvento.length === 0 ? (
                      <div style={{ fontSize: 13, color: "#9ca3af", textAlign: "center", padding: "8px" }}>
                        No hay recursos asignados a este evento
                      </div>
                    ) : (
                      <div style={{ display: "grid", gap: 8 }}>
                        {recursosEvento.map((recurso) => (
                          <div
                            key={recurso.id}
                            style={{
                              padding: "8px 12px",
                              borderRadius: 8,
                              background: "#1f2937",
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                              fontSize: 13,
                            }}
                          >
                            <div>
                              <strong>{recurso.nombre}</strong>
                              <span style={{ color: "#9ca3af", marginLeft: 8 }}>
                                ({recurso.tipo})
                              </span>
                            </div>
                            <div style={{ color: "#60a5fa" }}>
                              x{recurso.cantidad ?? 1}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                <div style={{ display: "flex", gap: 10, marginTop: "auto", paddingTop: 16 }}>
                  <button
                    onClick={() => puedeEditarEvento ? cargarFormulario(e) : null}
                    disabled={!puedeEditarEvento}
                    style={{
                      flex: 1,
                      padding: "8px 12px",
                      borderRadius: 8,
                      border: "none",
                      background: puedeEditarEvento ? "#6c4cff" : "#4b5563",
                      color: "white",
                      cursor: puedeEditarEvento ? "pointer" : "not-allowed",
                      fontWeight: 500,
                      transition: "background 0.2s",
                      opacity: puedeEditarEvento ? 1 : 0.6,
                    }}
                    onMouseEnter={(ev) => {
                      if (puedeEditarEvento) {
                        ev.currentTarget.style.background = "#5a3ee0";
                      }
                    }}
                    onMouseLeave={(ev) => {
                      if (puedeEditarEvento) {
                        ev.currentTarget.style.background = "#6c4cff";
                      }
                    }}
                    title={!puedeEditarEvento ? "No se pueden editar eventos finalizados o cancelados" : "Editar evento"}
                  >
                     {puedeEditarEvento ? "Editar" : "No editable"}
                  </button>

                  <button
                    onClick={() => puedeEliminarEvento ? eliminarEvento(e.id, e.titulo) : null}
                    disabled={!puedeEliminarEvento}
                    style={{
                      flex: 1,
                      padding: "8px 12px",
                      borderRadius: 8,
                      border: "none",
                      background: puedeEliminarEvento ? "#dc2626" : "#4b5563",
                      color: "white",
                      cursor: puedeEliminarEvento ? "pointer" : "not-allowed",
                      fontWeight: 500,
                      transition: "background 0.2s",
                      opacity: puedeEliminarEvento ? 1 : 0.6,
                    }}
                    onMouseEnter={(ev) => {
                      if (puedeEliminarEvento) {
                        ev.currentTarget.style.background = "#b91c1c";
                      }
                    }}
                    onMouseLeave={(ev) => {
                      if (puedeEliminarEvento) {
                        ev.currentTarget.style.background = "#dc2626";
                      }
                    }}
                    title={!puedeEliminarEvento ? "No se pueden eliminar eventos finalizados o cancelados" : "Eliminar evento"}
                  >
                     {puedeEliminarEvento ? "Eliminar" : "No eliminar"}
                  </button>
                </div>

                {!puedeEditarEvento && (
                  <div style={{
                    marginTop: 12,
                    fontSize: 11,
                    color: "#fbbf24",
                    textAlign: "center",
                    padding: "6px",
                    background: "rgba(251,191,36,.1)",
                    borderRadius: 6,
                  }}>
                     Este evento no puede ser modificado
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modal */}
      {openModal && (
        <div
          onClick={cerrarModal}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.85)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            padding: 20,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "100%",
              maxWidth: 820,
              maxHeight: "90vh",
              overflowY: "auto",
              borderRadius: 20,
              border: "1px solid #444",
              padding: 24,
              background: "#111827",
              boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 20,
                gap: 10,
              }}
            >
              <h4 style={{ margin: 0, fontSize: 22 }}>
                {form.id ? " Editar evento" : "➕ Crear evento"}
              </h4>

              <button
                type="button"
                onClick={cerrarModal}
                style={{
                  background: "transparent",
                  border: "none",
                  fontSize: 24,
                  cursor: "pointer",
                  color: "#9ca3af",
                }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={submitEvento} style={{ display: "grid", gap: 16 }}>
              <div
                style={{
                  display: "flex",
                  gap: 8,
                  marginBottom: 10,
                  alignItems: "center",
                  flexWrap: "wrap",
                }}
              >
                {[
                  "1. Datos del evento",
                  "2. Recursos",
                  "3  Agregar usuario",
                  "4. Confirmación",
                ].map((label, index) => (
                  <div
                    key={label}
                    style={{
                      padding: "6px 14px",
                      borderRadius: 20,
                      background: step === index + 1 ? "#6c4cff" : "#2a2a2a",
                      color: "#fff",
                      fontSize: 13,
                      fontWeight: 600,
                    }}
                  >
                    {label}
                  </div>
                ))}
              </div>

              {step === 1 && (
                <>
                  <input
                    placeholder="Título del evento"
                    value={form.titulo}
                    onChange={(e) => onChange("titulo", e.target.value)}
                    style={{
                      padding: "10px 14px",
                      borderRadius: 8,
                      border: "1px solid #444",
                      background: "#1f2937",
                      color: "#fff",
                    }}
                  />

                 <select
  value={mostrarNuevaUbicacion ? "NUEVA" : form.ubicacion}
  onChange={(e) => {
    const value = e.target.value;

    if (value === "NUEVA") {
      setMostrarNuevaUbicacion(true);
      setNuevaUbicacion("");
      onChange("ubicacion", "");
    } else {
      setMostrarNuevaUbicacion(false);
      onChange("ubicacion", value);
    }
  }}
  style={{
    padding: "10px 14px",
    borderRadius: 8,
    border: "1px solid #444",
    background: "#1f2937",
    color: "#fff",
    cursor: "pointer",
  }}
>
  <option value="">Seleccionar ubicación</option>
  <option value="Auditorio">Auditorio</option>
  <option value="Sala 1">Sala 1</option>
  <option value="Sala 2">Sala 2</option>
  <option value="Sala de conferencias">Sala de conferencias</option>

  <option value="NUEVA">
    ➕ Agregar nueva ubicación...
  </option>
</select>

{mostrarNuevaUbicacion && (
  <input
    type="text"
    placeholder="Escriba la nueva ubicación"
    value={nuevaUbicacion}
    onChange={(e) => {
      const value = e.target.value;
      setNuevaUbicacion(value);
      onChange("ubicacion", value);
    }}
    style={{
      padding: "10px 14px",
      borderRadius: 8,
      border: "1px solid #444",
      background: "#1f2937",
      color: "#fff",
    }}
  />
)}

                  <textarea
                    placeholder="Descripción del evento"
                    value={form.descripcion}
                    onChange={(e) => onChange("descripcion", e.target.value)}
                    style={{
                      minHeight: 90,
                      padding: "10px 14px",
                      borderRadius: 8,
                      border: "1px solid #444",
                      background: "#1f2937",
                      color: "#fff",
                      resize: "vertical",
                    }}
                  />

                  <label style={{ fontSize: 13, opacity: 0.8, fontWeight: 500 }}> Fecha inicio</label>
                  <input
                    type="datetime-local"
                    value={form.fecha_inicio}
                    min={minDate}
                    onChange={(e) => onChange("fecha_inicio", e.target.value)}
                    style={{
                      padding: "10px 14px",
                      borderRadius: 8,
                      border: "1px solid #444",
                      background: "#1f2937",
                      color: "#fff",
                    }}
                  />

                  <label style={{ fontSize: 13, opacity: 0.8, fontWeight: 500 }}> Fecha fin</label>
                  <input
                    type="datetime-local"
                    value={form.fecha_fin}
                    min={minDate}
                    onChange={(e) => onChange("fecha_fin", e.target.value)}
                    style={{
                      padding: "10px 14px",
                      borderRadius: 8,
                      border: "1px solid #444",
                      background: "#1f2937",
                      color: "#fff",
                    }}
                  />

                  <label style={{ fontSize: 13, opacity: 0.8, fontWeight: 500 }}> Cupos disponibles</label>
                  <input
                    type="number"
                    placeholder="Cupo"
                    value={form.cupo}
                    min="5"
                    onChange={(e) => onChange("cupo", e.target.value)}
                    style={{
                      padding: "10px 14px",
                      borderRadius: 8,
                      border: "1px solid #444",
                      background: "#1f2937",
                      color: "#fff",
                    }}
                  />

                  <label style={{ fontSize: 13, opacity: 0.8, fontWeight: 500 }}>📌 Estado</label>
                  <select
                    value={form.estado}
                    onChange={(e) => onChange("estado", e.target.value)}
                    style={{
                      padding: "10px 14px",
                      borderRadius: 8,
                      border: "1px solid #444",
                      background: "#1f2937",
                      color: "#fff",
                      cursor: "pointer",
                    }}
                  >
                    <option value="ACTIVO">ACTIVO</option>
                    <option value="CANCELADO">CANCELADO</option>
                  </select>

                  <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
                    <button type="button" onClick={continuarPaso1} style={{ flex: 1, padding: "10px" }}>
                      Continuar →
                    </button>
                    <button type="button" onClick={cerrarModal} style={{ flex: 1, padding: "10px", background: "#374151" }}>
                      Cancelar
                    </button>
                  </div>
                </>
              )}

              {step === 2 && (
                <>
                  {!form.id ? (
                    <>
                      <div style={{ fontSize: 14, opacity: 0.9, padding: "8px 0" }}>
                        Selecciona los recursos que deseas asignar al evento al momento de crearlo.
                      </div>

                      {recursos.length === 0 ? (
                        <p>No hay recursos disponibles.</p>
                      ) : (
                        <div style={{ display: "grid", gap: 8, maxHeight: 300, overflowY: "auto" }}>
                          {recursos.map((recurso) => {
                            const seleccionado = selectedRecursos.some(
                              (r) => r.recurso_id === recurso.id
                            );

                            return (
                              <button
                                key={recurso.id}
                                type="button"
                                onClick={() => toggleRecurso(recurso)}
                                style={{
                                  textAlign: "left",
                                  padding: 12,
                                  borderRadius: 12,
                                  border: seleccionado
                                    ? "2px solid #6c4cff"
                                    : "1px solid #555",
                                  background: seleccionado
                                    ? "rgba(108,76,255,.12)"
                                    : "transparent",
                                  color: "#fff",
                                  cursor: "pointer",
                                  transition: "all 0.2s",
                                }}
                              >
                                <b>{recurso.nombre}</b> — {recurso.tipo}
                              </button>
                            );
                          })}
                        </div>
                      )}

                      <div
                        style={{
                          border: "1px solid #555",
                          borderRadius: 12,
                          padding: 12,
                          background: "#1f2937",
                        }}
                      >
                        <b> Seleccionados:</b>{" "}
                        {selectedRecursos.length === 0
                          ? "Ninguno"
                          : selectedRecursos.map((r) => r.nombre).join(", ")}
                      </div>
                    </>
                  ) : (
                    <>
                      <div style={{ fontSize: 14, opacity: 0.9, padding: "8px 0" }}>
                        Recursos actualmente asignados al evento.
                      </div>

                      {recursosActualesEvento.length === 0 ? (
                        <p>Este evento no tiene recursos asignados.</p>
                      ) : (
                        <div style={{ display: "grid", gap: 8 }}>
                          {recursosActualesEvento.map((r) => (
                            <div
                              key={r.id}
                              style={{
                                padding: 12,
                                borderRadius: 12,
                                border: "1px solid #555",
                                background: "#1f2937",
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                gap: 10,
                              }}
                            >
                              <div>
                                <b>{r.nombre}</b> — {r.tipo} x{r.cantidad ?? 1}
                              </div>

                              <button
                                type="button"
                                onClick={() => quitarRecursoDeEvento(r.id)}
                                style={{
                                  background: "#dc2626",
                                  color: "#fff",
                                  border: "none",
                                  padding: "8px 12px",
                                  borderRadius: 8,
                                  cursor: "pointer",
                                }}
                              >
                                Quitar
                              </button>
                            </div>
                          ))}
                        </div>
                      )}

                      <div style={{ fontSize: 14, opacity: 0.9, padding: "12px 0 8px" }}>
                        Agregar nuevos recursos al evento.
                      </div>

                      {recursos.filter((r) => !recursoYaAsignado(r.id)).length === 0 ? (
                        <p>No hay más recursos disponibles para agregar.</p>
                      ) : (
                        <div style={{ display: "grid", gap: 8, maxHeight: 240, overflowY: "auto" }}>
                          {recursos
                            .filter((r) => !recursoYaAsignado(r.id))
                            .map((recurso) => (
                              <div
                                key={recurso.id}
                                style={{
                                  padding: 12,
                                  borderRadius: 12,
                                  border: "1px solid #555",
                                  background: "#111827",
                                  display: "flex",
                                  justifyContent: "space-between",
                                  alignItems: "center",
                                  gap: 10,
                                }}
                              >
                                <div>
                                  <b>{recurso.nombre}</b> — {recurso.tipo}
                                </div>

                                <button
                                  type="button"
                                  onClick={() => agregarRecursoAEventoExistente(recurso)}
                                  style={{
                                    background: "#6c4cff",
                                    color: "#fff",
                                    border: "none",
                                    padding: "8px 12px",
                                    borderRadius: 8,
                                    cursor: "pointer",
                                  }}
                                >
                                  Agregar
                                </button>
                              </div>
                            ))}
                        </div>
                      )}
                    </>
                  )}

                  <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
                    <button type="button" onClick={prevStep} style={{ flex: 1, padding: "10px" }}>
                      ← Atrás
                    </button>
                    <button type="button" onClick={continuarPaso2} style={{ flex: 1, padding: "10px" }}>
                      Continuar →
                    </button>
                  </div>
                </>
              )}

              {step === 3 && (
                <>
                  <div style={{ fontSize: 16, marginBottom: 10 }}>
                    👥 Agregar clientes al evento
                  </div>

                  {usuarios.length === 0 ? (
                    <p>No hay usuarios disponibles.</p>
                  ) : (
                    <div style={{ display: "grid", gap: 8, maxHeight: 300, overflowY: "auto" }}>
                      {usuarios.map((user) => {
                        const seleccionado = seleccionados.includes(Number(user.id));

                        return (
                          <button
                            key={user.id}
                            type="button"
                            onClick={() => {
                              const idNum = Number(user.id);
                              const esAgregar = !seleccionado;
                              if (esAgregar && !validarCupo(idNum, true)) return;
                              if (!esAgregar && !validarCupo(idNum, false)) return;
                              setSeleccionados((prev) => {
                                if (prev.includes(idNum)) {
                                  return prev.filter((x) => x !== idNum);
                                } else {
                                  return [...prev, idNum];
                                }
                              });
                            }}
                            style={{
                              textAlign: "left",
                              padding: 12,
                              borderRadius: 12,
                              border: seleccionado
                                ? "2px solid #6c4cff"
                                : "1px solid #555",
                              background: seleccionado
                                ? "rgba(108,76,255,.12)"
                                : "transparent",
                              color: "#fff",
                              cursor: "pointer",
                            }}
                          >
                            <b>{user.nombre}</b>
                            <div style={{ fontSize: 12, opacity: 0.7 }}>
                              {user.email}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  <div style={{ marginTop: 10 }}>
                    <b>Seleccionados:</b>{" "}
                    {seleccionados.length === 0
                      ? "Ninguno"
                      : seleccionados.length + " cliente(s)"}
                  </div>

                  <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
                    <button type="button" onClick={prevStep} style={{ flex: 1 }}>
                      ← Atrás
                    </button>

                    <button type="button" onClick={() => setStep(4)} style={{ flex: 1 }}>
                      Continuar →
                    </button>
                  </div>
                </>
              )}

              {step === 4 && (
                <>
                  <div
                    style={{
                      border: "1px solid #555",
                      borderRadius: 12,
                      padding: 16,
                      display: "grid",
                      gap: 12,
                      background: "#1f2937",
                    }}
                  >
                    <div><b> Título:</b> {form.titulo || "-"}</div>
                    <div><b> Ubicación:</b> {form.ubicacion || "-"}</div>
                    <div><b> Descripción:</b> {form.descripcion || "-"}</div>
                    <div><b> Fecha inicio:</b> {form.fecha_inicio || "-"}</div>
                    <div><b> Fecha fin:</b> {form.fecha_fin || "-"}</div>
                    <div><b> Cupo:</b> {form.cupo || "-"}</div>
                    <div><b> Estado:</b> {form.estado || "-"}</div>

                    <div>
                      <b> Recursos:</b>{" "}
                      {!form.id
                        ? (selectedRecursos.length === 0
                            ? "Ninguno"
                            : selectedRecursos.map(r => r.nombre).join(", ")
                          )
                        : (recursosActualesEvento.length === 0
                            ? "Ninguno"
                            : recursosActualesEvento.map(r => r.nombre).join(", ")
                          )
                      }
                    </div>

                    <div>
                      <b>Clientes seleccionados:</b>{" "}
                      {seleccionados.length === 0
                        ? "Ninguno"
                        : seleccionados
                            .map(id => {
                              const user = usuarios.find(u => Number(u.id) === Number(id));
                              return user ? user.nombre : `ID ${id}`;
                            })
                            .join(", ")
                      }
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
                    <button type="button" onClick={prevStep} style={{ flex: 1 }}>
                      ← Atrás
                    </button>

                    <button type="submit" style={{ flex: 1, background: "#6c4cff" }}>
                      {form.id ? "Guardar cambios" : "Crear evento"}
                    </button>
                  </div>
                </>
              )}
            </form>
          </div>
        </div>
      )}
    </div>
  );
}