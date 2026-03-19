// src/services/previewService.ts
import fs from 'fs';
import fsp from 'fs/promises';
import path from 'path';
import sharp from 'sharp';
import XLSX from 'xlsx';
import mammoth from 'mammoth';
import { Response } from 'express';
import {
    mimeByExt, extOf, wrapHtml
} from '../utils/previewUtils';
import logger from '../logger'; // 你的日志工具

// ===== Word 系列处理 =====
export async function handleWordPreview(
    filePath: string,
    nameParam: string,
    mode: string,
    res: Response
) {
    const ext = extOf(nameParam);
    if (mode === 'pdf' && ext !== 'docx') {
        return res.status(415).json({ error: '当前仅支持 docx 在线预览，请下载该文件查看。' });
    }
    if (ext !== 'docx') {
        return res.status(415).json({ error: '当前仅支持 docx 在线预览，请下载该文件查看。' });
    }
    try {
        const { value: html } = await mammoth.convertToHtml({ path: filePath });
        return res.json({ type: 'text/html', content: wrapHtml(html), filename: nameParam });
    } catch (e: any) {
        logger?.error?.(`DOCX 转换失败：${e?.message || e}`);
        return res.status(500).json({ error: 'DOCX 转换失败' });
    }
}

// ===== 文本/JSON 处理 =====
export async function handleTextPreview(
    filePath: string,
    nameParam: string,
    mime: string,
    res: Response
) {
    const content = await fsp.readFile(filePath, 'utf8');
    return res.json({ type: mime, content, filename: nameParam });
}

// ===== 图片处理 =====
export async function handleImagePreview(
    filePath: string,
    nameParam: string,
    mime: string,
    res: Response
) {
    try {
        const processed = await sharp(filePath)
            .resize({ width: 1200, withoutEnlargement: true, fit: 'inside', fastShrinkOnLoad: true })
            .toBuffer();
        return res.json({
            type: mime,
            content: processed.toString('base64'),
            filename: nameParam,
            encoding: 'base64'
        });
    } catch (e: any) {
        logger?.error?.('图片处理失败: ' + e?.message);
        return res.status(500).json({ error: '图片处理失败' });
    }
}

// ===== DOCX 单独处理（非PDF模式）=====
export async function handleDocxPreview(
    filePath: string,
    nameParam: string,
    res: Response
) {
    try {
        const { value: html } = await mammoth.convertToHtml({ path: filePath });
        return res.json({ type: 'text/html', content: wrapHtml(html), filename: nameParam });
    } catch (error) {
        logger?.error?.(`DOCX 预览失败：${error instanceof Error ? error.message : error}`);
        return res.status(500).json({ error: 'DOCX 预览失败' });
    }
}

// ===== DOC/RTF 单独处理（非PDF模式）=====
export async function handleDocRtfPreview(
    _filePath: string,
    nameParam: string,
    res: Response
) {
    return res.status(415).json({ error: `暂不支持 ${extOf(nameParam)} 在线预览，请下载后查看。` });
}

// ===== Excel 处理 =====
export async function handleExcelPreview(
    filePath: string,
    nameParam: string,
    res: Response
) {
    const wb = XLSX.readFile(filePath, { cellDates: true });
    const sheets = wb.SheetNames.map((name) => ({
        name,
        rows: XLSX.utils.sheet_to_json(wb.Sheets[name], { header: 1, raw: false, defval: '' })
    }));
    return res.json({ type: 'application/vnd.custom.sheet+json', sheets, filename: nameParam });
}

// ===== PPT 处理 =====
export async function handlePptPreview(
    _filePath: string,
    nameParam: string,
    res: Response
) {
    return res.status(415).json({ error: `暂不支持 ${extOf(nameParam)} 在线预览，请下载后查看。` });
}

// ===== PDF 处理 =====
export async function handlePdfPreview(
    filePath: string,
    res: Response
) {
    res.setHeader('Content-Type', 'application/pdf');
    return fs.createReadStream(filePath).pipe(res);
}