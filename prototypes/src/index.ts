import { tr } from './common/i18n.ts';

const nav = document.getElementById('links')!;
const h1 = document.createElement('h1');
h1.textContent = tr('title');
nav.append(h1);
for (const [href, key] of [
  ['2d.html', 'link2d'],
  ['3d.html', 'link3d'],
] as const) {
  const a = document.createElement('a');
  a.href = href;
  a.textContent = tr(key);
  nav.append(a);
}
