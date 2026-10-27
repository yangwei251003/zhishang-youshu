import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const packages = ['react', 'react-dom', 'scheduler', 'clipper2-ts', 'lucide-react', '@fontsource/noto-serif-sc'];
const sections = ['# 第三方运行时依赖与许可\n\n本文件从已安装且被锁定的运行时依赖提取。应用自己的程序化教学图案独立编写；未复制先例应用源码或图案。开发依赖版本见package-lock.json。\n'];
sections.push('第三版10段官方播放器嵌入教程，以及原创合成音效与音乐，逐项登记于 docs/content-sources.md。下面的软件与字体许可证不适用于外站视频；公开嵌入不代表额外开放许可。\n');
for (const name of packages) {
  const dir = resolve(root, 'node_modules', name);
  const pkg = JSON.parse(await readFile(resolve(dir, 'package.json'), 'utf8'));
  let licenseText = '';
  for (const file of ['LICENSE', 'LICENSE.txt', 'LICENSE.md', 'OFL.txt', 'license', 'license.txt']) {
    try { licenseText = await readFile(resolve(dir, file), 'utf8'); if (licenseText) break; } catch {}
  }
  if (!licenseText) throw new Error(`${name}: 缺少许可原文，请核对`);
  const url = typeof pkg.repository === 'string' ? pkg.repository : pkg.repository?.url;
  sections.push(`## ${name} ${pkg.version}\n\n许可：${pkg.license}\n\n来源：${url || pkg.homepage || ''}\n\n\`\`\`text\n${licenseText.trim()}\n\`\`\`\n`);
}
await writeFile(resolve(root, 'THIRD_PARTY_NOTICES.md'), sections.join('\n'), 'utf8');
await mkdir(resolve(root, 'public'), { recursive: true });
await writeFile(resolve(root, 'public', 'third-party-notices.txt'), sections.join('\n'), 'utf8');
console.log('已整理运行时依赖与字体许可。');
