/* Build a single-file version without external JS dependencies. Run: node scripts/build-standalone.cjs */
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

function loadTypeScript() {
  try { return require('typescript'); } catch { /* Try the global npm installation below. */ }
  try {
    const globalRoot = execFileSync('npm', ['root', '-g'], { encoding: 'utf8' }).trim();
    return require(path.join(globalRoot, 'typescript'));
  } catch {
    throw new Error('TypeScript is needed only to rebuild the standalone file. Run "npm install" in the project folder first.');
  }
}

const ts = loadTypeScript();
const root = path.resolve(__dirname, '..');
const sourceDir = path.join(root, 'js');
const htmlPath = path.join(root, 'index.html');
const cssFiles = [
  'css/tokens.css', 'css/layout.css', 'css/components.css', 'css/profile.css',
  'css/training-log.css', 'css/progress.css', 'css/catalog.css', 'css/responsive.css'
];

function collect(dir, result = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) collect(full, result);
    else if (entry.name.endsWith('.js')) result.push(full);
  }
  return result;
}

const files = collect(sourceDir);
const modules = files.map(file => {
  const id = `js/${path.relative(sourceDir, file).split(path.sep).join('/')}`;
  const source = fs.readFileSync(file, 'utf8');
  const transpiled = ts.transpileModule(source, {
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.CommonJS,
      removeComments: false
    },
    fileName: id
  }).outputText;
  return `${JSON.stringify(id)}: function(require, module, exports) {\n${transpiled}\n}`;
}).join(',\n');

const bundle = `(function(){\n'use strict';\nconst __modules = {\n${modules}\n};\nconst __cache = Object.create(null);\nfunction __resolve(request, parent) {\n  if (!request.startsWith('.')) throw new Error('Unsupported standalone dependency: '+request);\n  const parts = parent.split('/').slice(0,-1);\n  for (const part of request.split('/')) { if (!part || part === '.') continue; if (part === '..') parts.pop(); else parts.push(part); }\n  let id = parts.join('/'); if (!id.endsWith('.js')) id += '.js'; return id;\n}\nfunction __require(id, parent) {\n  if (parent) id = __resolve(id, parent);\n  if (__cache[id]) return __cache[id].exports;\n  const factory = __modules[id]; if (!factory) throw new Error('Module not found: '+id);\n  const module = { exports: {} }; __cache[id] = module;\n  factory((request) => __require(request, id), module, module.exports);\n  return module.exports;\n}\n__require('js/app.js');\n})();`;

let html = fs.readFileSync(htmlPath, 'utf8');
const faviconSvg = fs.readFileSync(path.join(root, 'assets/favicon.svg'), 'utf8');
const faviconDataUri = `data:image/svg+xml;base64,${Buffer.from(faviconSvg).toString('base64')}`;
html = html.replace('href="./assets/favicon.svg"', `href="${faviconDataUri}"`);
for (const [file, mime] of [['favicon-32.png', 'image/png'], ['favicon.ico', 'image/vnd.microsoft.icon'], ['apple-touch-icon.png', 'image/png']]) {
  const bytes = fs.readFileSync(path.join(root, 'assets', file));
  const dataUri = `data:${mime};base64,${bytes.toString('base64')}`;
  html = html.replace(`href="./assets/${file}"`, `href="${dataUri}"`);
}
// A standalone HTML file has no adjacent manifest or PWA icon directory.
html = html.replace(/\s*<link rel="manifest" href="\.\/site\.webmanifest">/, '');
const css = cssFiles.map(file => `/* ${file} */\n${fs.readFileSync(path.join(root, file), 'utf8')}`).join('\n\n');
html = html.replace(/\s*<link rel="stylesheet" href="\.\/css\/[^\"]+">/g, '');
html = html.replace('</head>', `<style>\n${css}\n</style>\n</head>`);
html = html.replace('<script type="module" src="./js/app.js"></script>', `<script>\n${bundle}\n</script>`);
const standalonePath = path.join(root, 'gym-log-standalone.html');
fs.writeFileSync(standalonePath, html, 'utf8');
console.log(`Standalone built: ${standalonePath} (${Buffer.byteLength(html)} bytes, ${files.length} JS modules)`);
