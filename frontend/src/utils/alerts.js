import Swal from 'sweetalert2';

export const toast = Swal.mixin({
  toast: true,
  position: 'top-end',
  showConfirmButton: false,
  timer: 3000,
  timerProgressBar: true,
});

export const toastSuccess = (message) => {
  toast.fire({
    icon: 'success',
    title: message,
  });
};

export const toastError = (message) => {
  toast.fire({
    icon: 'error',
    title: message,
  });
};

export const confirmDialog = ({
  title = '¿Estás seguro?',
  text = '',
  icon = 'question',
  confirmButtonText = 'Aceptar',
  cancelButtonText = 'Cancelar',
  confirmButtonColor,
}) => {
  return Swal.fire({
    title,
    text,
    icon,
    showCancelButton: true,
    confirmButtonText,
    cancelButtonText,
    reverseButtons: true,
    ...(confirmButtonColor ? { confirmButtonColor } : {}),
  });
};

export const confirmDelete = (text = 'Esta acción no se puede deshacer.') => {
  return confirmDialog({
    title: '¿Eliminar registro?',
    text,
    icon: 'warning',
    confirmButtonText: 'Sí, eliminar',
    cancelButtonText: 'Cancelar',
    confirmButtonColor: '#d33',
  });
};

export const confirmSave = (isEditing = false) => {
  return confirmDialog({
    title: isEditing ? '¿Actualizar registro?' : '¿Crear registro?',
    text: isEditing
      ? 'Se actualizará la información del registro.'
      : 'Se creará un nuevo registro.',
    icon: 'question',
    confirmButtonText: isEditing ? 'Sí, actualizar' : 'Sí, crear',
    cancelButtonText: 'Cancelar',
  });
};

export const confirmDiscard = () => {
  return confirmDialog({
    title: '¿Descartar cambios?',
    text: 'Los cambios no guardados se perderán.',
    icon: 'warning',
    confirmButtonText: 'Sí, salir',
    cancelButtonText: 'Seguir editando',
  });
};