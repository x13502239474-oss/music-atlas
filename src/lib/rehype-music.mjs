/**
 * rehype-music
 * 两条排版约定，写在 Markdown 里就能变成出版物结构：
 *
 * 1. [[term-id]]      → <span class="term" data-term="term-id">术语中文名</span>
 *    [[term-id|别的写法]] 可指定显示文字
 * 2. > 边注｜……       → <aside class="mn">       （页边注，仅 6000 字以上长章使用）
 *    > 分歧｜……       → <aside class="dispute">  （两书判断不同，并列呈现）
 *    > 听｜……         → <aside class="listen">   （聆听锚点）
 *    > 引｜……         → <blockquote class="quote">（原文引文）
 *
 * 约定优于配置：写作者只需记住五个前缀，不需要写 HTML。
 */
import fs from 'node:fs';

const G = JSON.parse(
  fs.readFileSync(new URL('../data/glossary.json', import.meta.url), 'utf8')
);
const ZH = new Map(G.terms.map((t) => [t.id, t.zh]));

const MARKERS = {
  '边注｜': { tag: 'aside', className: 'mn' },
  '分歧｜': { tag: 'aside', className: 'dispute' },
  '听｜': { tag: 'aside', className: 'listen' },
  '引｜': { tag: 'blockquote', className: 'quote' },
};

function walk(node, fn) {
  if (!node || !node.children) return;
  for (let i = 0; i < node.children.length; i++) {
    const child = node.children[i];
    fn(child, node, i);
    walk(child, fn);
  }
}

function textOf(node) {
  if (node.type === 'text') return node.value;
  if (!node.children) return '';
  return node.children.map(textOf).join('');
}

export default function rehypeMusic() {
  return (tree) => {
    // 1) 术语标记
    walk(tree, (node, parent, index) => {
      if (node.type !== 'text' || !node.value.includes('[[')) return;
      if (parent && parent.tagName === 'code') return;
      const parts = [];
      const re = /\[\[([a-zA-Z0-9\-]+)(?:\|([^\]]+))?\]\]/g;
      let last = 0;
      let m;
      while ((m = re.exec(node.value))) {
        if (m.index > last) parts.push({ type: 'text', value: node.value.slice(last, m.index) });
        const id = m[1];
        const label = m[2] || ZH.get(id) || id;
        parts.push({
          type: 'element',
          tagName: 'span',
          properties: {
            className: ['term'],
            dataTerm: id,
            tabIndex: 0,
            role: 'button',
          },
          children: [{ type: 'text', value: label }],
        });
        last = m.index + m[0].length;
      }
      if (!parts.length) return;
      if (last < node.value.length) parts.push({ type: 'text', value: node.value.slice(last) });
      parent.children.splice(index, 1, ...parts);
    });

    // 2) 四类版块
    walk(tree, (node) => {
      if (node.type !== 'element' || node.tagName !== 'blockquote') return;
      // 注意：hast 里 blockquote 的首个子节点常是换行文本，必须按元素筛选
      const first = (node.children || []).find(
        (c) => c.type === 'element' && c.tagName === 'p'
      );
      if (!first) return;
      const t = textOf(first);
      for (const [prefix, spec] of Object.entries(MARKERS)) {
        if (!t.startsWith(prefix)) continue;
        const strip = (n) => {
          if (n.type === 'text') {
            if (n.value.startsWith(prefix)) n.value = n.value.slice(prefix.length);
            return true;
          }
          if (n.children) for (const c of n.children) if (strip(c)) return true;
          return false;
        };
        strip(first);
        node.tagName = spec.tag;
        node.properties = { ...(node.properties || {}), className: [spec.className] };
        return;
      }
    });
  };
}
