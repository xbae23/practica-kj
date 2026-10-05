-- NO TOCAR LAS COLUMNAS SIN ACTUALIZAR TAMBIÉN worker.js.
-- Cada fila es una cuenta y su perfil básico.
CREATE TABLE IF NOT EXISTS usuarios (
  id TEXT PRIMARY KEY,
  usuario TEXT NOT NULL UNIQUE COLLATE NOCASE,
  correo TEXT NOT NULL UNIQUE COLLATE NOCASE,
  creado TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Código de un solo uso para pasar del login a Nexo.
CREATE TABLE IF NOT EXISTS accesos_temporales (
  codigo_hash TEXT PRIMARY KEY,
  usuario_id TEXT NOT NULL,
  vence INTEGER NOT NULL,
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
);

-- Sesiones de la demo; se guarda el hash, nunca el token original.
CREATE TABLE IF NOT EXISTS sesiones (
  token_hash TEXT PRIMARY KEY,
  usuario_id TEXT NOT NULL,
  vence INTEGER NOT NULL,
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
);

-- Perfil visible dentro de Nexo. Es distinto del usuario/correo del login
-- y no se incluye en la respuesta del panel administrativo.
CREATE TABLE IF NOT EXISTS perfiles_nexo (
  usuario_id TEXT PRIMARY KEY,
  nombre TEXT NOT NULL,
  alias TEXT NOT NULL UNIQUE COLLATE NOCASE,
  carrera TEXT NOT NULL DEFAULT '',
  biografia TEXT NOT NULL DEFAULT '',
  nota TEXT NOT NULL DEFAULT '',
  telefono TEXT NOT NULL DEFAULT '',
  actualizado TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
);

CREATE INDEX IF NOT EXISTS idx_accesos_usuario ON accesos_temporales(usuario_id);
CREATE INDEX IF NOT EXISTS idx_sesiones_usuario ON sesiones(usuario_id);
