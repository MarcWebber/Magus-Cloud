// src/pages/Dashboard.tsx
import {useEffect, useState} from 'react';
import "../styles/Dashboard.css";
import type {FileTreeNode} from "../components/file_tree/FileTree.tsx";
import FileTree from "../components/file_tree/FileTree.tsx";

type FileItem = { name: string, size: string, mtime: string };
type UserUsage = { name: string, size: string};

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

function pageDataToTreeData(files: FileItem[]) {
    const tree: FileTreeNode[] = [];

    console.log(files);

    files.forEach(file => {
        const parts = file.name.split('/');
        let currentLevel = tree;

        parts.forEach((part, index) => {
            let node = currentLevel.find(n => n.name === part);
            if (!node) {
                node = {
                    id: `${parts.slice(0, index + 1).join('-')}`,
                    name: part,
                    children: [],
                    type: index === parts.length - 1 ? 'file' : 'folder',
                    size: file.size,
                    mtime: file.mtime.replace('T', ' ').replace('Z', ''),
                };
                currentLevel.push(node);
            }
            if (index === parts.length - 1) {
            }
            currentLevel = node.children!;
        });
    })
    return tree;
}


const colorPalette = [
    '#4caf50', '#2196f3', '#ff9800', '#9c27b0', '#f44336',
    '#00bcd4', '#8bc34a', '#ffc107', '#e91e63', '#3f51b5'
];

export default function Dashboard() {
    // 总用量
    const [userUsage, setUserUsage] = useState<UserUsage[]>([]);
    const [files, setFiles] = useState<FileItem[]>([]);
    const [filesByType, setFilesByType] = useState<Record<string, number>>({});
    const [usage, setUsage] = useState('');

    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);
    const [uploadError, setUploadError] = useState('');
    const [uploadProgress, setUploadProgress] = useState(0);

    const [data, setData] = useState<FileTreeNode[]>([]);


    // 三个useEffect，一个用于获取文件列表和磁盘用量，一个更新文件树，另一个用于按照文件类型计算总站用
    useEffect(() => {
        fetch('/api/files', {
            credentials: 'include' // 确保发送cookie
        })
            .then(res => res.json())
            .then(data => {
                setFiles(data.files || []);
                setUsage(data.usage || '')
            })
    }, []);
    // 获取每个人的用量
    useEffect(() => {
        fetch('/api/usage', {
            credentials: 'include' // 确保发送cookie
        })
            .then(res => res.json())
            .then(data => {
                console.log("DEBUGGING");
                console.log(data.usage);
                setUserUsage(data.usage || []);
                console.log(userUsage);
            });
    }, []);
    useEffect(() => {
        setData(pageDataToTreeData(files));
        if (files.length > 0) {
            const fileTypes: Record<string, number> = {};
            files.forEach(file => {
                const parts = file.name.split('.');
                const ext = parts.length > 1 ? parts[parts.length - 1].toLowerCase() : '';
                const size = parseSize(file.size);
                if (ext) {
                    fileTypes[ext] = (fileTypes[ext] || 0) + size;
                }
            });
            setFilesByType(fileTypes);
        }
    }, [files]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            // TODO 一个奇怪的报错，但是不影响
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
                fetch('/api/files', {
                    credentials: 'include' // 确保发送cookie
                })
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

        // 设置cookie
        xhr.open('POST', '/api/upload', true);
        xhr.withCredentials = true;
        xhr.send(formData);
    };

    const totalSize = files.reduce((sum, f) => sum + parseSize(f.size), 0);
    const segments = Object.entries(filesByType).map((name, idx) => {
        const size = filesByType[name[0]];
        const percent = (size / totalSize) * 100;
        return {
            name: name[0],
            percent,
            color: colorPalette[idx % colorPalette.length]
        };
    });
    return (
        <div className="dashboard-container">
            <h2>文件存储概览</h2>
            <p>个人磁盘用量: {usage}</p>
            <div className="storage-bar">
                {segments.map((seg, idx) => (
                    <div
                        key={idx}
                        className="storage-segment"
                        style={{width: `${seg.percent}%`, backgroundColor: seg.color}}
                        title={`${seg.name}: ${seg.percent.toFixed(1)}%`}
                    />
                ))}
            </div>
            <ul className="storage-legend">
                {segments.map((seg, idx) => (
                    <li key={idx}>
                        <span className="legend-dot" style={{backgroundColor: seg.color}}></span>
                        {seg.name} - {seg.percent.toFixed(1)}%
                    </li>
                ))}
            </ul>

            <h2>总体磁盘概览</h2>
            {/*TODO 这里需要计算总用量*/}
            <p>总用量: </p>
            <ul className="storage-bar">
                {userUsage.map((usage, idx) => (
                    <div key={idx}
                            className="storage-segment"
                            style={{width: `${parseSize(usage.size) / totalSize * 100}%`, backgroundColor: colorPalette[idx % colorPalette.length]}}
                            title={`${usage.name}: ${usage.size}`}>
                    </div>
                ))}
            </ul>
            <ul className={"storage-legend"}>
                {userUsage.map((usage, idx) => (
                    <li key={idx}>
                        <span className="legend-dot" style={{backgroundColor: colorPalette[idx % colorPalette.length]}}></span>
                        {usage.name} - {usage.size}
                    </li>
                ))}
            </ul>

            <div className="upload-section">
                <input
                    type="file"
                    id="file-upload"
                    style={{display: 'none'}}
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
                            style={{width: `${uploadProgress}%`}}
                        ></div>
                    </div>
                )}
            </div>
            <div className="file-tree-container">
                <FileTree data={data}/>
            </div>

        </div>
    );
}