import { useEffect, useState } from "react";
import { get, del } from "../api";

export default function MisInscripciones({ user }) {
  const [items, setItems] = useState([]);
  const [msg, setMsg] = useState("");

  const cargar = async () => {
    setMsg("");
    try {
      const result = await get("/inscripciones/mis-inscripciones");
      setItems(result.data || []);
    } catch (err) {
      setMsg("❌ " + (err.message || "Error al cargar inscripciones"));
    }
  };

  useEffect(() => {
    if (user.rol === "CLIENTE") cargar();
  }, []);

  const cancelar = async (eventoId) => {
    setMsg("");
    try {
      const result = await del(`/inscripciones/${eventoId}`);
      setMsg("✅ " + result.msg);
      await cargar();
    } catch (err) {
      setMsg("❌ " + (err.message || "Error al cancelar inscripción"));
    }
  };

  if (user.rol !== "CLIENTE") return null;

  return (
    <div style={{ marginTop: 20 }}>
      <h3>Mis inscripciones</h3>
      <button onClick={cargar} style={{ padding: 8, marginBottom: 10 }}>
        Recargar
      </button>

      {msg && <p>{msg}</p>}

      {items.length === 0 ? (
        <p>No tenés inscripciones.</p>
      ) : (
        <div style={{ display: "grid", gap: 10 }}>
          {items.map((x) => (
            <div key={x.id} style={{ border: "1px solid #ddd", borderRadius: 10, padding: 12 }}>
              <b>{x.titulo}</b>
              <p style={{ margin: "6px 0" }}>
                Estado: <b>{x.estado}</b>
              </p>
              <p style={{ margin: "6px 0" }}>
                Inicio: {String(x.fecha_inicio)} <br />
                Fin: {String(x.fecha_fin)}
              </p>

              {x.estado === "ACTIVA" && (
                <button onClick={() => cancelar(x.evento_id)} style={{ padding: 8 }}>
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
