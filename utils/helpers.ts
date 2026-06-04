export const generateId = () => `pg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

export const formatCurrentDate = () => {
  return new Date().toLocaleString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};
