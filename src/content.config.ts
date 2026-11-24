import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

/**
 * 一章 = 一个 Markdown 文件。frontmatter 是硬约束：
 * 没有 sources 的文章不允许进入构建，sources 里的 book 必须是 books.json 中存在的编号。
 * 这是「不假装读过」的工程化保证。
 */

const source = z.object({
  book: z.string(), // yu-2001 / ahwm-10e / yang-1981 ...
  chapter: z.string().optional(),
  section: z.string().optional(),
  pages: z.string().optional(), // 只填实际读到的页码，没读就留空
  used_for: z.string().optional(), // 这本书在这一章具体承担什么
});

const verifyItem = z.object({
  item: z.string(),
  status: z.enum(['verified', 'pending', 'disputed']).default('pending'),
  note: z.string().optional(),
});

const chapters = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content' }),
  schema: z.object({
    slug: z.string(),
    title: z.string(),
    subtitle: z.string().optional(),
    module: z.enum(['M1', 'M2', 'M3', 'M4', 'M5', 'M6', 'M7']),
    part: z.number().int().min(1).max(9),
    partTitle: z.string(),
    order: z.number().int().min(1),
    period: z.string(), // ancient / medieval / ... 或 preqin / qinhan ...
    era: z.object({ start: z.number(), end: z.number() }),
    readingMinutes: z.number().int().min(1),
    summary: z.string(),
    terms: z.array(z.string()).default([]),
    figures: z.array(z.string()).default([]),
    works: z.array(z.string()).default([]),
    related: z.array(z.string()).default([]),
    sources: z.array(source).min(1),
    verify: z.array(verifyItem).default([]),
    status: z.enum(['stub', 'draft', 'review', 'published']).default('draft'),
    updated: z.string().optional(),
  }),
});

export const collections = { chapters };
