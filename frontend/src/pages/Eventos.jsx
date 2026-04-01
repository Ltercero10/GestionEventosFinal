import { useEffect, useState } from "react";
import { get, post } from "../api";
import { formatFecha } from "../utils/dateformat";
import { toastSuccess, toastError, confirmDialog } from "../utils/alerts";

export default function Eventos({ user }) {
  const [eventos, setEventos] = useState([]);
  const [msg, setMsg] = useState("");
  const [filtroTiempo, setFiltroTiempo] = useState("proximos"); // proximos, hoy, manana, semana
  const [expandedEvent, setExpandedEvent] = useState(null);

  const [recursosPorEvento, setRecursosPorEvento] = useState({});

  // Función para verificar si un evento es próximo (fecha futura)
  const esProximo = (evento) => {
    if (!evento?.fecha_inicio) return false;
    const fechaInicio = new Date(String(evento.fecha_inicio).replace(" ", "T"));
    const ahora = new Date();
    return fechaInicio > ahora;
  };

  // Función para verificar si un evento es hoy
  const esHoy = (evento) => {
    if (!evento?.fecha_inicio) return false;
    const fechaInicio = new Date(String(evento.fecha_inicio).replace(" ", "T"));
    const hoy = new Date();
    return fechaInicio.toDateString() === hoy.toDateString();
  };

  // Función para verificar si un evento es mañana
  const esManana = (evento) => {
    if (!evento?.fecha_inicio) return false;
    const fechaInicio = new Date(String(evento.fecha_inicio).replace(" ", "T"));
    const manana = new Date();
    manana.setDate(manana.getDate() + 1);
    return fechaInicio.toDateString() === manana.toDateString();
  };

  // Función para verificar si un evento es en los próximos 7 días
  const esEstaSemana = (evento) => {
    if (!evento?.fecha_inicio) return false;
    const fechaInicio = new Date(String(evento.fecha_inicio).replace(" ", "T"));
    const hoy = new Date();
    const dentroDe7Dias = new Date();
    dentroDe7Dias.setDate(hoy.getDate() + 7);
    return fechaInicio > hoy && fechaInicio <= dentroDe7Dias;
  };

  const filtrarEventos = () => {
    let eventosFiltrados = eventos.filter(e => e.estado === "ACTIVO");
    
    switch(filtroTiempo) {
      case "hoy":
        return eventosFiltrados.filter(esHoy);
      case "manana":
        return eventosFiltrados.filter(esManana);
      case "semana":
        return eventosFiltrados.filter(esEstaSemana);
      case "proximos":
      default:
        return eventosFiltrados.filter(esProximo);
    }
  };

  const eventosFiltrados = filtrarEventos();

  const cargar = async () => {
    setMsg("");
    try {
      const result = await get("/eventos");
      setEventos(result.data || []);
    } catch (err) {
      setMsg("❌ " + (err.message || "Error al cargar eventos"));
      toastError(err.message || "Error al cargar eventos");
    }
  };

  useEffect(() => {
    cargar();
  }, []);

  const inscribirme = async (eventoId, titulo) => {
    setMsg("");

    const resultConfirm = await confirmDialog({
      title: "¿Inscribirte al evento?",
      text: `Te inscribirás en "${titulo}".`,
      icon: "question",
      confirmButtonText: "Sí, inscribirme",
      cancelButtonText: "Cancelar",
    });

    if (!resultConfirm.isConfirmed) return;

    try {
      const result = await post(`/inscripciones/${eventoId}`);
      setMsg("✅ " + result.msg);
      toastSuccess(result.msg || "Inscripción realizada correctamente");
      await cargar();
    } catch (err) {
      setMsg("❌ " + (err.message || "Error al inscribirse"));
      toastError(err.message || "Error al inscribirse");
    }
  };

  const toggleRecursos = async (eventoId) => {
    setMsg("");

    if (expandedEvent === eventoId) {
      setExpandedEvent(null);
      return;
    }

    setExpandedEvent(eventoId);

    if (recursosPorEvento[eventoId]) return;

    try {
      const result = await get(`/recursos/evento/${eventoId}`);
      setRecursosPorEvento((prev) => ({
        ...prev,
        [eventoId]: result.data || [],
      }));
    } catch (err) {
      setMsg("❌ " + (err.message || "Error al cargar recursos"));
      toastError(err.message || "Error al cargar recursos");
    }
  };

  const getBadgeStyle = (tipo) => {
    switch(tipo) {
      case "hoy":
        return {
          background: "rgba(34,197,94,.18)",
          color: "#86efac",
          border: "1px solid rgba(34,197,94,.35)",
        };
      case "manana":
        return {
          background: "rgba(59,130,246,.18)",
          color: "#93c5fd",
          border: "1px solid rgba(59,130,246,.35)",
        };
      default:
        return {
          background: "rgba(251,191,36,.18)",
          color: "#fbbf24",
          border: "1px solid rgba(251,191,36,.35)",
        };
    }
  };

  const getTipoEvento = (evento) => {
    if (esHoy(evento)) return "HOY";
    if (esManana(evento)) return "MAÑANA";
    if (esEstaSemana(evento)) return "ESTA SEMANA";
    return "PRÓXIMO";
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
        <h3 style={{ margin: 0, fontSize: 24 }}>Eventos Próximos</h3>

        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={cargar} style={{ padding: "8px 16px", cursor: "pointer" }}>
            Recargar
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

      {/* Filtros por tiempo */}
      <div
        style={{
          display: "flex",
          gap: 12,
          marginBottom: 24,
          flexWrap: "wrap",
        }}
      >
        <button
          onClick={() => setFiltroTiempo("proximos")}
          style={{
            padding: "8px 20px",
            borderRadius: 20,
            border: "none",
            background: filtroTiempo === "proximos" ? "#6c4cff" : "#2a2a2a",
            color: "#fff",
            cursor: "pointer",
            fontWeight: 500,
            transition: "all 0.2s",
          }}
        >
           Próximos
        </button>
        <button
          onClick={() => setFiltroTiempo("hoy")}
          style={{
            padding: "8px 20px",
            borderRadius: 20,
            border: "none",
            background: filtroTiempo === "hoy" ? "#6c4cff" : "#2a2a2a",
            color: "#fff",
            cursor: "pointer",
            fontWeight: 500,
            transition: "all 0.2s",
          }}
        >
           Hoy
        </button>
        <button
          onClick={() => setFiltroTiempo("manana")}
          style={{
            padding: "8px 20px",
            borderRadius: 20,
            border: "none",
            background: filtroTiempo === "manana" ? "#6c4cff" : "#2a2a2a",
            color: "#fff",
            cursor: "pointer",
            fontWeight: 500,
            transition: "all 0.2s",
          }}
        >
           Mañana
        </button>
        <button
          onClick={() => setFiltroTiempo("semana")}
          style={{
            padding: "8px 20px",
            borderRadius: 20,
            border: "none",
            background: filtroTiempo === "semana" ? "#6c4cff" : "#2a2a2a",
            color: "#fff",
            cursor: "pointer",
            fontWeight: 500,
            transition: "all 0.2s",
          }}
        >
           Esta semana
        </button>
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
            No hay eventos para el filtro seleccionado.
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
            const isExpanded = expandedEvent === e.id;
            const tipoEvento = getTipoEvento(e);
            const badgeStyle = getBadgeStyle(
              tipoEvento === "HOY" ? "hoy" : tipoEvento === "MAÑANA" ? "manana" : "semana"
            );

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
                }}
                onMouseEnter={(ev) => {
                  ev.currentTarget.style.transform = "translateY(-4px)";
                  ev.currentTarget.style.boxShadow = "0 8px 12px rgba(0,0,0,0.4)";
                  ev.currentTarget.style.borderColor = "#6c4cff";
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
                  onClick={() => toggleRecursos(e.id)}
                >
                  <div style={{ fontWeight: 800, fontSize: 20, color: "#fff", flex: 1 }}>
                    {e.titulo}
                  </div>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <span
                      style={{
                        ...badgeStyle,
                        borderRadius: 999,
                        padding: "4px 12px",
                        fontSize: 12,
                        fontWeight: 600,
                        display: "inline-block",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {tipoEvento}
                    </span>
                    <span style={{ fontSize: 20, color: "#9ca3af" }}>
                      {isExpanded ? "▼" : "▶"}
                    </span>
                  </div>
                </div>

                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 14, color: "#9ca3af", marginBottom: 4 }}>
                    📍 Ubicación
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

                {/* Sección desplegable de recursos */}
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
                    {(recursosPorEvento[e.id] || []).length === 0 ? (
                      <div style={{ fontSize: 13, color: "#9ca3af", textAlign: "center", padding: "8px" }}>
                        No hay recursos asignados a este evento
                      </div>
                    ) : (
                      <div style={{ display: "grid", gap: 8 }}>
                        {recursosPorEvento[e.id].map((recurso) => (
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

                {user.rol === "CLIENTE" && (
                  <button
                    onClick={() => inscribirme(e.id, e.titulo)}
                    disabled={e.cupo_disponible === 0}
                    style={{
                      width: "100%",
                      padding: "10px",
                      borderRadius: 8,
                      border: "none",
                      background: e.cupo_disponible === 0 ? "#4b5563" : "#6c4cff",
                      color: "white",
                      cursor: e.cupo_disponible === 0 ? "not-allowed" : "pointer",
                      fontWeight: 500,
                      transition: "background 0.2s",
                      marginTop: "auto",
                    }}
                    onMouseEnter={(ev) => {
                      if (e.cupo_disponible !== 0) {
                        ev.currentTarget.style.background = "#5a3ee0";
                      }
                    }}
                    onMouseLeave={(ev) => {
                      if (e.cupo_disponible !== 0) {
                        ev.currentTarget.style.background = "#6c4cff";
                      }
                    }}
                    title={e.cupo_disponible === 0 ? "No hay cupos disponibles" : "Inscribirse al evento"}
                  >
                    {e.cupo_disponible === 0 ? "❌ Sin cupos" : "✅ Inscribirme"}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}