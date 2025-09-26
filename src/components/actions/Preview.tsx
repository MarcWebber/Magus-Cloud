import React, { useEffect, useState, useCallback, useRef } from 'react';
import styles from './Preview.module.css';

type Sheet = { name: string; rows: any[][] };
type PreviewContent =
  | { type: string; content: string }
  | { type: 'text/html'; html: string }
  | { type: 'application/vnd.custom.sheet+json'; sheets: Sheet[] }
  | { type: string; blob: Blob }
  | { type: string; base64: string };

interface PreviewProps {
  visible: boolean;
  fileId: string;
  fileName: string;
  fileType: 'file';
  onClose: () => void;
}

const Preview: React.FC<PreviewProps> = ({
  visible,
  fileId,
  fileName,
  fileType,
  onClose
}) => {
  const [previewContent, setPreviewContent] = useState<PreviewContent | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [activeSheetIdx, setActiveSheetIdx] = useState<number>(0);

  const fetchPreviewContentRef = useRef<() => Promise<void>>(null!);

  const cleanupResources = useCallback(() => {
    if (objectUrl) {
      URL.revokeObjectURL(objectUrl);
      setObjectUrl(null);
    }
  }, [objectUrl]);

  const fetchPreviewContent = useCallback(async () => {
    if (!visible || fileType !== 'file') return;

    cleanupResources();
    setPreviewContent(null);
    setActiveSheetIdx(0);
    setError('');
    setLoading(true);

    try {
      const encodedFileName = encodeURIComponent(fileId);
      const urlBase = `/api/preview?name=${encodedFileName}&type=file`;
      const isWord = /\.(docx?|rtf)$/i.test(fileName);

      const consumeBinary = async (resp: Response) => {
        const ct = resp.headers.get('content-type') || '';
        const blob = await resp.blob();
        const urlObj = URL.createObjectURL(blob);
        setObjectUrl(urlObj);
        setPreviewContent({ type: ct || 'application/octet-stream', blob });
      };

      // 先试 Word→PDF（最稳）
      if (isWord) {
        const respPdf = await fetch(`${urlBase}&mode=pdf&_=${Date.now()}`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token') || ''}`,
            'Accept': '*/*'
          }
        });

        // 1) 直接拿到 PDF，结束
        if (respPdf.ok && (respPdf.headers.get('content-type') || '').startsWith('application/pdf')) {
          await consumeBinary(respPdf);
          setLoading(false);
          return;
        }

        // 2) 可能后端回了 JSON（携带 HTML 或错误），优先吃 HTML
        const ct = respPdf.headers.get('content-type') || '';
        if (ct.includes('application/json')) {
          const data = await respPdf.json().catch(() => null);
          if (data?.type === 'text/html' && data?.content) {
            setPreviewContent({ type: 'text/html', html: data.content });
            setLoading(false);
            return;
          }
          // 其它错误则继续回退到常规请求（HTML）
        }
      }

      // 非 Word 或 Word 回退：常规请求
      const resp = await fetch(`${urlBase}&_=${Date.now()}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token') || ''}`,
          'Accept': '*/*'
        }
      });

      if (!resp.ok) {
        const errorData = await resp.json().catch(() => null);
        throw new Error(errorData?.error || `请求失败 (${resp.status})`);
      }

      const contentType = resp.headers.get('content-type') || '';

      if (contentType.includes('application/json')) {
        const data = await resp.json();

        if (data.type === 'text/html' && data.content) {
          setPreviewContent({ type: 'text/html', html: data.content });
          setLoading(false);
          return;
        }
        if (data.type === 'application/vnd.custom.sheet+json' && data.sheets) {
          setPreviewContent({ type: 'application/vnd.custom.sheet+json', sheets: data.sheets });
          setLoading(false);
          return;
        }
        if (data.type?.startsWith('image/') && data.content) {
          setPreviewContent({ type: data.type, base64: data.content });
          setLoading(false);
          return;
        }
        setPreviewContent({ type: data.type || 'application/json', content: data.content ?? JSON.stringify(data) });
        setLoading(false);
        return;
      }

      // 二进制（pdf/video/audio等）
      await consumeBinary(resp);
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载预览失败');
    } finally {
      setLoading(false);
    }
  }, [visible, fileId, fileType, cleanupResources, fileName]);

  useEffect(() => {
    fetchPreviewContentRef.current = fetchPreviewContent;
  }, [fetchPreviewContent]);

  useEffect(() => {
    if (visible) {
      fetchPreviewContentRef.current();
    }
  }, [visible, fileId]);

  // Base64 图片转 URL
  useEffect(() => {
    if (previewContent?.type?.startsWith('image/') && 'base64' in previewContent) {
      const base64 = previewContent.base64;
      try {
        const byteString = atob(base64);
        const arrayBuffer = new ArrayBuffer(byteString.length);
        const uint8Array = new Uint8Array(arrayBuffer);
        for (let i = 0; i < byteString.length; i++) uint8Array[i] = byteString.charCodeAt(i);
        const blob = new Blob([uint8Array], { type: previewContent.type });
        const url = URL.createObjectURL(blob);
        setObjectUrl(url);
      } catch {
        setError('图片解码失败，请检查文件完整性');
      }
    }
  }, [previewContent]);

  useEffect(() => () => cleanupResources(), [cleanupResources]);

  const getFileExtension = () => fileName.split('.').pop()?.toLowerCase() || '';

  const renderPreviewContent = () => {
    if (loading) return <div className={styles.loading}>加载中...</div>;
    if (error) return <div className={styles.error}>{error}</div>;
    if (!previewContent) return <div className={styles.empty}>无预览内容</div>;

    // 1) HTML
    if (previewContent.type === 'text/html') {
      const html = (previewContent as any).html as string;
      return (
        <div className={styles['html-container']}>
          <iframe
            className={styles['html-iframe']}
            sandbox="allow-same-origin allow-scripts"
            srcDoc={html}
            title={fileName}
          />
        </div>
      );
    }

    // 2) 表格 JSON
    if (previewContent.type === 'application/vnd.custom.sheet+json') {
      const sheets = (previewContent as any).sheets as Sheet[];
      const sheet = sheets[activeSheetIdx] ?? sheets[0];
      return (
        <div className={styles['sheet-container']}>
          <div className={styles['sheet-tabs']}>
            {sheets.map((s, i) => (
              <button
                key={`${s.name}-${i}`}
                className={i === activeSheetIdx ? styles['tab-active'] : styles['tab']}
                onClick={() => setActiveSheetIdx(i)}
              >
                {s.name}
              </button>
            ))}
          </div>
          <div className={styles['sheet-table-wrap']}>
            <table className={styles['sheet-table']}>
              <tbody>
                {sheet.rows.map((row, rIdx) => (
                  <tr key={rIdx}>
                    {row.map((cell, cIdx) => (
                      <td key={cIdx}>{String(cell ?? '')}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      );
    }

    // 3) 文本
    if ('content' in previewContent) {
      const { type, content } = previewContent;
      const ext = getFileExtension();

      if (type === 'application/json' || ext === 'json') {
        try {
          return (
            <div className={styles['text-container']}>
              <pre className={styles['json-preview']}>
                {JSON.stringify(JSON.parse(content), null, 2)}
              </pre>
            </div>
          );
        } catch { /* 降级 */ }
      }

      if (ext === 'md' || type === 'text/markdown') {
        return (
          <div className={styles['text-container']}>
            <pre className={styles['markdown-preview']}>{content}</pre>
          </div>
        );
      }

      if (['js', 'ts', 'html', 'css', 'java', 'py', 'cpp', 'c'].includes(ext)) {
        return (
          <div className={styles['text-container']}>
            <pre className={styles['code-preview']}>{content}</pre>
          </div>
        );
      }

      return (
        <div className={styles['text-container']}>
          <pre className={styles['text-preview']}>{content}</pre>
        </div>
      );
    }

    // 4) 图片
    if (previewContent.type.startsWith('image/') && objectUrl) {
      return (
        <div className={styles['image-container']}>
          <img
            src={objectUrl}
            alt={fileName}
            className={styles['image-preview']}
            loading="lazy"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      );
    }

    // 5) PDF
    if (previewContent.type === 'application/pdf' && objectUrl) {
      return (
        <div className={styles['pdf-container']}>
          <embed src={objectUrl} type="application/pdf" className={styles['pdf-preview']} title={fileName} />
        </div>
      );
    }

    // 6) 视频
    if (previewContent.type.startsWith('video/') && objectUrl) {
      return (
        <div className={styles['video-container']}>
          <video src={objectUrl} controls className={styles['video-preview']} title={fileName} />
        </div>
      );
    }

    // 7) 音频
    if (previewContent.type.startsWith('audio/') && objectUrl) {
      return (
        <div className={styles['audio-container']}>
          <audio src={objectUrl} controls className={styles['audio-preview']} title={fileName} />
        </div>
      );
    }

    return (
      <div className={styles.unsupported}>
        <p>无法预览该文件类型</p>
        <p className={styles.filename}>{fileName}</p>
      </div>
    );
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  };

  if (!visible) return null;

  return (
    <div className={styles.overlay} onClick={handleOverlayClick}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <h3 className={styles.title} title={fileName}>
            {fileName.length > 50 ? `${fileName.slice(0, 50)}...` : fileName}
          </h3>
          <button className={styles['close-btn']} onClick={onClose} aria-label="关闭预览">×</button>
        </div>
        <div className={styles.content}>
          {renderPreviewContent()}
        </div>
      </div>
    </div>
  );
};

export default Preview;

