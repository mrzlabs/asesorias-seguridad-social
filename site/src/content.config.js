import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

// Los articulos viven como Markdown en el repositorio: quedan
// versionados, se revisan en un diff y no dependen de la hoja.
const blog = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/blog' }),
  schema: z.object({
    titulo: z.string(),
    tituloSeo: z.string().max(65),
    descripcion: z.string().min(70).max(160),
    fecha: z.date(),
    actualizado: z.date().optional(),
    categoria: z.enum(['normativa', 'guias', 'seguros', 'empresas']),
    servicioRelacionado: z.string().optional(),
    borrador: z.boolean().default(false),
  }),
});

export const collections = { blog };
