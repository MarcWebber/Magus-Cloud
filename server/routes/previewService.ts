// src/services/previewService.ts
import fs from 'fs';
import fsp from 'fs/promises';
import path from 'path';
import sharp from 'sharp';
import XLSX from 'xlsx';
import mammoth from 'mammoth';
import { Response } from 'express';
import {
    mimeByExt, extOf, convertWithSoffice, isValidPdf, wrapHtml
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
    try {
        const pdfPath = await convertWithSoffice(filePath, 'pdf');
        if (!(await isValidPdf(pdfPath))) throw new Error('Invalid PDF');
        res.setHeader('Content-Type', 'application/pdf');
        return fs.createReadStream(pdfPath).pipe(res);
    } catch (e: any) {
        logger?.error?.(`Word→PDF 失败：${e?.message || e}`);
        try {
            if (ext === 'docx') {
                const { value: html } = await mammoth.convertToHtml({ path: filePath });
                return res.json({ type: 'text/html', content: wrapHtml(html), filename: nameParam });
            }
            const htmlPath = await convertWithSoffice(filePath, 'html');
            const html = await fsp.readFile(htmlPath, 'utf8');
            return res.json({ type: 'text/html', content: wrapHtml(html), filename: nameParam });
        } catch (e2: any) {
            logger?.error?.(`Word HTML 回退失败：${e2?.message || e2}`);
            return res.status(500).json({ error: 'Word 转换失败' });
        }
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
    } catch {
        const htmlPath = await convertWithSoffice(filePath, 'html');
        const html = await fsp.readFile(htmlPath, 'utf8');
        return res.json({ type: 'text/html', content: wrapHtml(html), filename: nameParam });
    }
}

// ===== DOC/RTF 单独处理（非PDF模式）=====
export async function handleDocRtfPreview(
    filePath: string,
    nameParam: string,
    res: Response
) {
    try {
        const htmlPath = await convertWithSoffice(filePath, 'html');
        const html = await fsp.readFile(htmlPath, 'utf8');
        return res.json({ type: 'text/html', content: wrapHtml(html), filename: nameParam });
    } catch {
        const pdfPath = await convertWithSoffice(filePath, 'pdf');
        if (!(await isValidPdf(pdfPath))) {
            return res.status(500).json({ error: '文档转换失败' });
        }
        res.setHeader('Content-Type', 'application/pdf');
        return fs.createReadStream(pdfPath).pipe(res);
    }
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
    filePath: string,
    nameParam: string,
    res: Response
) {
    const pdfPath = await convertWithSoffice(filePath, 'pdf');
    if (!(await isValidPdf(pdfPath))) {
        return res.status(500).json({ error: 'PPT 转 PDF 失败' });
    }
    res.setHeader('Content-Type', 'application/pdf');
    return fs.createReadStream(pdfPath).pipe(res);
}

// ===== PDF 处理 =====
export async function handlePdfPreview(
    filePath: string,
    res: Response
) {
    res.setHeader('Content-Type', 'application/pdf');
    return fs.createReadStream(filePath).pipe(res);
}