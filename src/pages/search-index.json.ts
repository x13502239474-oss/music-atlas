import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { moduleOf } from '../lib/site';

export const GET: APIRoute = async () => {
  const list = await getCollection('chapters');

  const docs = list.map((e) => {
    const d = e.data;
    const body = (e.body ?? '')
      .replace(/^---[\s\S]*?---/, '')
      .replace(/\n?>\s*(边注|分歧|听|引)｜/g, ' ')
      .replace(/[#>*`|\[\]()\-—]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    return {
      slug: d.slug,
      title: d.title,
      subtitle: d.subtitle ?? '',
      module: d.module,
      moduleTitle: moduleOf(d.module).title,
      summary: d.summary,
      minutes: d.readingMinutes,
      text: body,
    };
  });

  return new Response(JSON.stringify(docs), {
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
};
