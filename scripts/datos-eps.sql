-- Siembra curada del comparador de EPS. Fuente del catálogo: MinSalud,
-- "EPS VIGENTES DEL REGIMEN CONTRIBUTIVO Y SUBSIDIADO – SGSSS" (05-jun-2025):
-- https://www.minsalud.gov.co/sites/rid/Lists/BibliotecaDigital/RIDE/VP/DOA/listado-eps-por-regimen.pdf
--
-- IMPORTANTE: todas las ciudades entran con publicada=0 y las coberturas con
-- verificado=0. NADA sale al sitio hasta que el negocio revise en el panel,
-- complete red de atención/particularidades y marque publicada/verificado.

-- --------------------------------------------------------------------------
-- Catálogo de EPS del régimen contributivo (dato oficial, verificable).
-- --------------------------------------------------------------------------
INSERT OR REPLACE INTO eps (slug, nombre, nombre_corto, tipo, sitio_web, orden, activo) VALUES
 ('nueva-eps',       'Nueva EPS',                         'Nueva EPS',  'ambos',        'https://www.nuevaeps.com.co',   1, 1),
 ('salud-total',     'Salud Total EPS',                   'Salud Total','contributivo', 'https://www.saludtotal.com.co', 2, 1),
 ('sanitas',         'EPS Sanitas',                       'Sanitas',    'contributivo', 'https://www.epssanitas.com',    3, 1),
 ('sura',            'EPS Sura',                          'Sura',       'contributivo', 'https://www.epssura.com',       4, 1),
 ('famisanar',       'Famisanar EPS',                     'Famisanar',  'contributivo', 'https://www.famisanar.com.co',  5, 1),
 ('aliansalud',      'Aliansalud EPS',                    'Aliansalud', 'contributivo', 'https://www.aliansalud.com.co', 6, 1),
 ('coosalud',        'Coosalud EPS',                      'Coosalud',   'ambos',        'https://www.coosalud.com',      7, 1),
 ('mutual-ser',      'Mutual Ser EPS',                    'Mutual Ser', 'ambos',        'https://www.mutualser.com',     8, 1),
 ('compensar',       'Compensar EPS',                     'Compensar',  'contributivo', 'https://www.compensar.com',     9, 1),
 ('sos',             'Servicio Occidental de Salud (SOS)','SOS',        'contributivo', 'https://www.sos.com.co',       10, 1),
 ('comfenalco-valle','Comfenalco Valle EPS',              'Comfenalco', 'contributivo', 'https://www.comfenalcovalle.com.co', 11, 1);

-- --------------------------------------------------------------------------
-- Ciudades de la primera ola. Intro breve por ciudad (el negocio la amplía a
-- >400 palabras con datos diferenciadores reales antes de publicar).
-- --------------------------------------------------------------------------
INSERT OR REPLACE INTO ciudades (slug, nombre, departamento, descripcion, publicada, activo) VALUES
 ('bogota',       'Bogotá',       'Distrito Capital',
   'Bogotá concentra la mayor oferta de EPS del régimen contributivo del país y la red de IPS más extensa. Al elegir o trasladarte, lo decisivo suele ser la cercanía de la red de la EPS a tu localidad y los tiempos de asignación de citas de especialistas.', 0, 1),
 ('medellin',     'Medellín',     'Antioquia',
   'En Medellín y el Valle de Aburrá operan las principales EPS nacionales junto a la red antioqueña. La calidad de la red de mediana y alta complejidad y la puntualidad en autorizaciones son los factores que más pesan al comparar.', 0, 1),
 ('cali',         'Cali',         'Valle del Cauca',
   'Cali suma a las EPS nacionales opciones regionales fuertes del Valle del Cauca. La cobertura de la red por comuna y la disponibilidad de especialistas marcan la diferencia entre una y otra EPS.', 0, 1),
 ('barranquilla', 'Barranquilla', 'Atlántico',
   'En Barranquilla y el área metropolitana conviven EPS nacionales con entidades de amplia presencia en la Costa Caribe. Conviene mirar la red de urgencias y la cobertura en municipios cercanos.', 0, 1),
 ('bucaramanga',  'Bucaramanga',  'Santander',
   'Bucaramanga y su área metropolitana cuentan con la red de las principales EPS del contributivo. Los tiempos de cita y la red de especialistas en el área metropolitana son el criterio práctico para decidir.', 0, 1);

-- --------------------------------------------------------------------------
-- Cobertura base: EPS nacionales disponibles en las 5 ciudades + regionales en
-- su zona. verificado=0: el negocio confirma y completa red/particularidades.
-- --------------------------------------------------------------------------
-- Nacionales en todas las ciudades
INSERT OR REPLACE INTO eps_ciudad (eps_slug, ciudad_slug, disponible, fuente, verificado) VALUES
 ('nueva-eps','bogota',1,'MinSalud jun-2025',0),('nueva-eps','medellin',1,'MinSalud jun-2025',0),('nueva-eps','cali',1,'MinSalud jun-2025',0),('nueva-eps','barranquilla',1,'MinSalud jun-2025',0),('nueva-eps','bucaramanga',1,'MinSalud jun-2025',0),
 ('salud-total','bogota',1,'MinSalud jun-2025',0),('salud-total','medellin',1,'MinSalud jun-2025',0),('salud-total','cali',1,'MinSalud jun-2025',0),('salud-total','barranquilla',1,'MinSalud jun-2025',0),('salud-total','bucaramanga',1,'MinSalud jun-2025',0),
 ('sanitas','bogota',1,'MinSalud jun-2025',0),('sanitas','medellin',1,'MinSalud jun-2025',0),('sanitas','cali',1,'MinSalud jun-2025',0),('sanitas','barranquilla',1,'MinSalud jun-2025',0),('sanitas','bucaramanga',1,'MinSalud jun-2025',0),
 ('sura','bogota',1,'MinSalud jun-2025',0),('sura','medellin',1,'MinSalud jun-2025',0),('sura','cali',1,'MinSalud jun-2025',0),('sura','barranquilla',1,'MinSalud jun-2025',0),('sura','bucaramanga',1,'MinSalud jun-2025',0),
 ('famisanar','bogota',1,'MinSalud jun-2025',0),('famisanar','bucaramanga',1,'MinSalud jun-2025',0),
 ('aliansalud','bogota',1,'MinSalud jun-2025',0),
 ('coosalud','barranquilla',1,'MinSalud jun-2025',0),('coosalud','cali',1,'MinSalud jun-2025',0),
 ('mutual-ser','barranquilla',1,'MinSalud jun-2025',0),
 ('compensar','bogota',1,'MinSalud jun-2025',0),
 ('sos','cali',1,'MinSalud jun-2025',0),
 ('comfenalco-valle','cali',1,'MinSalud jun-2025',0);
