// =============================================================
// PERFIL DE PRUEBA — NO TOCAR AL CAMBIAR EL DISEÑO
// =============================================================
import { cargarPerfil, cerrarSesion } from "./nexo-bridge.js";

const apiUrl = window.NEXO_CONFIG.apiUrl;
const mensaje = document.getElementById("mensaje-perfil");
const salir = document.getElementById("salir");
let sesionActiva = false;

async function iniciar() {
  try {
    const perfil = await cargarPerfil(apiUrl);
    if (!perfil) {
      mensaje.textContent = "No hay una sesión activa. Vuelve al login.";
      salir.textContent = "Ir al login";
      return;
    }
    sesionActiva = true;
    document.getElementById("nombre-perfil").textContent = `Hola, ${perfil.usuario}`;
    document.getElementById("avatar").textContent = perfil.usuario[0].toUpperCase();
    document.getElementById("id-perfil").textContent = perfil.id;
    document.getElementById("usuario-perfil").textContent = `@${perfil.usuario}`;
    document.getElementById("correo-perfil").textContent = perfil.correo;
    mensaje.textContent = "Tu perfil está guardado en Cloudflare y esta sesión está activa.";
  } catch (error) {
    mensaje.textContent = error.message || "No se pudo abrir la cuenta.";
  }
}

salir.addEventListener("click", async () => {
  if (sesionActiva) await cerrarSesion(apiUrl);
  window.location.assign("index.html");
});

iniciar();
