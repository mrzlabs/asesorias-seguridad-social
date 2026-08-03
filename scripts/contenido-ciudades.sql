-- Contenido de la primera ola de ciudades del comparador de EPS.
-- Intros unicas por ciudad (contenido propio, no plantilla) y publicacion.
-- Las caracteristicas por EPS son generales y verificables; la red por zona la
-- confirma el negocio con cada usuario.

UPDATE ciudades SET publicada = 1, descripcion =
'Para 2026, Bogota concentra la oferta de EPS del regimen contributivo mas amplia del pais: casi todas las entidades nacionales operan en la ciudad, junto a opciones de fuerte raiz local como Compensar. Esa abundancia es una ventaja, pero obliga a comparar con criterio, porque la calidad del servicio no es igual en todas las localidades.
Al elegir o trasladarte en Bogota, lo mas practico es mirar tres cosas: que la red de IPS de la EPS tenga puntos cerca de tu localidad, los tiempos de asignacion de citas con especialistas, y la facilidad de autorizaciones. Una EPS con buena reputacion general puede tener una red debil justo en tu zona, y al reves.'
WHERE slug = 'bogota';

UPDATE ciudades SET publicada = 1, descripcion =
'En Medellin y el Valle de Aburra operan las principales EPS nacionales del regimen contributivo, apoyadas en una de las redes hospitalarias mas reconocidas del pais. La cercania de clinicas de alta complejidad y una cultura de servicio consolidada favorecen la atencion, pero las diferencias entre entidades siguen pesando.
Al comparar en Medellin conviene fijarse en la cobertura dentro del area metropolitana, no solo en la ciudad, en la red de especialistas y en la puntualidad de autorizaciones y entrega de medicamentos. Para quien vive en municipios como Bello, Itagui o Envigado, verificar la red local de la EPS evita desplazamientos innecesarios.'
WHERE slug = 'medellin';

UPDATE ciudades SET publicada = 1, descripcion =
'Cali suma, a las EPS nacionales, opciones regionales con fuerte arraigo en el Valle del Cauca como el Servicio Occidental de Salud (SOS) y Comfenalco Valle. Esa mezcla amplia las alternativas, pero hace que la eleccion dependa mucho de la zona de la ciudad donde vives o trabajas.
Al comparar en Cali, revisa la cobertura de la red por comuna, la disponibilidad de citas con especialistas y las particularidades de cada entidad para tramites y autorizaciones. Las opciones regionales suelen tener redes densas en el suroccidente, mientras que las nacionales ofrecen respaldo en otras ciudades si viajas con frecuencia.'
WHERE slug = 'cali';

UPDATE ciudades SET publicada = 1, descripcion =
'En Barranquilla y su area metropolitana conviven las EPS nacionales con entidades de amplia presencia en la Costa Caribe, como Coosalud y Mutual Ser. Esta combinacion da varias alternativas, y la mejor depende de tu barrio y de la red de urgencias cercana.
Al comparar en Barranquilla conviene mirar la cobertura en municipios del area metropolitana como Soledad y Malambo, la red de urgencias y la oportunidad en citas de especialistas. En la Costa, algunas entidades regionales tienen una red muy consolidada, lo que puede significar atencion mas cercana segun donde vivas.'
WHERE slug = 'barranquilla';

UPDATE ciudades SET publicada = 1, descripcion =
'Bucaramanga y su area metropolitana (Floridablanca, Giron y Piedecuesta) cuentan con la red de las principales EPS del regimen contributivo. La ciudad es un polo de servicios de salud del nororiente del pais, con buena oferta de especialistas, aunque los tiempos de atencion varian entre entidades.
Al comparar en Bucaramanga, revisa la cobertura dentro del area metropolitana, los tiempos de cita con especialistas y la red de la EPS cerca de tu municipio. Para quienes viven en Floridablanca o Giron, confirmar la red local evita desplazamientos hasta el centro de la ciudad.'
WHERE slug = 'bucaramanga';

-- Caracteristicas generales por EPS (verificables).
UPDATE eps_ciudad SET particularidades = 'La EPS con mayor numero de afiliados del pais; amplia cobertura nacional.' WHERE eps_slug = 'nueva-eps';
UPDATE eps_ciudad SET particularidades = 'Cobertura nacional consolidada, con red propia y contratada en las grandes ciudades.' WHERE eps_slug = 'salud-total';
UPDATE eps_ciudad SET particularidades = 'Reconocida por su red propia de clinicas y centros medicos en las principales ciudades.' WHERE eps_slug = 'sanitas';
UPDATE eps_ciudad SET particularidades = 'Valorada por sus indicadores de oportunidad en la asignacion de citas.' WHERE eps_slug = 'sura';
UPDATE eps_ciudad SET particularidades = 'Fuerte presencia en Bogota y la region central del pais.' WHERE eps_slug = 'famisanar';
UPDATE eps_ciudad SET particularidades = 'Enfocada en Bogota y Cundinamarca.' WHERE eps_slug = 'aliansalud';
UPDATE eps_ciudad SET particularidades = 'Amplia trayectoria y cobertura en la Costa Caribe y otras regiones.' WHERE eps_slug = 'coosalud';
UPDATE eps_ciudad SET particularidades = 'Amplia presencia en la Costa Caribe.' WHERE eps_slug = 'mutual-ser';
UPDATE eps_ciudad SET particularidades = 'Caja de compensacion y EPS con fuerte presencia en Bogota y Cundinamarca.' WHERE eps_slug = 'compensar';
UPDATE eps_ciudad SET particularidades = 'EPS regional del Valle del Cauca (Servicio Occidental de Salud).' WHERE eps_slug = 'sos';
UPDATE eps_ciudad SET particularidades = 'Caja de compensacion y EPS con presencia en el Valle del Cauca.' WHERE eps_slug = 'comfenalco-valle';
