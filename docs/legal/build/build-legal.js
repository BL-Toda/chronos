// Build script: converts docs/legal/ja/*.md into embedded HTML for prototypes/chronos-legal.html
// Usage: node build-legal.js  (writes prototypes/chronos-legal.html from template)
const fs = require('fs');
const path = require('path');
const ROOT = '/Users/shun/chronos';
const SRC = path.join(ROOT, 'docs/legal/ja');
const OUT = path.join(ROOT, 'prototypes/chronos-legal.html');
const TEMPLATE = path.join(__dirname, 'legal-template.html');

function esc(s){return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}

// inline: escape, then bold, code, links, bare URLs, TODO markers, <br>
function inline(raw){
  // preserve literal <br> in tables
  let s = raw.replace(/<br\s*\/?>/gi, 'BR');
  s = esc(s);
  s = s.replace(/BR/g, '<br>');
  // code
  s = s.replace(/`([^`]+)`/g, (m,c)=>'<code>'+c+'</code>');
  // bold
  s = s.replace(/\*\*([^*]+?)\*\*/g, '<strong>$1</strong>');
  // markdown links [text](url)
  s = s.replace(/\[([^\]]+)\]\((https?:[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
  // bare urls (not already inside href) — allow trailing ) removal
  s = s.replace(/(^|[^"'>])(https?:\/\/[^\s<）)]+)/g, (m,pre,url)=>pre+'<a href="'+url+'" target="_blank" rel="noopener">'+url+'</a>');
  // TODO / 推奨値 markers
  s = s.replace(/\[TODO(:[^\]]*)?\]/g, (m)=>'<span class="todo">'+m+'</span>');
  s = s.replace(/\[推奨値\]/g, '<span class="todo todo-soft">[推奨値]</span>');
  // 括弧書き（全角・半角）を小さく表示。タグ・TODOマーカー内は対象外
  s = s.replace(/（([^（）<>]*)）|\(([^()<>]*)\)/g, (m, j, h) => {
    const inner = j !== undefined ? j : h;
    if (/^TODO|^推奨値/.test(inner)) return m;
    const open = j !== undefined ? '（' : '(', close = j !== undefined ? '）' : ')';
    return '<span class="paren">' + open + inner + close + '</span>';
  });
  return s;
}

function slug(text, used){
  let base = text.replace(/<[^>]+>/g,'').replace(/[（(].*$/,'').trim()
    .replace(/[^\p{L}\p{N}]+/gu,'-').replace(/^-|-$/g,'').toLowerCase();
  if(!base) base='s';
  let s=base, i=2; while(used.has(s)){s=base+'-'+(i++);} used.add(s); return s;
}

// Parse markdown into block list
function parseBlocks(lines){
  const blocks=[]; let i=0;
  const isTable=l=>/^\s*\|/.test(l);
  const isOl=l=>/^\s*\d+\.\s/.test(l);
  const isUl=l=>/^\s*[-*]\s/.test(l);
  const indentOf=l=>l.match(/^\s*/)[0].length;
  function parseTable(rows){
    const cells=r=>r.trim().replace(/^\||\|$/g,'').split('|').map(c=>c.trim());
    const head=cells(rows[0]); const body=rows.slice(2).map(cells);
    return {type:'table',head,body};
  }
  function parseList(startIdx, baseIndent, ordered){
    // returns [listBlock, nextIdx]
    const items=[]; let k=startIdx;
    while(k<lines.length){
      const l=lines[k];
      if(l.trim()===''){ // blank: lookahead — continuation if next nonblank is deeper indented or same-level list item of same type
        let j=k; while(j<lines.length && lines[j].trim()==='') j++;
        if(j>=lines.length) break;
        const nl=lines[j]; const ni=indentOf(nl);
        if(ni>baseIndent){ k=j; }
        else if(ni===baseIndent && ((ordered&&isOl(nl)&&!/^\s*1\.\s/.test(nl))||(!ordered&&isUl(nl)))){ k=j; }
        else break;
        continue;
      }
      const ind=indentOf(l);
      if(ind<baseIndent) break;
      if(ind===baseIndent){
        if(ordered?isOl(l):isUl(l)){
          const text=l.replace(/^\s*(\d+\.|[-*])\s+/,'');
          items.push({text, children:[]}); k++; continue;
        } else break;
      }
      // deeper indent → nested content of last item
      if(!items.length) break;
      const item=items[items.length-1];
      if(isTable(l)){ let rows=[]; while(k<lines.length&&isTable(lines[k])){rows.push(lines[k]);k++;} item.children.push(parseTable(rows)); continue; }
      if(isOl(l)||isUl(l)){ const [blk,nk]=parseList(k,ind,isOl(l)); item.children.push(blk); k=nk; continue; }
      // paragraph lines (preserve line breaks)
      let ptxt=[]; while(k<lines.length&&lines[k].trim()!==''&&indentOf(lines[k])>baseIndent&&!isTable(lines[k])&&!isOl(lines[k])&&!isUl(lines[k])){ptxt.push(lines[k].trim());k++;}
      item.children.push({type:'p',lines:ptxt});
    }
    return [{type:ordered?'ol':'ul',items},k];
  }
  while(i<lines.length){
    const l=lines[i];
    if(l.trim()===''){i++;continue;}
    if(/^---+\s*$/.test(l)){blocks.push({type:'hr'});i++;continue;}
    const h=l.match(/^(#{1,6})\s+(.*)$/);
    if(h){blocks.push({type:'h',level:h[1].length,text:h[2].trim()});i++;continue;}
    if(/^>\s?/.test(l)){let t=[];while(i<lines.length&&/^>\s?/.test(lines[i])){t.push(lines[i].replace(/^>\s?/,''));i++;}blocks.push({type:'quote',lines:t});continue;}
    if(isTable(l)){let rows=[];while(i<lines.length&&isTable(lines[i])){rows.push(lines[i]);i++;}blocks.push(parseTable(rows));continue;}
    if(isOl(l)||isUl(l)){const [blk,n]=parseList(i,indentOf(l),isOl(l));blocks.push(blk);i=n;continue;}
    let p=[];while(i<lines.length&&lines[i].trim()!==''&&!/^(#{1,6})\s/.test(lines[i])&&!isTable(lines[i])&&!isOl(lines[i])&&!isUl(lines[i])&&!/^>/.test(lines[i])&&!/^---+\s*$/.test(lines[i])){p.push(lines[i].trim());i++;}
    blocks.push({type:'p',lines:p});
  }
  return blocks;
}

function renderBlocks(blocks, ctx){
  return blocks.map(b=>renderBlock(b,ctx)).join('\n');
}
function renderBlock(b, ctx){
  switch(b.type){
    case 'hr': return '';
    case 'p': return '<p>'+b.lines.map(inline).join('<br>')+'</p>';
    case 'quote': return '<blockquote>'+b.lines.map(l=>'<p>'+inline(l)+'</p>').join('')+'</blockquote>';
    case 'table': {
      const th=b.head.map(c=>'<th>'+inline(c)+'</th>').join('');
      const rows=b.body.map(r=>'<tr>'+r.map(c=>'<td>'+inline(c)+'</td>').join('')+'</tr>').join('');
      return '<div class="tbl"><table><thead><tr>'+th+'</tr></thead><tbody>'+rows+'</tbody></table></div>';
    }
    case 'ol': case 'ul': {
      const items=b.items.map(it=>{
        let inner='<p>'+inline(it.text)+'</p>';
        if(it.children.length) inner+= it.children.map(c=>renderBlock(c,ctx)).join('');
        return '<li>'+inner+'</li>';
      }).join('');
      return '<'+b.type+'>'+items+'</'+b.type+'>';
    }
    case 'h': return renderHeading(b,ctx);
  }
  return '';
}

// Heading normalization per document
// role: 'title' | 'part' | 'section' (TOC) | 'sub'
function renderHeading(b, ctx){
  const role=ctx.role(b);
  const text=b.text;
  if(role==='title') return '';
  if(role==='part'){ return '<div class="part-label">'+inline(text)+'</div>'; }
  if(role==='section'){
    const id=slug(text, ctx.used);
    ctx.toc.push({id, text:text.replace(/\*\*/g,'')});
    var domId=ctx.key+'-'+id;
    // split leading number token (第1条 / 1. / 付則A / A.1) for mono styling
    const m=text.match(/^((?:第\d+条|\d+\.|付則[A-D]|[A-D]\.\d+)\s*)(.*)$/);
    const html= m? '<span class="num">'+esc(m[1].trim())+'</span>'+(/^[（(]/.test(m[2])?'':' ')+inline(m[2]) : inline(text);
    return '<h2 id="'+domId+'">'+html+'</h2>';
  }
  const m=text.match(/^((?:\d+\.\d+|[A-D]\.\d+)\s*)(.*)$/);
  const html= m? '<span class="num">'+esc(m[1].trim())+'</span> '+inline(m[2]) : inline(text);
  return '<h3>'+html+'</h3>';
}

function build(file, opts){
  const md=fs.readFileSync(path.join(SRC,file),'utf8');
  let lines=md.split('\n');
  // strip top meta lines & draft note (rendered in notice band instead)
  const meta={};
  const body=[]; let inHead=true;
  for(const l of lines){
    if(inHead){
      const mu=l.match(/^最終更新日:\s*(.*)$/); if(mu){meta.updated=mu[1].trim();continue;}
      const me=l.match(/^発効日:\s*(.*)$/); if(me){meta.effective=me[1].trim();continue;}
      if(/^>\s*\*\*注記/.test(l)){meta.note=l.replace(/^>\s?/,'');continue;}
      if(/^## 目次/.test(l)){meta.skipToc=true;}
    }
    if(/^# /.test(l)&&body.length===0){meta.title=l.replace(/^# /,'').trim();continue;}
    if(/^# /.test(l)&&body.length>0){inHead=false;}
    if(/^## /.test(l)&&!/^## 目次/.test(l)) inHead=false;
    body.push(l);
  }
  // remove 目次 section (list without links) — replaced by sidebar TOC
  if(opts.dropToc){
    const out=[]; let skipping=false;
    for(const l of body){
      if(/^## 目次/.test(l)){skipping=true;continue;}
      if(skipping&&(/^#{1,2} /.test(l)||/^---+\s*$/.test(l))){skipping=false;}
      if(!skipping) out.push(l);
    }
    lines=out;
  } else lines=body;
  if(opts.prependSection){ // tokushoho: give the main table an anchorable section heading for the TOC
    const idx=lines.findIndex(l=>/^\s*\|/.test(l));
    if(idx>=0) lines.splice(idx,0,'## '+opts.prependSection,'');
  }
  const blocks=parseBlocks(lines);
  const ctx={used:new Set(),toc:[],role:opts.role,key:opts.key};
  const html=renderBlocks(blocks,ctx);
  return {html,toc:ctx.toc,meta};
}

const docs={
  terms: build('terms.md',{key:'terms',role:b=> b.level===1?'title': b.level===2?'part': b.level===3?'section':'sub'}),
  privacy: build('privacy.md',{key:'privacy',dropToc:true, role:b=> b.level===1?'part': b.level===2?'section':'sub'}),
  tokushoho: build('tokushoho.md',{key:'tokushoho',prependSection:'表記事項',role:b=> b.level===1?'title': b.level===2?'section':'sub'}),
};
// title-role for privacy: first h1 was stripped as title already; remaining h1 = parts. ok.

let tpl=fs.readFileSync(TEMPLATE,'utf8');
for(const k of Object.keys(docs)){
  const d=docs[k];
  tpl=tpl.replace('<!--BODY:'+k+'-->', d.html);
  tpl=tpl.replace('<!--TOC:'+k+'-->', d.toc.map(t=>'<li><a href="#'+k+'/'+t.id+'" data-target="'+t.id+'">'+esc(t.text)+'</a></li>').join('\n'));
  tpl=tpl.replace('<!--EFFECTIVE:'+k+'-->', d.meta.effective? '<span class="notice-item">発効日: '+inline(d.meta.effective)+'</span>':'');
}
fs.writeFileSync(OUT,tpl);
console.log('written', OUT, Object.fromEntries(Object.entries(docs).map(([k,d])=>[k,{toc:d.toc.length,size:d.html.length,meta:d.meta}])));
