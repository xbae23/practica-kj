// =============================================================
// PUENTE CON LA APP NEXO — NO TOCAR AL CAMBIAR EL DISEÑO
// Copia este módulo al proyecto React de Nexo e impórtalo.
// =============================================================

const SESSION_KEY = "nexo_demo_session";

async function peticion(apiUrl, ruta, opciones = {}) {
  const respuesta = await fetch(`${apiUrl}${ruta}`, opciones);
  const datos = await respuesta.json();
  if (!respuesta.ok) throw new Error(datos.error || "Error de acceso.");
  return datos;
}

export async function cargarPerfil(apiUrl) {
  const parametros = new URLSearchParams(window.location.hash.slice(1));
  const codigo = parametros.get("nexo-code");

  if (codigo) {
    const datos = await peticion(apiUrl, "/auth/canjear", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ codigo })
    });
    localStorage.setItem(SESSION_KEY, datos.token);
    window.history.replaceState(null, "", window.location.pathname + window.location.search);
  }

  const token = localStorage.getItem(SESSION_KEY);
  if (!token) return null;

  try {
    const datos = await peticion(apiUrl, "/auth/yo", {
      headers: { Authorization: `Bearer ${token}` }
    });
    return datos.perfil;
  } catch {
    localStorage.removeItem(SESSION_KEY);
    return null;
  }
}

export async function cerrarSesion(apiUrl) {
  const token = localStorage.getItem(SESSION_KEY);
  localStorage.removeItem(SESSION_KEY);
  if (!token) return;
  try {
    await peticion(apiUrl, "/auth/salir", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` }
    });
  } catch {
    // La sesión local ya se retiró, aunque no haya conexión.
  }
}
