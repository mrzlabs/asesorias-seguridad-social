-- Esquema de la base del panel (Cloudflare D1 / SQLite).
-- Ver ADR 0002: Sheets deja de ser la fuente de verdad.
--
-- Se aplica con:
--   npx wrangler d1 execute asesorias-db --remote --file=esquema.sql

PRAGMA foreign_keys = ON;

-- ---------------------------------------------------------------
-- Leads
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS leads (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  creado              TEXT    NOT NULL DEFAULT (datetime('now')),
  nombre              TEXT    NOT NULL,
  telefono            TEXT    NOT NULL,
  email               TEXT,
  ciudad              TEXT,
  servicio_interes    TEXT,
  mensaje             TEXT,

  -- Origen y atribucion
  utm_source          TEXT    DEFAULT 'directo',
  utm_campaign        TEXT,
  codigo_atribucion   TEXT,
  pagina_origen       TEXT,
  canal               TEXT    NOT NULL DEFAULT 'formulario'
                              CHECK (canal IN ('formulario','whatsapp','llamada','referido','otro')),

  -- Calculo adjunto cuando el lead viene de la calculadora
  calculo_ingreso     INTEGER,
  calculo_ibc         INTEGER,
  calculo_total       INTEGER,

  -- Constancia del consentimiento (Ley 1581 de 2012)
  autorizacion_datos  INTEGER NOT NULL DEFAULT 0 CHECK (autorizacion_datos IN (0,1)),
  autorizacion_fecha  TEXT,
  autorizacion_version TEXT,

  -- Gestion comercial
  estado              TEXT    NOT NULL DEFAULT 'nuevo'
                              CHECK (estado IN ('nuevo','contactado','cotizado','cerrado','perdido')),
  motivo_perdida      TEXT,
  valor_cerrado       INTEGER,
  notas               TEXT,
  actualizado         TEXT,

  -- Trazabilidad tecnica sin datos personales crudos
  ip_hash             TEXT,
  user_agent          TEXT
);

CREATE INDEX IF NOT EXISTS idx_leads_estado   ON leads(estado);
CREATE INDEX IF NOT EXISTS idx_leads_creado   ON leads(creado DESC);
CREATE INDEX IF NOT EXISTS idx_leads_servicio ON leads(servicio_interes);
CREATE INDEX IF NOT EXISTS idx_leads_source   ON leads(utm_source);
-- Un mismo telefono puede volver a escribir; no se fuerza unicidad, pero
-- el indice permite detectar repetidos desde el panel.
CREATE INDEX IF NOT EXISTS idx_leads_telefono ON leads(telefono);

-- ---------------------------------------------------------------
-- Eventos: cada interaccion medible, incluidos los clics de WhatsApp
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS eventos (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  creado            TEXT    NOT NULL DEFAULT (datetime('now')),
  tipo              TEXT    NOT NULL,
  detalle           TEXT,
  pagina            TEXT,
  utm_source        TEXT,
  utm_campaign      TEXT,
  codigo_atribucion TEXT,
  lead_id           INTEGER REFERENCES leads(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_eventos_tipo   ON eventos(tipo);
CREATE INDEX IF NOT EXISTS idx_eventos_creado ON eventos(creado DESC);
CREATE INDEX IF NOT EXISTS idx_eventos_codigo ON eventos(codigo_atribucion);

-- ---------------------------------------------------------------
-- Contenido editable desde el panel
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS servicios (
  slug              TEXT    PRIMARY KEY,
  nombre            TEXT    NOT NULL,
  descripcion_corta TEXT,
  descripcion_larga TEXT,
  icono             TEXT,
  categoria         TEXT,
  honorario_desde   INTEGER,
  orden             INTEGER DEFAULT 0,
  activo            INTEGER NOT NULL DEFAULT 1 CHECK (activo IN (0,1)),
  actualizado       TEXT
);

CREATE TABLE IF NOT EXISTS faq (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  pregunta    TEXT    NOT NULL,
  respuesta   TEXT    NOT NULL,
  categoria   TEXT,
  orden       INTEGER DEFAULT 0,
  activo      INTEGER NOT NULL DEFAULT 1 CHECK (activo IN (0,1))
);

CREATE TABLE IF NOT EXISTS testimonios (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre          TEXT    NOT NULL,
  cargo_o_ciudad  TEXT,
  testimonio      TEXT    NOT NULL,
  calificacion    INTEGER CHECK (calificacion BETWEEN 1 AND 5),
  activo          INTEGER NOT NULL DEFAULT 1 CHECK (activo IN (0,1))
);

CREATE TABLE IF NOT EXISTS promociones (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  titulo       TEXT    NOT NULL,
  descripcion  TEXT,
  imagen       TEXT,
  vigente_hasta TEXT,
  orden        INTEGER DEFAULT 0,
  activo       INTEGER NOT NULL DEFAULT 1 CHECK (activo IN (0,1))
);

-- ---------------------------------------------------------------
-- Parametros de calculo. Aqui es donde viven el salario minimo y las
-- tasas: si se escriben en el codigo, la calculadora miente cada enero.
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS parametros (
  clave       TEXT    PRIMARY KEY,
  valor       TEXT    NOT NULL,
  tipo        TEXT    NOT NULL DEFAULT 'numero' CHECK (tipo IN ('numero','texto','porcentaje')),
  descripcion TEXT,
  actualizado TEXT
);

-- ---------------------------------------------------------------
-- Registro de cambios: quien toco que y cuando.
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS auditoria (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  creado    TEXT NOT NULL DEFAULT (datetime('now')),
  usuario   TEXT,
  accion    TEXT NOT NULL,
  entidad   TEXT,
  entidad_id TEXT,
  detalle   TEXT
);

CREATE INDEX IF NOT EXISTS idx_auditoria_creado ON auditoria(creado DESC);

-- ---------------------------------------------------------------
-- Comparador de EPS por ciudad (Fase 4). Ver ADR/diseno del comparador.
-- Ninguna ciudad se publica hasta que el negocio verifique sus datos.
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS eps (
  slug         TEXT    PRIMARY KEY,
  nombre       TEXT    NOT NULL,
  nombre_corto TEXT,
  tipo         TEXT    NOT NULL DEFAULT 'contributivo'
                       CHECK (tipo IN ('contributivo','subsidiado','ambos')),
  sitio_web    TEXT,
  telefono     TEXT,
  logo         TEXT,
  orden        INTEGER DEFAULT 0,
  activo       INTEGER NOT NULL DEFAULT 1 CHECK (activo IN (0,1))
);

CREATE TABLE IF NOT EXISTS ciudades (
  slug         TEXT    PRIMARY KEY,
  nombre       TEXT    NOT NULL,
  departamento TEXT,
  descripcion  TEXT,                       -- intro unica, contenido diferenciador
  publicada    INTEGER NOT NULL DEFAULT 0 CHECK (publicada IN (0,1)),
  activo       INTEGER NOT NULL DEFAULT 1 CHECK (activo IN (0,1)),
  actualizado  TEXT
);

CREATE TABLE IF NOT EXISTS eps_ciudad (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  eps_slug         TEXT    NOT NULL REFERENCES eps(slug) ON DELETE CASCADE,
  ciudad_slug      TEXT    NOT NULL REFERENCES ciudades(slug) ON DELETE CASCADE,
  disponible       INTEGER NOT NULL DEFAULT 1 CHECK (disponible IN (0,1)),
  red_atencion     TEXT,
  particularidades TEXT,
  fuente           TEXT,                    -- URL para auditar el dato
  verificado       INTEGER NOT NULL DEFAULT 0 CHECK (verificado IN (0,1)),
  actualizado      TEXT,
  UNIQUE (eps_slug, ciudad_slug)
);

CREATE INDEX IF NOT EXISTS idx_epsciudad_ciudad ON eps_ciudad(ciudad_slug);
CREATE INDEX IF NOT EXISTS idx_epsciudad_eps    ON eps_ciudad(eps_slug);
