export function responseError(response: Response) {
  return Object.assign(new Error("Request failed"), {
    status: response.status,
  });
}

export function errorMessage(error: unknown, fallback: string): string {
  if (error instanceof InputError) return error.message;
  const status =
    error && typeof error === "object" && "status" in error
      ? error.status
      : undefined;
  switch (status) {
    case 0:
      return "No se pudo conectar. Comprueba tu conexión e inténtalo de nuevo.";
    case 401:
      return "Tu sesión ha caducado. Vuelve a iniciar sesión; tus cambios locales se conservan.";
    case 403:
      return "La cuenta cambió o no tienes permiso. Recarga la página antes de reintentar.";
    case 400:
      return "Hay datos no válidos. Revisa los campos antes de reintentar.";
    case 404:
      return "Este elemento ya no está disponible. Actualiza la página.";
    case 409:
      return "Otra sesión modificó el diagrama. Revisa el conflicto antes de reemplazar sus cambios.";
    case 413:
      return "Los datos superan el tamaño permitido. Reduce el contenido antes de reintentar.";
    case 429:
      return "Demasiados intentos. Espera un momento antes de reintentar.";
  }
  if (typeof status === "number" && status >= 500)
    return "El servidor no pudo completar la acción. Tus datos se conservan; inténtalo de nuevo.";
  if (error instanceof DOMException && error.name === "QuotaExceededError")
    return "El almacenamiento del navegador está lleno. Libera espacio antes de reintentar.";
  if (error instanceof DOMException && error.name === "SecurityError")
    return "El navegador bloqueó el almacenamiento. Habilítalo para guardar los cambios.";
  if (error instanceof TypeError)
    return "No se pudo conectar. Comprueba tu conexión e inténtalo de nuevo.";
  return fallback;
}

export class InputError extends Error {}
