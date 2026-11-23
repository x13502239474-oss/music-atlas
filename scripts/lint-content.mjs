/**
 * 内容纪律检查：拦三类最容易失守的问题
 * 1. 编造页码（sources.pages 有值但语焉不详）
 * 2. 伪装成原文的直接引语（说：「……」「……写道」
 * 3. 空话与占位
 * 用法：node scripts/lint-content.mjs
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve('src/content');
const files = [];
(function walk(d) {
  for (const f of fs.readdirSync(d)) {
    const p = path.join(d, f);
    if (fs.statSync(p).isDirectory()) walk(p);
    else if (f.endsWith('.md')) files.push(p);
  }
})(ROOT);

const BANNED = [
  [/随着社会的发展/g, '空话：随着社会的发展'],
  [/对后世(产生|影响)深远/g, '空话：对后世影响深远'],
  [/具有重要的(历史|艺术)地位/g, '空话：具有重要地位'],
  [/Lorem\b|TODO\b|TBD\b|待补充正文|\bPLACEHOLDER\b|\[待写\]/g, '占位符'],
  [/旋律优美|情感真挚|气势恢宏|意境深远/g, '空泛审美评价'],
];

const QUOTE = /(说|写道|云|记载|认为|提出)[：:]\s*[「“][^」”]{6,}[」”]/g;

let bad = 0;
const rows = [];

for (const f of files) {
  const raw = fs.readFileSync(f, 'utf8');
  const [fm, ...rest] = raw.split('---').slice(1);
  const body = rest.join('---');
  const issues = [];

  // frontmatter 必填
  for (const key of ['slug', 'title', 'module', 'order', 'sources', 'verify', 'summary']) {
    if (!new RegExp(`^${key}:`, 'm').test(fm)) issues.push(`缺字段 ${key}`);
  }
  // 页码
  const pg = fm.match(/pages:\s*["']?([^"'\n]+)/);
  if (pg && /\d/.test(pg[1])) issues.push(`填了页码「${pg[1].trim()}」——须确认真的读过`);
  // 直接引语
  const qs = body.match(QUOTE) || [];
  if (qs.length) issues.push(`疑似直接引语 ${qs.length} 处（须能确认原文，否则改转述）`);
  // 空话
  for (const [re, msg] of BANNED) if (re.test(body)) issues.push(msg);
  // 长度
  const chars = body.replace(/\s/g, '').length;
  if (chars < 4500) issues.push(`正文仅 ${chars} 字，低于 4500`);

  const blocks = {
    分歧: (body.match(/>\s*分歧｜/g) || []).length,
    边注: (body.match(/>\s*边注｜/g) || []).length,
    听: (body.match(/>\s*听｜/g) || []).length,
  };
  const terms = (body.match(/\[\[/g) || []).length;
  const tables = (body.match(/^\|.*\|$/gm) || []).length;
  const h2 = (body.match(/^## /gm) || []).length;

  rows.push({ f: path.relative(ROOT, f), chars, h2, terms, tables, ...blocks, issues });
  if (issues.length) bad += 1;
}

console.log(
  ['文件', '字数', 'H2', '术语', '表行', '分歧', '边注', '听'].join('\t')
);
for (const r of rows) {
  console.log([r.f, r.chars, r.h2, r.terms, r.tables, r.分歧, r.边注, r.听].join('\t'));
}

if (bad) {
  console.log('\n=== 需要处理 ===');
  for (const r of rows) if (r.issues.length) console.log(`${r.f}\n  - ${r.issues.join('\n  - ')}`);
  process.exitCode = 1;
} else {
  console.log('\n全部通过。');
}
