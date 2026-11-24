// 交付前质量门禁：章节数、frontmatter、术语合法性、related 死链、构建产物
// 用法：node scripts/preflight.mjs
import fs from 'node:fs';
import path from 'node:path';

const ROOT = 'src/content';
const files = [];
for (const d of fs.readdirSync(ROOT)) {
  const p = path.join(ROOT, d);
  if (!fs.statSync(p).isDirectory()) continue;
  for (const f of fs.readdirSync(p).filter((x) => x.endsWith('.md'))) files.push(path.join(p, f));
}

const glossary = JSON.parse(fs.readFileSync('src/data/glossary.json', 'utf8'));
const termIds = new Set(glossary.terms.map((t) => t.id));
const books = new Set(JSON.parse(fs.readFileSync('src/data/books.json', 'utf8')).books.map((b) => b.id));
books.add('external');

const field = (txt, key) => (txt.match(new RegExp('^' + key + ':\\s*(.+)$', 'm')) || [])[1]?.trim();

// 收集真实 slug 与短号
const slugs = new Set();
const short = new Map();
for (const f of files) {
  const s = field(fs.readFileSync(f, 'utf8'), 'slug');
  if (s) slugs.add(s);
}
for (const s of slugs) {
  const m = s.match(/^(m\d+-\d+)/);
  if (m && !short.has(m[1])) short.set(m[1], s);
}

const problems = [];
const byModule = {};
for (const f of files) {
  const txt = fs.readFileSync(f, 'utf8');
  const [fm, ...rest] = txt.split('---').slice(1);
  const body = rest.join('---');
  const name = path.basename(f);
  const mod = field(txt, 'module');
  byModule[mod] = (byModule[mod] || 0) + 1;

  // frontmatter 必填
  for (const key of ['slug', 'title', 'module', 'order', 'part', 'partTitle', 'period', 'era', 'summary', 'sources', 'verify']) {
    if (!new RegExp('^' + key + ':', 'm').test(fm)) problems.push(`${name}: 缺字段 ${key}`);
  }
  // 术语合法性
  const tm = fm.match(/^terms:\s*\[([^\]]*)\]/m);
  if (tm) {
    for (const id of tm[1].split(',').map((x) => x.trim().replace(/^["']|["']$/g, '')).filter(Boolean)) {
      if (!termIds.has(id)) problems.push(`${name}: 术语 id 不存在 ${id}`);
    }
  }
  // 书目合法性
  const bookIds = [...fm.matchAll(/^\s*-\s*book:\s*(\S+)/gm)].map((m) => m[1]);
  for (const b of bookIds) if (!books.has(b)) problems.push(`${name}: book id 不存在 ${b}`);
  // verify.status 合法性
  for (const m of fm.matchAll(/^\s*status:\s*(\S+)/gm)) {
    if (!['verified', 'pending', 'disputed', 'review', 'draft', 'published', 'stub'].includes(m[1])) {
      problems.push(`${name}: status 非法 ${m[1]}`);
    }
  }
  // related 死链
  const rm = fm.match(/^related:\s*\[([^\]]*)\]/m);
  if (rm) {
    for (const r of rm[1].split(',').map((x) => x.trim().replace(/^["']|["']$/g, '')).filter(Boolean)) {
      if (!slugs.has(r) && !short.has(r)) problems.push(`${name}: related 死链 ${r}`);
    }
  }
  // 字数与结构
  const chars = body.replace(/\s/g, '').length;
  if (chars < 4500) problems.push(`${name}: 正文 ${chars} 字偏低`);
  if ((body.match(/^## /gm) || []).length < 8) problems.push(`${name}: 二级标题不足 8 个`);
  if (!/> 分歧｜/.test(body)) problems.push(`${name}: 缺分歧框`);
}

console.log('各模块章节数:', JSON.stringify(byModule));
console.log('章节总数:', files.length, '/ 251');
console.log('问题数:', problems.length);
for (const p of problems.slice(0, 80)) console.log('  -', p);
if (problems.length > 80) console.log(`  ... 另有 ${problems.length - 80} 条`);
if (fs.existsSync('dist/search-index.json')) console.log('搜索索引: 已生成', (fs.statSync('dist/search-index.json').size / 1024).toFixed(0) + 'KB');
process.exitCode = problems.length ? 1 : 0;
