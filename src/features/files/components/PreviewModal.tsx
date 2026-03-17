import {useEffect, useState} from 'react';
import {Modal, Spin, Tabs, Typography} from 'antd';
import {useI18n} from '../../../app/providers/I18nProvider';

type Sheet = {name: string; rows: Array<Array<string | number | boolean | null>>};
type PreviewState =
    | {kind: 'loading'}
    | {kind: 'error'; message: string}
    | {kind: 'text'; content: string}
    | {kind: 'html'; content: string}
    | {kind: 'image'; content: string; mime: string}
    | {kind: 'pdf'; url: string}
    | {kind: 'sheet'; sheets: Sheet[]};

type PreviewModalProps = {
    open: boolean;
    fileId: string;
    fileName: string;
    onClose: () => void;
};

export function PreviewModal({open, fileId, fileName, onClose}: PreviewModalProps) {
    const {t} = useI18n();
    const [state, setState] = useState<PreviewState>({kind: 'loading'});

    useEffect(() => {
        if (!open) {
            return;
        }

        let objectUrl = '';
        const load = async () => {
            setState({kind: 'loading'});
            try {
                const response = await fetch(`/api/preview?name=${encodeURIComponent(fileId)}&type=file`, {
                    credentials: 'include',
                });

                const contentType = response.headers.get('content-type') || '';
                if (!response.ok) {
                    const data = await response.json().catch(() => ({error: t('preview.failed')}));
                    throw new Error(data.error || t('preview.failed'));
                }

                if (contentType.includes('application/json')) {
                    const data = await response.json();
                    if (data.type === 'text/html') {
                        setState({kind: 'html', content: data.content});
                        return;
                    }
                    if (data.type === 'application/vnd.custom.sheet+json') {
                        setState({kind: 'sheet', sheets: data.sheets || []});
                        return;
                    }
                    if (typeof data.type === 'string' && data.type.startsWith('image/')) {
                        setState({kind: 'image', content: data.content, mime: data.type});
                        return;
                    }
                    setState({kind: 'text', content: data.content || JSON.stringify(data, null, 2)});
                    return;
                }

                if (contentType.includes('application/pdf')) {
                    const blob = await response.blob();
                    objectUrl = URL.createObjectURL(blob);
                    setState({kind: 'pdf', url: objectUrl});
                    return;
                }

                const text = await response.text();
                setState({kind: 'text', content: text});
            } catch (error) {
                setState({
                    kind: 'error',
                    message: error instanceof Error ? error.message : t('preview.failed'),
                });
            }
        };

        void load();

        return () => {
            if (objectUrl) {
                URL.revokeObjectURL(objectUrl);
            }
        };
    }, [open, fileId]);

    return (
        <Modal open={open} onCancel={onClose} footer={null} width={980} title={fileName} destroyOnClose>
            {state.kind === 'loading' && <Spin />}
            {state.kind === 'error' && <Typography.Text type="danger">{state.message}</Typography.Text>}
            {state.kind === 'text' && (
                <pre style={{whiteSpace: 'pre-wrap', overflow: 'auto', maxHeight: 560}}>{state.content}</pre>
            )}
            {state.kind === 'html' && (
                <iframe
                    title={fileName}
                    srcDoc={state.content}
                    style={{width: '100%', height: 620, border: 'none', borderRadius: 12}}
                />
            )}
            {state.kind === 'image' && (
                <img
                    src={`data:${state.mime};base64,${state.content}`}
                    alt={fileName}
                    style={{maxWidth: '100%', maxHeight: 620, objectFit: 'contain'}}
                />
            )}
            {state.kind === 'pdf' && (
                <iframe title={fileName} src={state.url} style={{width: '100%', height: 620, border: 'none'}} />
            )}
            {state.kind === 'sheet' && (
                <Tabs
                    items={state.sheets.map((sheet, index) => ({
                        key: `${index}`,
                        label: sheet.name,
                        children: (
                            <div style={{overflow: 'auto', maxHeight: 560}}>
                                <table style={{width: '100%', borderCollapse: 'collapse'}}>
                                    <tbody>
                                    {sheet.rows.map((row, rowIndex) => (
                                        <tr key={rowIndex}>
                                            {row.map((cell, cellIndex) => (
                                                <td key={cellIndex} style={{border: '1px solid #dbe1ea', padding: 8}}>
                                                    {String(cell ?? '')}
                                                </td>
                                            ))}
                                        </tr>
                                    ))}
                                    </tbody>
                                </table>
                            </div>
                        ),
                    }))}
                />
            )}
        </Modal>
    );
}
