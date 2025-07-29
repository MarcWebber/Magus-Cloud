// src/pages/Dashboard.tsx
import { useEffect, useState } from 'react';
import "../styles/Dashboard.css";
import {Tree} from "react-arborist";

type FileItem = { name: string, size: string };
type TreeNode = { id: string, name: string, children?: TreeNode[] };

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

function pageDataToTreeData(files: FileItem[]){
    const tree: TreeNode[] = [];
    //         files: [
    //             { name: 'report.pdf', size: '234567 bytes' },
    //             { name: 'data.csv', size: '54321 bytes' },
    //             { name: 'image.png', size: '123456 bytes' },
    //         ],
    //         usage: '395K'
    // const data = [
    //   { id: "1", name: "Unread" },
    //   { id: "2", name: "Threads" },
    //   {
    //     id: "3",
    //     name: "Chat Rooms",
    //     children: [
    //       { id: "c1", name: "General" },
    //       { id: "c2", name: "Random" },
    //       { id: "c3", name: "Open Source Projects" },
    //     ],
    //   },
    //   {
    //     id: "4",
    //     name: "Direct Messages",
    //     children: [
    //       { id: "d1", name: "Alice" },
    //       { id: "d2", name: "Bob" },
    //       { id: "d3", name: "Charlie" },
    //     ],
    //   },
    // ];
    // files.forEach(file => {
    //     const parts = file.name.split('/');
    //     let currentLevel = tree;
    //
    //     parts.forEach((part, index) => {
    //         let node = currentLevel.find(n => n.name === part);
    //         if (!node) {
    //             node = { id: `${parts.slice(0, index + 1).join('-')}`, name: part, children: [] };
    //             currentLevel.push(node);
    //         }
    //         if (index === parts.length - 1) {
    //         }
    //         currentLevel = node.children!;
    //     });
    // })
    // return tree;
}

const colorPalette = [
    '#4caf50', '#2196f3', '#ff9800', '#9c27b0', '#f44336',
    '#00bcd4', '#8bc34a', '#ffc107', '#e91e63', '#3f51b5'
];

export default function Dashboard() {
    const [files, setFiles] = useState<FileItem[]>([]);
    const [usage, setUsage] = useState('');
    const [data, setData] = useState<TreeNode[]>([]);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);
    const [uploadError, setUploadError] = useState('');
    const [uploadProgress, setUploadProgress] = useState(0);


    useEffect(() => {
        fetch('/api/files')
            .then(res => res.json())
            .then(data => {
                setFiles(data.files || []);
                setUsage(data.usage || '');
            }).then(
                // () => {
                //     const treeData = pageDataToTreeData(files);
                //     setData(treeData);
                // }
            );
    }, []);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            setSelectedFile(e.target.files[0]);
            setUploadError('');
        }
    };

    const handleUpload = () => {
        if (!selectedFile) return;

        setUploading(true);
        setUploadError('');
        setUploadProgress(0);

        const formData = new FormData();
        formData.append('file', selectedFile);

        const xhr = new XMLHttpRequest();

        xhr.upload.onprogress = (event) => {
            if (event.lengthComputable) {
                const percent = Math.round((event.loaded / event.total) * 100);
                setUploadProgress(percent);
            }
        };

        xhr.onload = () => {
            if (xhr.status === 200) {
                fetch('/api/files')
                    .then(res => res.json())
                    .then(data => {
                        setFiles(data.files || []);
                        setUsage(data.usage || '');
                    });
                setSelectedFile(null);
                setUploadProgress(0);
            } else {
                setUploadError(`上传失败（状态码：${xhr.status}）`);
            }
            setUploading(false);
        };

        xhr.onerror = () => {
            setUploadError('上传出错，请重试');
            setUploading(false);
        };

        xhr.open('POST', '/api/upload', true);
        xhr.send(formData);
    };



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
            {/*<p>文件列表</p>*/}
            {/*<Tree*/}
            {/*    data={data}*/}
            {/*    openByDefault={true}*/}
            {/*    onSelect={(node) => console.log(node)}*/}
            {/*/>*/}
            {/* 上传区域 */}
            <div className="upload-section">
                <input
                    type="file"
                    id="file-upload"
                    style={{ display: 'none' }}
                    onChange={handleFileChange}
                />
                <label htmlFor="file-upload" className="upload-btn">
                    {uploading ? '上传中...' : '选择文件'}
                </label>
                {selectedFile && (
                    <span className="selected-file">{selectedFile.name}</span>
                )}
                <button
                    className="upload-btn"
                    onClick={handleUpload}
                    disabled={!selectedFile || uploading}
                >
                    {uploading ? '上传中...' : '开始上传'}
                </button>
                {uploadError && (
                    <div className="upload-error">{uploadError}</div>
                )}
                {uploading && (
    <div className="upload-progress-bar">
      <div
        className="upload-progress-fill"
        style={{ width: `${uploadProgress}%` }}
      ></div>
    </div>
  )}
            </div>
        </div>
    );
}
