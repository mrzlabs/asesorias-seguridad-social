/**
 * Gobierna que paginas de servicio existen y su metadata SEO.
 * El slug debe coincidir con el que devuelve la API para poder cruzar el
 * contenido dinamico con el estatico.
 */
export const SERVICIOS = [
  {
    slug: 'afiliacion-eps',
    titulo: 'Afiliación a EPS',
    tituloSeo: 'Afiliación a EPS en Colombia para independientes | Asesorías SAS',
    descripcionSeo:
      'Afiliamos tu EPS en 24 horas hábiles. Para independientes, contratistas y empresas en toda Colombia. Sin filas ni papeleo.',
    entrada:
      'Te afiliamos a la EPS que elijas y gestionamos tu planilla cada mes. Sin filas, sin papeleo y con los soportes en tu correo.',
  },
  {
    slug: 'afiliacion-arl',
    titulo: 'Afiliación a ARL',
    tituloSeo: 'Afiliación a ARL para independientes y empresas | Asesorías SAS',
    descripcionSeo:
      'Afiliación a riesgos laborales según tu clase de riesgo. Gestión completa para independientes, contratistas y empresas en Colombia.',
    entrada:
      'La ARL cubre accidentes y enfermedades derivadas de tu actividad. Te afiliamos en la clase de riesgo que corresponde a lo que haces.',
  },
  {
    slug: 'afiliacion-pension',
    titulo: 'Afiliación a pensión',
    tituloSeo: 'Afiliación a fondo de pensiones en Colombia | Asesorías SAS',
    descripcionSeo:
      'Te afiliamos al fondo de pensiones que elijas y gestionamos tu planilla cada mes. Colpensiones o fondo privado.',
    entrada:
      'Cada mes que cotizas suma semanas para tu pensión. Te afiliamos a Colpensiones o al fondo privado que prefieras.',
  },
  {
    slug: 'caja-de-compensacion',
    titulo: 'Caja de compensación',
    tituloSeo: 'Afiliación a caja de compensación familiar | Asesorías SAS',
    descripcionSeo:
      'Accede a subsidios, recreación y créditos afiliándote a una caja de compensación. Afiliación voluntaria para independientes.',
    entrada:
      'La afiliación a caja es voluntaria para independientes y cuesta un 2% adicional sobre tu IBC. A cambio accedes a subsidios, recreación y crédito.',
  },
  {
    slug: 'traslado-eps',
    titulo: 'Traslado de EPS',
    tituloSeo: 'Traslado de EPS: requisitos y trámite | Asesorías SAS',
    descripcionSeo:
      'Cámbiate de EPS cumpliendo los doce meses de permanencia. Gestionamos el traslado y verificamos que quedes activo.',
    entrada:
      'Puedes trasladarte cuando lleves doce meses continuos en tu EPS actual. Hacemos el trámite y verificamos que quedes activo en la nueva entidad.',
  },
  {
    slug: 'afiliacion-empresas',
    titulo: 'Afiliaciones para empresas',
    tituloSeo: 'Afiliación de empleados a seguridad social | Asesorías SAS',
    descripcionSeo:
      'Gestionamos la afiliación de tus empleados a EPS, ARL, pensión y caja, y la liquidación mensual de la planilla.',
    entrada:
      'Afiliamos a tus empleados a EPS, ARL, pensión y caja, y liquidamos la planilla cada mes para que cumplas sin dedicarle tiempo.',
  },
];
