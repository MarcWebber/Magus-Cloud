// src/utils/previewUtils.ts
import fs from 'fs';
import path from 'path';

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

// ===== 原有的安全路径相关 =====

export function safeResolve(baseDir: string, subPath: string) {
    const realBase = path.resolve(baseDir);
    const target = path.resolve(baseDir, subPath);
    if (!target.startsWith(realBase + path.sep)) throw new Error('PathTraversal');
    return target;
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