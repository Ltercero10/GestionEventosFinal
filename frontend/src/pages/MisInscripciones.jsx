import { useEffect, useState } from "react";
import { get, del } from "../api";
import { toastSuccess, toastError, confirmDialog } from "../utils/alerts";

export default function MisInscripciones({ user }) {
  const [items, setItems] = useState([]);
  const [msg, setMsg] = useState("");

  const cargar = async () => {
    setMsg("");
    try {
      const result = await get("/inscripciones/mis-inscripciones");
      setItems(result.data || []);
    } catch (err) {
      const message = err.message || "Error al cargar inscripciones";
      setMsg("❌ " + message);
      toastError(message);
    }
  };

  useEffect(() => {
    if (user.rol === "CLIENTE") cargar();
  }, []);

  const cancelar = async (eventoId, titulo) => {
    setMsg("");

    const resultConfirm = await confirmDialog({
      title: "¿Cancelar inscripción?",
      text: `Se cancelará tu inscripción en "${titulo}".`,
      icon: "warning",
      confirmButtonText: "Sí, cancelar",
      cancelButtonText: "Volver",
      confirmButtonColor: "#d33",
    });

    if (!resultConfirm.isConfirmed) return;

    try {
      const result = await del(`/inscripciones/${eventoId}`);
      setMsg("✅ " + result.msg);
      toastSuccess(result.msg || "Inscripción cancelada correctamente");
      await cargar();
    } catch (err) {
      const message = err.message || "Error al cancelar inscripción";
      setMsg("❌ " + message);
      toastError(message);
    }
  };

  if (user.rol !== "CLIENTE") return null;

  return (
    <div style={{ marginTop: 20 }}>
      <h2 style={{ fontSize: "28px", fontWeight: "800", marginBottom: 10 }}>
        Mis inscripciones
      </h2>

      <button
        onClick={cargar}
        style={{
          padding: "10px 16px",
          borderRadius: 12,
          border: "none",
          color: "#fff",
          fontWeight: "bold",
          cursor: "pointer",
          marginBottom: 20,
          background: "linear-gradient(90deg, #7c4dff, #24c6dc)",
        }}
      >
        Recargar
      </button>

      {msg && <p>{msg}</p>}

      {items.length === 0 ? (
        <p>No tenés inscripciones.</p>
      ) : (
        <div style={{ display: "grid", gap: 20 }}>
          {items.map((x) => (
            <div
              key={x.id}
              style={{
                background: "rgba(18, 24, 45, 0.9)",
                borderRadius: 20,
                padding: 20,
                boxShadow: "0 10px 30px rgba(0,0,0,0.4)",
                border: "1px solid rgba(255,255,255,0.08)",
                color: "#fff",
                maxWidth: 700,
              }}
            >
              {/* HEADER */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 15,
                }}
              >
                <h3 style={{ margin: 0, fontSize: 22 }}>
                  {x.titulo}
                </h3>

                <span
                  style={{
                    padding: "6px 12px",
                    borderRadius: 20,
                    border: "1px solid #d4a017",
                    color: "#facc15",
                    fontWeight: "bold",
                    fontSize: 12,
                  }}
                >
                  INSCRITO
                </span>
              </div>

              {/* ESTADO */}
              <p style={{ margin: "6px 0", color: "#9ca3af" }}>
                Estado
              </p>
              <p style={{ margin: "0 0 10px", fontWeight: "bold" }}>
                {x.estado}
              </p>

              {/* FECHAS */}
              <div style={{ display: "flex", gap: 40, marginBottom: 20 }}>
                <div>
                  <p style={{ color: "#9ca3af", margin: 0 }}>Inicio</p>
                  <p style={{ fontWeight: "bold", margin: 0 }}>
                    {new Date(x.fecha_inicio).toLocaleString()}
                  </p>
                </div>

                <div>
                  <p style={{ color: "#9ca3af", margin: 0 }}>Fin</p>
                  <p style={{ fontWeight: "bold", margin: 0 }}>
                    {new Date(x.fecha_fin).toLocaleString()}
                  </p>
                </div>
              </div>

              {/* BOTÓN */}
              {x.estado === "ACTIVA" && (
                <button
                  onClick={() => cancelar(x.evento_id, x.titulo)}
                  style={{
                    width: "100%",
                    padding: 12,
                    borderRadius: 12,
                    border: "none",
                    color: "#fff",
                    fontWeight: "bold",
                    cursor: "pointer",
                    background:
                      "linear-gradient(90deg, #7c4dff, #5b6cff, #24c6dc)",
                  }}
                >
                  Cancelar inscripción
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}