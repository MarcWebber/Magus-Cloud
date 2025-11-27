// src/utils/previewUtils.ts
import fs from 'fs';
import fsp from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { spawn } from 'child_process';

// ===== 原有的 MIME / 扩展名常量 =====
export const mimeByExt: Record<string, string> = {
    jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', gif: 'image/gif', bmp: 'image/bmp', webp: 'image/webp',
    txt: 'text/plain', md: 'text/markdown', html: 'text/plain', css: 'text/css', js: 'text/javascript',
    ts: 'text/typescript', json: 'application/json', xml: 'text/xml', csv: 'text/csv',
    py: 'text/plain', java: 'text/plain', cpp: 'text/plain', c: 'text/plain',
    doc: 'application/msword',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    rtf: 'application/rtf',
    xls: 'application/vnd.ms-excel',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ppt: 'application/vnd.ms-powerpoint',
    pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    pdf: 'application/pdf',
};

// ===== 原有的基础工具函数 =====
export const extOf = (name: string) => name.split('.').pop()?.toLowerCase() || '';

export const isDev = process.env.NODE_ENV === 'development';

// ===== 原有的安全路径 & 缓存相关 =====
export const CACHE_DIR = path.resolve(process.cwd(), 'cache-office');
export const LO_PROFILE_DIR = path.join(CACHE_DIR, 'lo-profile');

export async function ensureCacheDir() {
    if (!fs.existsSync(CACHE_DIR)) await fsp.mkdir(CACHE_DIR, { recursive: true });
    if (!fs.existsSync(LO_PROFILE_DIR)) await fsp.mkdir(LO_PROFILE_DIR, { recursive: true });
}

export function safeResolve(baseDir: string, subPath: string) {
    const realBase = path.resolve(baseDir);
    const target = path.resolve(baseDir, subPath);
    if (!target.startsWith(realBase + path.sep)) throw new Error('PathTraversal');
    return target;
}

export function hashKey(filePath: string, stat: fs.Stats, target: 'html' | 'pdf') {
    const h = crypto.createHash('sha256');
    h.update(filePath);
    h.update(String(stat.size));
    h.update(String(stat.mtimeMs));
    h.update(target);
    return h.digest('hex').slice(0, 16);
}

export async function detectFileByExt(dir: string, ext: string) {
    const files = await fsp.readdir(dir);
    const found = files.find(f => f.toLowerCase().endsWith('.' + ext));
    return found ? path.join(dir, found) : null;
}

// ===== 原有的 PDF 验证工具 =====
export async function isValidPdf(p: string) {
    try {
        const stat = await fsp.stat(p);
        if (!stat.size || stat.size < 128) return false;
        const fd = await fsp.open(p, 'r');
        const buf = Buffer.alloc(5);
        await fd.read(buf, 0, 5, 0);
        await fd.close();
        return buf.toString('utf8') === '%PDF-';
    } catch {
        return false;
    }
}

// ===== 原有的 LibreOffice 调用 =====
export function runSoffice(srcPath: string, outDir: string, fmt: 'html' | 'pdf') {
    const args = [
        `-env:UserInstallation=file://${LO_PROFILE_DIR.replace(/ /g, '%20')}`,
        '--headless', '--nologo', '--nofirststartwizard',
        '--convert-to', fmt,
        '--outdir', outDir,
        srcPath,
    ];
    return new Promise<void>((resolve, reject) => {
        const p = spawn('soffice', args, { stdio: ['ignore', 'pipe', 'pipe'] });
        let err = '';
        p.on('error', (e) => reject(e));
        p.stderr.on('data', d => { err += d.toString(); });
        p.on('close', (code) => {
            if (code === 0) resolve();
            else reject(new Error(`soffice failed(${code}): ${err.trim()}`));
        });
    });
}

export async function convertWithSoffice(srcPath: string, target: 'html' | 'pdf') {
    await ensureCacheDir();
    const stat = await fsp.stat(srcPath);
    const key = hashKey(srcPath, stat, target);
    const outDir = path.join(CACHE_DIR, key);
    const done = path.join(outDir, `.done.${target}`);

    if (fs.existsSync(done)) {
        const mainCached = target === 'html'
            ? await detectFileByExt(outDir, 'html')
            : await detectFileByExt(outDir, 'pdf');
        if (mainCached) {
            if (target === 'pdf') {
                if (await isValidPdf(mainCached)) return mainCached;
            } else {
                if ((await fsp.stat(mainCached)).size > 0) return mainCached;
            }
        }
    }

    await fsp.rm(outDir, { recursive: true, force: true });
    await fsp.mkdir(outDir, { recursive: true });

    await runSoffice(srcPath, outDir, target);

    const main = target === 'html'
        ? await detectFileByExt(outDir, 'html')
        : await detectFileByExt(outDir, 'pdf');

    if (!main) throw new Error('Soffice output missing');
    if (target === 'pdf') {
        if (!(await isValidPdf(main))) throw new Error('Invalid PDF produced by soffice');
    } else {
        const size = (await fsp.stat(main)).size;
        if (size === 0) throw new Error('Empty HTML produced by soffice');
    }

    await fsp.writeFile(done, Date.now().toString());
    return main;
}

// ===== 原有的 HTML 包裹函数 =====
export function wrapHtml(inner: string, wide = false) {
    return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<style>
  html, body { height: 100%; }
  body { margin: 0; padding: 16px; background: #fff; color: #222; box-sizing: border-box; }
  *, *::before, *::after { box-sizing: inherit; }
  .doc-container { max-width: ${wide ? '1400px' : '1000px'}; margin: 0 auto; }
  img { max-width: 100%; height: auto; }
  table { border-collapse: collapse; max-width: 100%; table-layout: auto; }
  table, td, th { border: 1px solid #ddd; }
  td, th { padding: 6px 8px; }
  .WordSection1, .Section0, .page, .sd-page {
    width: 100% !important; max-width: 100% !important;
    height: auto !important; max-height: none !important;
    overflow: visible !important;
  }
  [style*="overflow:auto"], [style*="overflow: scroll"] { overflow: visible !important; }
  [style*="height:"], [style*="max-height:"] { height: auto !important; max-height: none !important; }
  [style*="width:595"], [style*="width:596"], [style*="width:612"], [style*="width:794"], [style*="width:842"] {
    width: 100% !important; max-width: 100% !important;
  }
</style>
</head>
<body>
  <div class="doc-container">${inner}</div>
  <script>
  (function() {
    function unboxPages() {
      try {
        var nodes = Array.prototype.slice.call(document.querySelectorAll('div, section, main, article, body'));
        nodes.forEach(function(el) {
          var cs = getComputedStyle(el);
          var hasOverflow = (cs.overflowY && cs.overflowY !== 'visible') || (cs.overflowX && cs.overflowX !== 'visible');
          var hasScroll = el.scrollHeight > el.clientHeight || el.scrollWidth > el.clientWidth;
          var fixedWidthPx = /px$/.test(cs.width);
          var fixedHeightPx = /px$/.test(cs.height);
          if (hasOverflow || hasScroll || fixedWidthPx || fixedHeightPx) {
            el.style.width = '100%';
            el.style.maxWidth = '100%';
            el.style.height = 'auto';
            el.style.maxHeight = 'none';
            el.style.overflow = 'visible';
          }
          if (cs.transform && cs.transform !== 'none') el.style.transform = 'none';
        });
        document.querySelectorAll('table').forEach(function(t) {
          t.style.width = '100%'; t.style.maxWidth = '100%'; t.style.tableLayout = 'auto';
        });
        document.querySelectorAll('img').forEach(function(img) {
          img.style.maxWidth = '100%'; img.style.height = 'auto';
        });
      } catch (e) {}
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', unboxPages);
    else unboxPages();
  })();
  </script>
</body>
</html>`;
}