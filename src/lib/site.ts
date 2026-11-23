import { getCollection, type CollectionEntry } from 'astro:content';
import structure from '../data/structure.json';
import books from '../data/books.json';

export type Chapter = CollectionEntry<'chapters'>;

export const modules = structure.modules;
export const parts = structure.parts as Record<string, any[]>;
export const works = structure.works;

export const bookMap = new Map(books.books.map((b) => [b.id, b]));

export function moduleOf(id: string) {
  return modules.find((m) => m.id === id)!;
}

export async function allChapters(): Promise<Chapter[]> {
  const list = await getCollection('chapters');
  return list.sort((a, b) => (a.data.module === b.data.module ? a.data.order - b.data.order : a.data.module.localeCompare(b.data.module)));
}

/** 同一模块内按章号：前一篇 / 后一篇 */
export async function neighbours(slug: string) {
  const all = await allChapters();
  const cur = all.find((c) => c.data.slug === slug);
  if (!cur) return { prev: null, next: null, cur: null };
  const same = all.filter((c) => c.data.module === cur.data.module);
  const i = same.findIndex((c) => c.data.slug === slug);
  return { prev: same[i - 1] ?? null, next: same[i + 1] ?? null, cur };
}

/** 公元前用「前」，公元后不加前缀 */
export function fmtYear(y: number, approx = false): string {
  const s = y < 0 ? '前 ' + Math.abs(y) : String(y);
  return approx ? '约 ' + s : s;
}

export function fmtEra(start: number, end: number): string {
  const f = (y: number) => (y < 0 ? '前 ' + Math.abs(y) : String(y));
  return `${f(start)} — ${f(end)}`;
}

export function bookShort(id: string): string {
  if (id === 'external') return '外部权威来源';
  return bookMap.get(id)?.short ?? id;
}
