import { z } from 'zod';
import { coerceNullableNumber } from './common.schema';

const optionalText = z
  .string()
  .nullish()
  .transform(val => val ?? '');

const movieBaseSchema = z.object({
  slug: z.string().min(1),
  name: z.string().min(1),
  origin_name: optionalText,
  poster_url: optionalText,
  lang: optionalText,
  time: optionalText,
  episode_current: optionalText,
  year: coerceNullableNumber.transform(val => val ?? null),
  category: z
    .array(z.object({ name: z.string() }))
    .nullish()
    .transform(val => (val ?? []).map(c => c.name)),
});

export const movieListResponseSchema = z.object({
  data: z.object({
    items: z.array(movieBaseSchema),
    APP_DOMAIN_CDN_IMAGE: optionalText,
    params: z.object({
      pagination: z.object({
        totalItems: z.number(),
        currentPage: z.number(),
        totalPages: z.number(),
      }),
    }),
  }),
});

export const movieDetailResponseSchema = z.object({
  movie: movieBaseSchema.extend({ content: optionalText }),
  episodes: z
    .array(
      z.object({
        server_name: optionalText,
        server_data: z.array(z.object({ name: optionalText, link_m3u8: optionalText })),
      })
    )
    .nullish()
    .transform(val => val ?? []),
});
