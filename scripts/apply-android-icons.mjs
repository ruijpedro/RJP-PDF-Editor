import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const androidRes = path.join(root, 'android', 'app', 'src', 'main', 'res');
const source = path.join(root, 'resources', 'android');
const densities = ['mdpi','hdpi','xhdpi','xxhdpi','xxxhdpi'];

if (!fs.existsSync(androidRes)) {
  console.error('Android project not found. Run npx cap add android first.');
  process.exit(1);
}

for (const density of densities) {
  const dir = path.join(androidRes, `mipmap-${density}`);
  fs.mkdirSync(dir, { recursive: true });
  const src = path.join(source, `ic_launcher_${density}.png`);
  for (const name of ['ic_launcher.png','ic_launcher_round.png','rjp_icon_foreground.png']) {
    fs.copyFileSync(src, path.join(dir, name));
  }
}

const anydpi = path.join(androidRes, 'mipmap-anydpi-v26');
fs.mkdirSync(anydpi, { recursive: true });
const adaptive = `<?xml version="1.0" encoding="utf-8"?>\n<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">\n  <background android:drawable="@color/rjp_icon_background" />\n  <foreground android:drawable="@mipmap/rjp_icon_foreground" />\n</adaptive-icon>\n`;
fs.writeFileSync(path.join(anydpi, 'ic_launcher.xml'), adaptive);
fs.writeFileSync(path.join(anydpi, 'ic_launcher_round.xml'), adaptive);

const values = path.join(androidRes, 'values');
fs.mkdirSync(values, { recursive: true });
const colorsPath = path.join(values, 'colors.xml');
let colors = fs.existsSync(colorsPath) ? fs.readFileSync(colorsPath, 'utf8') : '<resources>\n</resources>\n';
if (!colors.includes('rjp_icon_background')) {
  colors = colors.replace('</resources>', '  <color name="rjp_icon_background">#063B63</color>\n</resources>');
  fs.writeFileSync(colorsPath, colors);
}
console.log('RJP PDF Editor Android icons applied.');
