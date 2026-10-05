// =============================================================
// CONEXIÓN DEL PANEL — NO TOCAR AL CAMBIAR EL DISEÑO
// La clave se escribe al abrir el panel; nunca se sube a GitHub.
// =============================================================

const apiUrl = window.NEXO_CONFIG.apiUrl;
const formulario = document.getElementById("form-admin");
const tabla = document.getElementById("usuarios-cuerpo");
const estado = document.getElementById("estado-panel");
const contador = document.getElementById("contador");

formulario.addEventListener("submit", async (evento) => {
  evento.preventDefault();
  const clave = document.getElementById("admin-clave").value;
  if (apiUrl.includes("TU_WORKER")) {
    estado.textContent = "Configura la dirección del Worker en config.js.";
    return;
  }

  estado.textContent = "Cargando perfiles...";
  tabla.replaceChildren();
  try {
    const respuesta = await fetch(`${apiUrl}/admin/usuarios`, {
      headers: { Authorization: `Bearer ${clave}` }
    });
    const datos = await respuesta.json();
    if (!respuesta.ok) throw new Error(datos.error || "No se pudo abrir el panel.");

    for (const persona of datos.usuarios) {
      const fila = document.createElement("tr");
      for (const campo of [persona.id, persona.usuario, persona.correo, persona.creado]) {
        const celda = document.createElement("td");
        celda.textContent = String(campo);
        fila.append(celda);
      }
      tabla.append(fila);
    }

    contador.textContent = String(datos.usuarios.length);
    estado.textContent = datos.usuarios.length ? "Perfiles cargados." : "Todavía no hay cuentas.";
  } catch (error) {
    contador.textContent = "0";
    estado.textContent = error instanceof TypeError
      ? "No se pudo conectar con Cloudflare. Revisa la API y sus orígenes permitidos."
      : error.message;
  } finally {
    document.getElementById("admin-clave").value = "";
  }
});
