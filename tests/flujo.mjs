import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import worker from "../cloudflare/worker.js";

const sqlite = new DatabaseSync(":memory:");
sqlite.exec(readFileSync(new URL("../cloudflare/schema.sql", import.meta.url), "utf8"));

const DB = {
  prepare(sql) {
    return {
      bind(...params) {
        return {
          async run() {
            const info = sqlite.prepare(sql).run(...params);
            return { meta: { changes: Number(info.changes) } };
          },
          async first() {
            return sqlite.prepare(sql).get(...params) || null;
          },
          async all() {
            return { results: sqlite.prepare(sql).all(...params) };
          }
        };
      },
      async all() {
        return { results: sqlite.prepare(sql).all() };
      }
    };
  }
};

const env = {
  DB,
  ALLOWED_ORIGINS: "https://xbae23.github.io",
  ADMIN_KEY: "clave-prueba-no-publicar-1234567890"
};

async function pedir(ruta, method = "GET", body, token) {
  const request = new Request(`https://nexo-acceso.test${ruta}`, {
    method,
    headers: {
      Origin: "https://xbae23.github.io",
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    ...(body ? { body: JSON.stringify(body) } : {})
  });
  const response = await worker.fetch(request, env);
  return { status: response.status, data: await response.json() };
}

const registro = await pedir("/auth/registrar", "POST", {
  usuario: "estudiante.upa",
  correo: "estudiante@example.com"
});
assert.equal(registro.status, 201);
assert.equal(registro.data.perfil.usuario, "estudiante.upa");
assert.ok(registro.data.perfil.id);

const duplicado = await pedir("/auth/registrar", "POST", {
  usuario: "otro",
  correo: "estudiante@example.com"
});
assert.equal(duplicado.status, 409);

const canje = await pedir("/auth/canjear", "POST", { codigo: registro.data.codigo });
assert.equal(canje.status, 200);
assert.equal(canje.data.perfil.id, registro.data.perfil.id);

const codigoReutilizado = await pedir("/auth/canjear", "POST", { codigo: registro.data.codigo });
assert.equal(codigoReutilizado.status, 401);

const yo = await pedir("/auth/yo", "GET", undefined, canje.data.token);
assert.equal(yo.status, 200);
assert.equal(yo.data.perfil.correo, "estudiante@example.com");

const sinPerfil = await pedir("/perfil", "GET", undefined, canje.data.token);
assert.equal(sinPerfil.status, 200);
assert.equal(sinPerfil.data.perfil, null);

const creadoPerfil = await pedir("/perfil", "PUT", {
  name: "Nombre visible",
  username: "alias.nexo",
  program: "Ingeniería",
  bio: "Hola comunidad",
  note: "",
  phone: ""
}, canje.data.token);
assert.equal(creadoPerfil.status, 200);
assert.equal(creadoPerfil.data.perfil.username, "alias.nexo");
assert.notEqual(creadoPerfil.data.perfil.username, registro.data.perfil.usuario);

const perfilRecuperado = await pedir("/perfil", "GET", undefined, canje.data.token);
assert.equal(perfilRecuperado.data.perfil.name, "Nombre visible");

const panel = await pedir("/admin/usuarios", "GET", undefined, env.ADMIN_KEY);
assert.equal(panel.status, 200);
assert.equal(panel.data.usuarios.length, 1);
assert.equal(panel.data.usuarios[0].id, registro.data.perfil.id);
assert.equal(Object.hasOwn(panel.data.usuarios[0], "nombre"), false);

const nuevaEntrada = await pedir("/auth/entrar", "POST", { identificador: "estudiante.upa" });
assert.equal(nuevaEntrada.status, 200);
const segundoCanje = await pedir("/auth/canjear", "POST", { codigo: nuevaEntrada.data.codigo });
assert.equal(segundoCanje.data.perfil.id, registro.data.perfil.id);
const perfilEnOtraSesion = await pedir("/perfil", "GET", undefined, segundoCanje.data.token);
assert.equal(perfilEnOtraSesion.data.perfil.username, "alias.nexo");

await pedir("/auth/salir", "POST", undefined, canje.data.token);
const despuesDeSalir = await pedir("/auth/yo", "GET", undefined, canje.data.token);
assert.equal(despuesDeSalir.status, 401);

console.log("OK: registro, perfil Nexo separado, sesión, panel, reingreso y cierre de sesión.");
