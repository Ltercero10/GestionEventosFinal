import { useEffect, useState } from "react";
import { get, post, put, del } from "../api";

export default function RecursosAdmin({ user }) {
  const [recursos, setRecursos] = useState([]);
  const [eventos, setEventos] = useState([]);
  const [nombre, setNombre] = useState("");
  const [tipo, setTipo] = useState("");
  const [eventoId, setEventoId] = useState("");
  const [recursoId, setRecursoId] = useState("");
  const [msg, setMsg] = useState("");
  const [editandoId, setEditandoId] = useState(null);

  const cargar = async () => {
    setMsg("");
    try {
      const r = await get("/recursos");
      setRecursos(r.data || []);

      const e = await get("/eventos");
      setEventos(e.data || []);
    } catch (err) {
      setMsg("❌ " + (err.message || "Error al cargar datos"));
    }
  };

  useEffect(() => {
    if (user.rol === "ADMIN") cargar();
  }, []);

  const crearRecurso = async () => {
    if (!nombre.trim() || !tipo.trim()) {
      setMsg("❌ Nombre y tipo son obligatorios");
      return;
    }

    try {
      if (editandoId) {
        const result = await put(`/recursos/${editandoId}`, {
          nombre,
          tipo,
        });

        setMsg("✅ " + result.msg);
        setEditandoId(null);
      } else {
        const result = await post("/recursos", {
          nombre,
          tipo,
        });

        setMsg("✅ " + result.msg);
      }

      setNombre("");
      setTipo("");
      await cargar();
    } catch (err) {
      setMsg("❌ " + (err.message || "Error"));
    }
  };

  const asignar = async () => {
    if (!eventoId || !recursoId) {
      setMsg("❌ Debes seleccionar evento y recurso");
      return;
    }

    try {
      const result = await post(`/recursos/evento/${eventoId}`, {
        recurso_id: recursoId,
        cantidad: 1,
      });

      setMsg("✅ " + result.msg);
    } catch (err) {
      setMsg("❌ " + (err.message || "Error"));
    }
  };

  const eliminarRecurso = async (id) => {
    const ok = confirm("¿Eliminar este recurso?");
    if (!ok) return;

    try {
      const result = await del(`/recursos/${id}`);
      setMsg("✅ " + result.msg);
      await cargar();
    } catch (err) {
      setMsg("❌ " + (err.message || "Error"));
    }
  };

  const editarRecurso = (recurso) => {
    setNombre(recurso.nombre);
    setTipo(recurso.tipo);
    setEditandoId(recurso.id);
  };

  if (user.rol !== "ADMIN") return null;

  return (
    <div style={{ marginTop: 20 }}>
      <h3>Recursos</h3>

      {msg && <p>{msg}</p>}

      <div style={{ border: "1px solid #444", padding: 12, borderRadius: 12 }}>
        <h4>{editandoId ? "Editar recurso" : "Crear recurso"}</h4>

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
      </div>

      <div
        style={{
          border: "1px solid #444",
          padding: 12,
          borderRadius: 12,
          marginTop: 12,
        }}
      >
        <h4>Asignar recurso a evento</h4>

        <select value={eventoId} onChange={(e) => setEventoId(e.target.value)}>
          <option value="">Evento</option>
          {eventos.map((e) => (
            <option key={e.id} value={e.id}>
              {e.titulo}
            </option>
          ))}
        </select>

        <select
          value={recursoId}
          onChange={(e) => setRecursoId(e.target.value)}
          style={{ marginLeft: 8 }}
        >
          <option value="">Recurso</option>
          {recursos.map((r) => (
            <option key={r.id} value={r.id}>
              {r.nombre}
            </option>
          ))}
        </select>

        <button onClick={asignar} style={{ marginLeft: 8 }}>
          Asignar
        </button>
      </div>

      <div style={{ marginTop: 12 }}>
        <h4>Recursos existentes</h4>

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
                onClick={() => eliminarRecurso(r.id)}
                style={{ background: "#ff4d4f", color: "white" }}
              >
                Eliminar
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}