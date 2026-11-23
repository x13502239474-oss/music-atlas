// 从总纲的章节规划 + 已落地正文，生成进度数据 progress.json
import fs from 'node:fs';
import path from 'node:path';

const model = {
  M1: { name: '世界音乐史', total: 50, parts: [
    ['第一篇 古代音乐文明',1,7],['第二篇 中世纪',8,14],['第三篇 文艺复兴',15,21],
    ['第四篇 巴洛克',22,29],['第五篇 古典主义',30,34],['第六篇 浪漫主义',35,41],
    ['第七篇 二十世纪',42,46],['第八篇 战后与当代',47,50]]},
  M2: { name: '中国音乐史', total: 63, parts: [
    ['第一篇 先秦',1,7],['第二篇 秦汉',8,13],['第三篇 魏晋南北朝',14,18],
    ['第四篇 隋唐五代',19,26],['第五篇 宋元',27,34],['第六篇 明清',35,46],
    ['第七篇 中国近代',47,56],['第八篇 中国现代（后置）',57,63]]},
  M3: { name: '音乐理论', total: 34, parts: [
    ['阶段一 音乐基础',1,5],['阶段二 基础乐理',6,15],['阶段三 和声与复调',16,22],
    ['阶段四 音乐结构',23,31],['阶段五 高级知识',32,34]]},
  M4: { name: '作曲家与流派', total: 40, parts: [
    ['西方作曲家',1,22],['中国作曲家',23,28],['音乐流派',29,40]]},
  M5: { name: '作品鉴赏', total: 10, parts: [['十部经典',1,10]]},
  M6: { name: '世界民族音乐', total: 36, parts: [
    ['民族音乐学方法',1,3],['中国传统音乐',4,11],['南亚',12,15],['阿拉伯世界',16,19],
    ['非洲',20,23],['东亚',24,27],['东南亚',28,31],['中亚与丝路',32,34],['拉美与加勒比',35,36]]},
  M7: { name: '现代与流行音乐', total: 18, parts: [
    ['流派史',1,14],['横向专题',15,18]]},
};

const field = (txt, key) => {
  const m = txt.match(new RegExp('^' + key + ':\\s*(.+)$', 'm'));
  return m ? m[1].trim() : null;
};

// 扫描已写章节
const written = [];
for (const dir of ['west','china','theory','composers','works','world','modern']) {
  const d = path.join('src/content', dir);
  if (!fs.existsSync(d)) continue;
  for (const f of fs.readdirSync(d).filter(x => x.endsWith('.md'))) {
    const txt = fs.readFileSync(path.join(d, f), 'utf8');
    const slug = field(txt, 'slug');
    const order = field(txt, 'order');
    const module = field(txt, 'module');
    const title = field(txt, 'title');
    if (slug && module && order) written.push({ slug, module, order: Number(order), title });
  }
}

const out = { generated: new Date().toISOString().slice(0,10), modules: [] };
let grandTotal = 0, grandDone = 0;
for (const [mid, info] of Object.entries(model)) {
  const mparts = [];
  let done = 0;
  for (const [name, a, b] of info.parts) {
    const chapters = [];
    let nDone = 0;
    for (let n = a; n <= b; n++) {
      const hit = written.find(w => w.module === mid && w.order === n);
      chapters.push({ order: n, slug: hit?.slug ?? null, title: hit?.title ?? null });
      if (hit) nDone++;
    }
    done += nDone;
    mparts.push({ name, range: [a, b], count: b - a + 1, done: nDone, chapters });
  }
  grandTotal += info.total; grandDone += done;
  out.modules.push({ id: mid, name: info.name, total: info.total, done, parts: mparts });
}
out.grandTotal = grandTotal; out.grandDone = grandDone;
fs.writeFileSync('src/data/progress.json', JSON.stringify(out, null, 2));
console.log(`总章 ${grandTotal} 已写 ${grandDone} 完成率 ${(grandDone/grandTotal*100).toFixed(1)}%`);
for (const m of out.modules) console.log(`  ${m.id} ${m.name}: ${m.done}/${m.total}`);
