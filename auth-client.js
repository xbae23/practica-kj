// =============================================================
// CONEXIÓN DEL LOGIN — NO TOCAR AL CAMBIAR COLORES O MAQUETACIÓN
// Si rediseñas el HTML, conserva los IDs de los formularios/campos.
// =============================================================

const { apiUrl, appUrl } = window.NEXO_CONFIG;
const aviso = document.getElementById("aviso");
const registro = document.getElementById("form-registro");
const entrada = document.getElementById("form-entrada");

function mostrar(texto, tipo = "error") {
  aviso.textContent = texto;
  aviso.dataset.tipo = tipo;
  aviso.hidden = false;
}

function listo() {
  if (apiUrl.includes("TU_WORKER")) {
    mostrar("Antes de probar, configura la dirección de tu Worker en config.js.");
    return false;
  }
  return true;
}

async function enviar(ruta, datos) {
  const respuesta = await fetch(`${apiUrl}${ruta}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(datos)
  });
  const cuerpo = await respuesta.json();
  if (!respuesta.ok) throw new Error(cuerpo.error || "No se pudo completar la operación.");
  return cuerpo;
}

function abrirNexo(codigo) {
  const destino = new URL(appUrl, window.location.href);
  destino.hash = `nexo-code=${encodeURIComponent(codigo)}`;
  window.location.assign(destino.href);
}

registro.addEventListener("submit", async (evento) => {
  evento.preventDefault();
  if (!listo()) return;
  const boton = registro.querySelector('button[type="submit"]');
  boton.disabled = true;
  mostrar("Creando tu perfil...", "progreso");

  try {
    const usuario = document.getElementById("registro-usuario").value;
    const correo = document.getElementById("registro-correo").value;
    const resultado = await enviar("/auth/registrar", { usuario, correo });
    mostrar("Perfil creado. Abriendo Nexo...", "exito");
    abrirNexo(resultado.codigo);
  } catch (error) {
    mostrar(error instanceof TypeError ? "No se pudo conectar con Cloudflare. Revisa la API y sus orígenes permitidos." : error.message);
    boton.disabled = false;
  }
});

entrada.addEventListener("submit", async (evento) => {
  evento.preventDefault();
  if (!listo()) return;
  const boton = entrada.querySelector('button[type="submit"]');
  boton.disabled = true;
  mostrar("Buscando tu cuenta...", "progreso");

  try {
    const identificador = document.getElementById("entrada-identificador").value;
    const resultado = await enviar("/auth/entrar", { identificador });
    mostrar("Cuenta encontrada. Abriendo Nexo...", "exito");
    abrirNexo(resultado.codigo);
  } catch (error) {
    mostrar(error instanceof TypeError ? "No se pudo conectar con Cloudflare. Revisa la API y sus orígenes permitidos." : error.message);
    boton.disabled = false;
  }
});
