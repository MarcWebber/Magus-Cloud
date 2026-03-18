import DOMPurify from 'dompurify';
import {marked} from 'marked';
import {useMemo} from 'react';
import styles from './MarkdownDocument.module.css';

type MarkdownDocumentProps = {
    markdown: string;
};

marked.setOptions({
    gfm: true,
    breaks: true,
});

export function MarkdownDocument({markdown}: MarkdownDocumentProps) {
    const html = useMemo(() => {
        const rendered = marked.parse(markdown) as string;
        return DOMPurify.sanitize(rendered, {
            ADD_ATTR: ['target', 'rel'],
        });
    }, [markdown]);

    return <article className={styles.markdown} dangerouslySetInnerHTML={{__html: html}} />;
}
