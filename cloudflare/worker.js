// =============================================================
// MOTOR DE CUENTAS NEXO — NO TOCAR AL CAMBIAR EL DISEÑO
// Cloudflare Worker con binding D1 llamado DB.
// DEMO INSEGURA: el correo NO se verifica. No usar con datos reales.
// =============================================================

const encoder = new TextEncoder();
const SESSION_MS = 7 * 24 * 60 * 60 * 1000;
const HANDOFF_MS = 2 * 60 * 1000;

function originPermitido(request, env) {
  const origin = request.headers.get("Origin");
  if (!origin) return true;
  const permitidos = String(env.ALLOWED_ORIGINS || "")
    .split(",")
    .map((valor) => valor.trim())
    .filter(Boolean);
  return permitidos.includes(origin);
}

function headers(request) {
  const origin = request.headers.get("Origin");
  return {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    ...(origin ? {
      "Access-Control-Allow-Origin": origin,
      "Access-Control-Allow-Methods": "GET, POST, PUT, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Vary": "Origin"
    } : {})
  };
}

function json(request, data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: headers(request) });
}

function randomToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function hash(valor) {
  const bytes = await crypto.subtle.digest("SHA-256", encoder.encode(valor));
  return Array.from(new Uint8Array(bytes), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function perfil(fila) {
  return {
    id: fila.id,
    usuario: fila.usuario,
    correo: fila.correo,
    creado: fila.creado
  };
}

async function crearCodigo(env, usuarioId) {
  const codigo = randomToken();
  await env.DB.prepare(
    "INSERT INTO accesos_temporales (codigo_hash, usuario_id, vence) VALUES (?, ?, ?)"
  ).bind(await hash(codigo), usuarioId, Date.now() + HANDOFF_MS).run();
  return codigo;
}

async function cuentaActual(request, env) {
  const cabecera = request.headers.get("Authorization") || "";
  const token = cabecera.startsWith("Bearer ") ? cabecera.slice(7) : "";
  if (!/^[a-f0-9]{64}$/.test(token)) return null;
  const fila = await env.DB.prepare(
    `SELECT u.id, u.usuario, u.correo, u.creado
     FROM sesiones s JOIN usuarios u ON u.id = s.usuario_id
     WHERE s.token_hash = ? AND s.vence > ?`
  ).bind(await hash(token), Date.now()).first();
  return fila ? perfil(fila) : null;
}

export default {
  async fetch(request, env) {
    if (!originPermitido(request, env)) {
      return new Response("Origen no permitido", { status: 403 });
    }

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: headers(request) });
    }

    const ruta = new URL(request.url).pathname;

    try {
      if (ruta === "/auth/registrar" && request.method === "POST") {
        const datos = await request.json();
        const usuario = String(datos.usuario || "").trim().toLowerCase();
        const correo = String(datos.correo || "").trim().toLowerCase();

        if (!/^[a-z0-9._]{3,24}$/.test(usuario)) {
          return json(request, { error: "Usuario: 3 a 24 letras, números, puntos o guiones bajos." }, 400);
        }
        if (correo.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) {
          return json(request, { error: "Escribe un correo válido." }, 400);
        }

        const id = crypto.randomUUID();
        const resultado = await env.DB.prepare(
          "INSERT OR IGNORE INTO usuarios (id, usuario, correo) VALUES (?, ?, ?)"
        ).bind(id, usuario, correo).run();

        if (resultado.meta.changes !== 1) {
          return json(request, { error: "Ese usuario o correo ya está registrado." }, 409);
        }

        const codigo = await crearCodigo(env, id);
        return json(request, { ok: true, codigo, perfil: { id, usuario, correo } }, 201);
      }

      if (ruta === "/auth/entrar" && request.method === "POST") {
        const datos = await request.json();
        const identificador = String(datos.identificador || "").trim().toLowerCase();
        if (!identificador || identificador.length > 254) {
          return json(request, { error: "Escribe tu correo o usuario." }, 400);
        }

        // Solo para la demo: NO verifica que el correo pertenezca a la persona.
        const fila = await env.DB.prepare(
          "SELECT id, usuario, correo, creado FROM usuarios WHERE correo = ? OR usuario = ? LIMIT 1"
        ).bind(identificador, identificador).first();

        if (!fila) return json(request, { error: "No existe esa cuenta." }, 404);
        const codigo = await crearCodigo(env, fila.id);
        return json(request, { ok: true, codigo }, 200);
      }

      if (ruta === "/auth/canjear" && request.method === "POST") {
        const datos = await request.json();
        const codigo = String(datos.codigo || "");
        if (!/^[a-f0-9]{64}$/.test(codigo)) {
          return json(request, { error: "Código inválido." }, 400);
        }

        const codigoHash = await hash(codigo);
        const acceso = await env.DB.prepare(
          "SELECT usuario_id FROM accesos_temporales WHERE codigo_hash = ? AND vence > ?"
        ).bind(codigoHash, Date.now()).first();
        if (!acceso) return json(request, { error: "El acceso expiró. Vuelve al login." }, 401);

        const borrado = await env.DB.prepare(
          "DELETE FROM accesos_temporales WHERE codigo_hash = ? AND vence > ?"
        ).bind(codigoHash, Date.now()).run();
        if (borrado.meta.changes !== 1) {
          return json(request, { error: "Ese acceso ya fue usado." }, 401);
        }

        const token = randomToken();
        await env.DB.prepare(
          "INSERT INTO sesiones (token_hash, usuario_id, vence) VALUES (?, ?, ?)"
        ).bind(await hash(token), acceso.usuario_id, Date.now() + SESSION_MS).run();

        const fila = await env.DB.prepare(
          "SELECT id, usuario, correo, creado FROM usuarios WHERE id = ?"
        ).bind(acceso.usuario_id).first();

        return json(request, { ok: true, token, perfil: perfil(fila) });
      }

      if (ruta === "/auth/yo" && request.method === "GET") {
        const usuario = await cuentaActual(request, env);
        return usuario ? json(request, { perfil: usuario }) : json(request, { error: "Sesión no válida." }, 401);
      }

      if (ruta === "/perfil" && request.method === "GET") {
        const cuenta = await cuentaActual(request, env);
        if (!cuenta) return json(request, { error: "Sesión no válida." }, 401);
        const fila = await env.DB.prepare(
          "SELECT nombre, alias, carrera, biografia, nota, telefono, actualizado FROM perfiles_nexo WHERE usuario_id = ?"
        ).bind(cuenta.id).first();
        return json(request, { perfil: fila ? {
          name: fila.nombre, username: fila.alias, program: fila.carrera,
          bio: fila.biografia, note: fila.nota, phone: fila.telefono,
          updatedAt: fila.actualizado
        } : null });
      }

      if (ruta === "/perfil" && request.method === "PUT") {
        const cuenta = await cuentaActual(request, env);
        if (!cuenta) return json(request, { error: "Sesión no válida." }, 401);
        const datos = await request.json();
        const name = String(datos.name || "").trim();
        const username = String(datos.username || "").trim().toLowerCase();
        const program = String(datos.program || "").trim();
        const bio = String(datos.bio || "").trim();
        const note = String(datos.note || "").trim();
        const phone = String(datos.phone || "").trim();
        if (name.length < 2 || name.length > 60 || !/^[a-z0-9._]{3,24}$/.test(username) ||
            program.length > 80 || bio.length > 160 || note.length > 60 || phone.length > 24) {
          return json(request, { error: "Revisa el nombre, alias y límites de texto del perfil." }, 400);
        }
        const ocupado = await env.DB.prepare(
          "SELECT usuario_id FROM perfiles_nexo WHERE alias = ? AND usuario_id <> ? LIMIT 1"
        ).bind(username, cuenta.id).first();
        if (ocupado) return json(request, { error: "Ese alias ya está en uso dentro de Nexo." }, 409);
        try {
          await env.DB.prepare(
            `INSERT INTO perfiles_nexo
             (usuario_id, nombre, alias, carrera, biografia, nota, telefono)
             VALUES (?, ?, ?, ?, ?, ?, ?)
             ON CONFLICT(usuario_id) DO UPDATE SET
             nombre=excluded.nombre, alias=excluded.alias, carrera=excluded.carrera,
             biografia=excluded.biografia, nota=excluded.nota, telefono=excluded.telefono,
             actualizado=CURRENT_TIMESTAMP`
          ).bind(cuenta.id, name, username, program, bio, note, phone).run();
        } catch {
          return json(request, { error: "No se pudo guardar el perfil. Quizá el alias ya está en uso." }, 409);
        }
        return json(request, { ok: true, perfil: { name, username, program, bio, note, phone } });
      }

      if (ruta === "/auth/salir" && request.method === "POST") {
        const cabecera = request.headers.get("Authorization") || "";
        const token = cabecera.startsWith("Bearer ") ? cabecera.slice(7) : "";
        if (/^[a-f0-9]{64}$/.test(token)) {
          await env.DB.prepare("DELETE FROM sesiones WHERE token_hash = ?")
            .bind(await hash(token)).run();
        }
        return json(request, { ok: true });
      }

      if (ruta === "/admin/usuarios" && request.method === "GET") {
        const clave = request.headers.get("Authorization") || "";
        if (!env.ADMIN_KEY || env.ADMIN_KEY.length < 24 || clave !== `Bearer ${env.ADMIN_KEY}`) {
          return json(request, { error: "Acceso denegado." }, 401);
        }
        const { results } = await env.DB.prepare(
          "SELECT id, usuario, correo, creado FROM usuarios ORDER BY creado DESC LIMIT 500"
        ).all();
        return json(request, { usuarios: results });
      }

      return json(request, { error: "Ruta no encontrada." }, 404);
    } catch (error) {
      console.error("Error de API", error);
      return json(request, { error: "Error del servidor. Inténtalo de nuevo." }, 500);
    }
  }
};
