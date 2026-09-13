import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const dir = path.dirname(fileURLToPath(import.meta.url));
const css = fs.readFileSync(path.join(dir, 'orbit.css'), 'utf8');
const js = fs.readFileSync(path.join(dir, 'orbit.js'), 'utf8');
const photos = [
  'photo-1518837695005-2083093ee35b',
  'photo-1441974231531-c6227db76b6e',
  'photo-1497250681960-ef046c08a56e',
  'photo-1500534623283-312aade485b7',
  'photo-1470770841072-f978cf4d019e',
  'photo-1472396961693-142e6e269027',
  'photo-1501854140801-50d01698950b',
  'photo-1464822759023-fed622ff2c3b',
  'photo-1519681393784-d120267933ba',
  'photo-1470252649378-9c29740c9fa8',
  'photo-1447752875215-b2761acb3c5d',
  'photo-1501785888041-af3ef285b470'
];
const config = { height: 420, count: 22, speed: 0.10, radius: 3, intro: true,
  media: photos.map((id, i) => ({ type: 'image', title: '', cardRatio: ['4:3', '1:1', '3:4', '9:16'][i % 4], popup: true, src: `https://images.unsplash.com/${id}?auto=format&fit=crop&w=960&q=85` }))
};
const escaped = obj => JSON.stringify(obj, null, 2).replace(/</g, '\\u003c');
const htmlAttr = value => value
  .replace(/&/g, '&amp;')
  .replace(/"/g, '&quot;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;');
function directEmbed(data) {
  return `<style>\n${css}</style>\n<div class="meya-orbit" data-meya-orbit>\n<!-- Replace the sample media URLs below with your own. -->\n<script type="application/json">\n${escaped(data)}\n</script>\n</div>\n<script>\n${js}</script>`;
}
function iframeEmbed(data) {
  const height = Math.max(200, Math.min(900, Number(data.height) || 420));
  const doc = `<!doctype html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1"><style>html,body{margin:0;width:100%;height:100%;background:transparent;overflow:hidden}</style></head><body>${directEmbed(data)}</body></html>`;
  return `<style>
.meya-orbit-frame{display:block;width:100%;height:${height}px;border:0;background:transparent;overflow:hidden}
@media(max-width:600px){.meya-orbit-frame{height:min(${height}px,330px)}}
</style>
<iframe class="meya-orbit-frame" title="Meya orbit visual" srcdoc="${htmlAttr(doc)}" loading="lazy" scrolling="no" allow="autoplay; fullscreen; picture-in-picture" allowtransparency="true"></iframe>`;
}
const embed = directEmbed(config);
const iframe = iframeEmbed(config);
fs.writeFileSync(path.join(dir, 'webflow-embed.html'), embed);
fs.writeFileSync(path.join(dir, 'webflow-iframe-embed.html'), iframe);
fs.writeFileSync(path.join(dir, 'webflow-script-embed.html'), embed);
fs.writeFileSync(path.join(dir, 'orbit-preview.html'), `<!doctype html>
<html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Meya Orbit</title>
<style>html,body{margin:0;min-height:100%;background:transparent}body{min-height:100vh;display:grid;align-items:center}main{width:100%;max-width:1120px;margin:auto}</style></head>
<body><main>${embed}</main></body></html>`);
const template = fs.readFileSync(path.join(dir, 'editor-template.html'), 'utf8');
const editorCSS = template.match(/<style>\n\/\* ORBIT_CSS \*\/\n([\s\S]*?)\n<\/style>/)?.[1];
if (!editorCSS) throw new Error('Could not extract editor UI styles.');
fs.writeFileSync(path.join(dir, 'editor-ui.css'), editorCSS + '\n');
fs.writeFileSync(path.join(dir, 'orbit-editor.html'), template.replace('/* ORBIT_CSS */', css).replace('/* ORBIT_RUNTIME */', js).replace('/* ORBIT_BUNDLE */', `const bundledCSS = ${JSON.stringify(css)};\nconst bundledJS = ${JSON.stringify(js)};\nconst initial = ${escaped(config)};`));
console.log('Built preview, editor, and Webflow embeds (' + iframe.length + ' iframe characters, ' + embed.length + ' script characters).');
