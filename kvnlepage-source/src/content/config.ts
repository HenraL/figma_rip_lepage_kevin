import { defineCollection, z } from 'astro:content';

const projetsCollection = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    number: z.string(),
    cover: z.string(),
    date: z.number(),
    description: z.string().optional(),
  }),
});

export const collections = {
  projets: projetsCollection,
};
