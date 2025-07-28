// src/pages/Dashboard.tsx
import { useEffect, useState } from 'react';
import "../styles/Dashboard.css";

type FileItem = { name: string, size: string };

function parseSize(sizeStr: string): number {
    const match = sizeStr.match(/(\d+(?:\.\d+)?)(\s*)([a-zA-Z]+)/);
    if (!match) return 0;
    const [_, numStr, , unit] = match;
    const num = parseFloat(numStr);
    const unitMap: Record<string, number> = {
        BYTES: 1,
        KB: 1024,
        MB: 1024 ** 2,
        GB: 1024 ** 3,
    };
    return num * (unitMap[unit.toUpperCase()] || 1);
}

const colorPalette = [
    '#4caf50', '#2196f3', '#ff9800', '#9c27b0', '#f44336',
    '#00bcd4', '#8bc34a', '#ffc107', '#e91e63', '#3f51b5'
];

export default function Dashboard() {
    const [files, setFiles] = useState<FileItem[]>([]);
    const [usage, setUsage] = useState('');

    useEffect(() => {
        fetch('/api/files')
            .then(res => res.json())
            .then(data => {
                setFiles(data.files || []);
                setUsage(data.usage || '');
            });
    }, []);

    const totalSize = files.reduce((sum, f) => sum + parseSize(f.size), 0);
    const segments = files.map((f, i) => ({
        name: f.name,
        percent: totalSize === 0 ? 0 : (parseSize(f.size) / totalSize) * 100,
        color: colorPalette[i % colorPalette.length]
    }));

    return (
        <div className="dashboard-container">
            <h2>文件存储概览</h2>
            <p>磁盘用量: {usage}</p>
            <div className="storage-bar">
                {segments.map((seg, idx) => (
                    <div
                        key={idx}
                        className="storage-segment"
                        style={{ width: `${seg.percent}%`, backgroundColor: seg.color }}
                        title={`${seg.name}: ${seg.percent.toFixed(1)}%`}
                    />
                ))}
            </div>
            <ul className="storage-legend">
                {segments.map((seg, idx) => (
                    <li key={idx}>
                        <span className="legend-dot" style={{ backgroundColor: seg.color }}></span>
                        {seg.name} - {seg.percent.toFixed(1)}%
                    </li>
                ))}
            </ul>
        </div>
    );
}
