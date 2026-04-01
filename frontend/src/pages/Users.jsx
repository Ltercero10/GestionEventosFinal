import { useEffect, useState } from "react";
import Swal from "sweetalert2";
import { get, post, put, del } from "../api";

const initialForm = {
  id: null,
  nombre: "",
  email: "",
  password: "",
  rol: "CLIENTE",
};

const toast = Swal.mixin({
  toast: true,
  position: "top-end",
  showConfirmButton: false,
  timer: 2500,
  timerProgressBar: true,
});

export default function UsuariosAdmin() {
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [formError, setFormError] = useState("");
  const [form, setForm] = useState(initialForm);
  const [editando, setEditando] = useState(false);
  const [openModal, setOpenModal] = useState(false);

  const resetForm = () => {
    setForm(initialForm);
    setEditando(false);
    setFormError("");
  };

  const abrirModalCrear = () => {
    resetForm();
    setOpenModal(true);
  };

  const cerrarModal = () => {
    setOpenModal(false);
    resetForm();
  };

  const cargarUsuarios = async () => {
    try {
      setLoading(true);
      setError("");

      const result = await get("/users");
      setUsuarios(result.data || []);
    } catch (err) {
      console.error(err);
      setError(err.message || "No se pudieron cargar los usuarios.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarUsuarios();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const validarFormulario = () => {
    if (!form.nombre.trim() || !form.email.trim() || !form.rol.trim()) {
      return "Nombre, email y rol son obligatorios";
    }

    if (!editando && !form.password.trim()) {
      return "La contraseña es obligatoria al crear";
    }

    return "";
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const validationError = validarFormulario();
    if (validationError) {
      setFormError(validationError);
      return;
    }

    try {
      setSaving(true);
      setFormError("");

      const payload = {
        nombre: form.nombre,
        email: form.email,
        rol: form.rol,
      };

      if (!editando || form.password.trim()) {
        payload.password = form.password;
      }

      if (editando) {
        await put(`/users/${form.id}`, payload);
      } else {
        await post("/users", payload);
      }

      await cargarUsuarios();
      cerrarModal();

      toast.fire({
        icon: "success",
        title: editando
          ? "Usuario actualizado correctamente"
          : "Usuario creado correctamente",
      });
    } catch (err) {
      console.error(err);
      setFormError(err.message || "Error al guardar usuario");
    } finally {
      setSaving(false);
    }
  };

  const handleEditar = (usuario) => {
    setForm({
      id: usuario.id,
      nombre: usuario.nombre,
      email: usuario.email,
      password: "",
      rol: usuario.rol,
    });
    setEditando(true);
    setFormError("");
    setOpenModal(true);
  };

  const handleEliminar = async (usuario) => {
    const result = await Swal.fire({
      title: "¿Eliminar usuario?",
      text: `Se eliminará a ${usuario.nombre}`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Sí, eliminar",
      cancelButtonText: "Cancelar",
      confirmButtonColor: "#d33",
    });

    if (!result.isConfirmed) return;

    try {
      await del(`/users/${usuario.id}`);
      await cargarUsuarios();

      toast.fire({
        icon: "success",
        title: "Usuario eliminado correctamente",
      });
    } catch (err) {
      console.error(err);
      toast.fire({
        icon: "error",
        title: err.message || "Error al eliminar usuario",
      });
    }
  };

  return (
    <div className="usuarios-admin">
      <div className="usuarios-header">
        <h2>Usuarios registrados</h2>

        <div className="usuarios-header-actions">
          <button type="button" className="btn-secondary" onClick={cargarUsuarios}>
            Recargar
          </button>
          <button type="button" className="btn-primary" onClick={abrirModalCrear}>
            Nuevo usuario
          </button>
        </div>
      </div>

      {loading && <p>Cargando usuarios...</p>}
      {error && <p className="form-error">{error}</p>}

      {!loading && !error && usuarios.length > 0 && (
        <div className="tabla-wrapper">
          <table className="tabla-usuarios">
            <thead>
              <tr>
                <th>ID</th>
                <th>Nombre</th>
                <th>Email</th>
                <th>Rol</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {usuarios.map((u) => (
                <tr key={u.id}>
                  <td>{u.id}</td>
                  <td>{u.nombre}</td>
                  <td>{u.email}</td>
                  <td>
                    <span className={`badge-rol ${u.rol?.toLowerCase()}`}>
                      {u.rol}
                    </span>
                  </td>
                  <td>
                    <div className="acciones-usuarios">
                      <button
                        type="button"
                        className="btn-edit"
                        onClick={() => handleEditar(u)}
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        className="btn-delete"
                        onClick={() => handleEliminar(u)}
                      >
                        Eliminar
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!loading && !error && usuarios.length === 0 && (
        <p>No hay usuarios registrados.</p>
      )}

      {openModal && (
        <div className="modal-backdrop" onClick={cerrarModal}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editando ? "Editar usuario" : "Crear usuario"}</h3>
              <button type="button" className="modal-close" onClick={cerrarModal}>
                ✕
              </button>
            </div>

            <form className="usuario-form" onSubmit={handleSubmit}>
              <div className="usuario-form-grid">
                <input
                  type="text"
                  name="nombre"
                  placeholder="Nombre"
                  value={form.nombre}
                  onChange={handleChange}
                />

                <input
                  type="email"
                  name="email"
                  placeholder="Email"
                  value={form.email}
                  onChange={handleChange}
                />

                <input
                  type="password"
                  name="password"
                  placeholder={
                    editando ? "Nueva contraseña (opcional)" : "Contraseña"
                  }
                  value={form.password}
                  onChange={handleChange}
                />

                <select name="rol" value={form.rol} onChange={handleChange}>
                  <option value="CLIENTE">CLIENTE</option>
                  <option value="ADMIN">ADMIN</option>
                </select>
              </div>

              {formError && <p className="form-error">{formError}</p>}

              <div className="usuario-form-actions">
                <button type="submit" className="btn-primary" disabled={saving}>
                  {saving
                    ? "Guardando..."
                    : editando
                    ? "Actualizar usuario"
                    : "Crear usuario"}
                </button>

                <button type="button" className="btn-secondary" onClick={cerrarModal}>
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}