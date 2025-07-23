// src/pages/Dashboard.tsx
import { useEffect, useState } from 'react';
import "../styles/Dashboard.css";

type FileItem = { name: string, size: string };

export default function Dashboard() {
    const [files, setFiles] = useState<FileItem[]>([]);
    const [usage, setUsage] = useState('');

    useEffect(() => {
        fetch('/api/files').then(res => res.json()).then(data => {
            setFiles(data.files || []);
            setUsage(data.usage || '');
        });
    }, []);

    return (
        <div>
            <h2>文件列表</h2>
            <p>磁盘用量: {usage}</p>
            <ul>
                {files.map((f, i) => <li key={i}>{f.name} - {f.size}</li>)}
            </ul>
        </div>
    );
}
