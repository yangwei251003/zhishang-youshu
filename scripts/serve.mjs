import { createServer } from 'node:http';
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { dirname, resolve, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
const port = Number(process.env.PAPER_PORT || 5192);
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..', process.env.PAPER_DIST || (port === 5192 ? 'dist-v4' : 'dist'));
const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.woff': 'font/woff', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.vtt': 'text/vtt; charset=utf-8', '.json': 'application/json; charset=utf-8', '.ico': 'image/x-icon', '.mp4': 'video/mp4', '.webm': 'video/webm', '.mp3': 'audio/mpeg' };
try { await stat(resolve(root, 'index.html')); } catch { console.error('尚未生成运行包。请先在本项目目录运行 npm run build。'); process.exit(1); }
const server = createServer(async (req, res) => {
  try {
    if (!['GET', 'HEAD'].includes(req.method)) { res.writeHead(405); res.end(); return; }
    const pathname = decodeURIComponent(new URL(req.url, 'http://127.0.0.1').pathname);
    const file = resolve(root, '.' + (pathname === '/' ? '/index.html' : pathname));
    if (!file.startsWith(root + sep)) { res.writeHead(403); res.end(); return; }
    const info = await stat(file);
    const headers = { 'Content-Type': mime[extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-cache', 'X-Content-Type-Options': 'nosniff', 'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; worker-src 'self' blob:; connect-src 'self'; frame-src https://player.bilibili.com; media-src 'self' blob:; object-src 'none'; base-uri 'self'", 'Accept-Ranges':'bytes' };
    if(!info.isFile()){res.writeHead(404);res.end();return;}
    let start=0,end=info.size-1,status=200;
    if(req.headers.range){
      const match=/^bytes=(\d*)-(\d*)$/.exec(req.headers.range);
      if(!match || (!match[1]&&!match[2])){res.writeHead(416,{'Content-Range':`bytes */${info.size}`});res.end();return;}
      if(match[1]){start=Number(match[1]);if(match[2])end=Math.min(Number(match[2]),end);}else start=Math.max(0,info.size-Number(match[2]));
      if(!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||start<0||start>end||start>=info.size){res.writeHead(416,{'Content-Range':`bytes */${info.size}`});res.end();return;}
      status=206;headers['Content-Range']=`bytes ${start}-${end}/${info.size}`;
    }
    headers['Content-Length']=Math.max(0,end-start+1);res.writeHead(status,headers);
    if(req.method==='HEAD'||!info.size){res.end();return;}
    const stream=createReadStream(file,{start,end});stream.on('error',()=>res.destroy());res.on('close',()=>stream.destroy());stream.pipe(res);
  } catch { res.writeHead(404); res.end('文件不存在'); }
});
server.on('error', error => { console.error(error.code === 'EADDRINUSE' ? `端口 ${port} 已被占用。请自行安排端口；不会结束其他服务。` : error.message); process.exitCode = 1; });
server.listen(port, '127.0.0.1', () => console.log(`纸上有数已启动：http://127.0.0.1:${port}\n仅本机可访问。关闭窗口或按 Ctrl+C 停止。`));
