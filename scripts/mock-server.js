// Mock API Server para Asesorias Seguridad Social
// Sirve el frontend estático y proporciona datos mock

import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Datos mock simulando Google Sheets
const mockData = {
  config: {
    empresa_nombre: 'Asesorías Seguridad Social SAS',
    empresa_slogan: 'Tu seguridad social resuelta sin complicaciones',
    email_contacto: 'contacto@asesoriasas.com',
    horario_atencion: 'Lunes a Viernes 8:00 AM - 6:00 PM'
  },
  servicios: [
    {
      slug: 'afiliacion-eps',
      nombre: 'Afiliación EPS',
      descripcion_corta: 'Afiliación a empresa de salud',
      precio_desde: 0
    },
    {
      slug: 'afiliacion-arl',
      nombre: 'Afiliación ARL',
      descripcion_corta: 'Cobertura de riesgos laborales',
      precio_desde: 0
    },
    {
      slug: 'afiliacion-pension',
      nombre: 'Afiliación Pensión',
      descripcion_corta: 'Pensión obligatoria',
      precio_desde: 0
    },
    {
      slug: 'caja-compensacion',
      nombre: 'Caja de Compensación',
      descripcion_corta: 'CCF para beneficios',
      precio_desde: 0
    },
    {
      slug: 'traslado-eps',
      nombre: 'Traslado EPS',
      descripcion_corta: 'Cambio de EPS',
      precio_desde: 0
    },
    {
      slug: 'pólizas-seguros',
      nombre: 'Pólizas y Seguros',
      descripcion_corta: 'Vida, auto, hogar',
      precio_desde: 99000
    },
    {
      slug: 'soat',
      nombre: 'SOAT',
      descripcion_corta: 'Seguro obligatorio vehículos',
      precio_desde: 320000
    },
    {
      slug: 'medicina-prepagada',
      nombre: 'Medicina Prepagada',
      descripcion_corta: 'Salud Total, Famisanar, Sanitas',
      precio_desde: 150000
    }
  ],
  flyers: [
    {
      titulo: 'Afiliación Integral 2024',
      descripcion: 'EPS + ARL + Pensión + CCF a precio especial',
      drive_id: 'SAMPLE_ID_1' // Mock
    }
  ],
  videos: [
    {
      titulo: 'Cómo afiliarse a la EPS',
      plataforma: 'youtube',
      video_id_o_url: 'dQw4w9WgXcQ' // Placeholder
    }
  ],
  testimonios: [
    {
      nombre: 'Juan García',
      cargo_o_ciudad: 'Bogotá',
      calificacion: 5,
      testimonio: 'Excelente servicio, muy profesionales y rápidos.'
    },
    {
      nombre: 'María López',
      cargo_o_ciudad: 'Medellín',
      calificacion: 5,
      testimonio: 'Me ahorraron tiempo y dinero en mis trámites.'
    },
    {
      nombre: 'Carlos Rodríguez',
      cargo_o_ciudad: 'Cali',
      calificacion: 4,
      testimonio: 'Buena atención y resultados garantizados.'
    }
  ],
  faq: [
    {
      pregunta: '¿Cuánto cuesta la afiliación?',
      respuesta: 'La afiliación a EPS, ARL y pensión no tienen costo. Te asesoramos sin compromiso.'
    },
    {
      pregunta: '¿Cuánto tiempo toma?',
      respuesta: 'Generalmente entre 24 y 48 horas hábiles.'
    },
    {
      pregunta: '¿Es en línea?',
      respuesta: 'Sí, 100% online. Solo necesitas tus documentos digitalizados.'
    }
  ]
};

const PORT = 3001;

const server = http.createServer((req, res) => {
  // Headers CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  // API Routes
  if (req.url === '/api/getAllData' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(mockData));
    return;
  }

  if (req.url === '/api/lead' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const lead = JSON.parse(body);
        console.log('📩 Lead recibido:', lead);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true, mensaje: 'Lead registrado exitosamente' }));
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: false, error: 'Formato inválido' }));
      }
    });
    return;
  }

  // Servir archivos estáticos
  let filePath = path.join(__dirname, 'frontend', req.url === '/' ? 'index.html' : req.url);

  fs.readFile(filePath, (err, content) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/html' });
      res.end('<h1>404 Not Found</h1>', 'utf-8');
      return;
    }

    // Detectar tipo de contenido
    let contentType = 'text/html';
    if (filePath.endsWith('.js')) contentType = 'application/javascript';
    if (filePath.endsWith('.css')) contentType = 'text/css';
    if (filePath.endsWith('.json')) contentType = 'application/json';

    res.writeHead(200, { 'Content-Type': contentType });
    res.end(content, 'utf-8');
  });
});

server.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════════════════╗
║  🚀 Asesorias Seguridad Social - Mock Server Local         ║
╠════════════════════════════════════════════════════════════╣
║  📍 URL: http://localhost:${PORT}                            ║
║  ✅ API Mock en: http://localhost:${PORT}/api/*              ║
║  📧 Leads guardados en console                              ║
║  🔄 CORS habilitado para desarrollo                         ║
║  ⚠️  Datos de prueba - No es producción                     ║
╚════════════════════════════════════════════════════════════╝
  `);
});
