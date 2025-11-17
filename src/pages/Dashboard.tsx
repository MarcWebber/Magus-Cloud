//
// // src/pages/Dashboard.tsx
// import {useEffect, useRef, useState} from 'react';
// import "../styles/Dashboard.css";
// import type {FileTreeNode} from "../components/file_tree/FileTree.tsx";
// import FileTree from "../components/file_tree/FileTree.tsx";
//
//
// type FileItem = { name: string, size: string, mtime: string ,type: 'file' | 'folder', children?: FileItem[]};
// type UserUsage = { name: string, size: string};
//
//
// /**
//  * 将带单位的大小字符串（如 "1.5 MB"）解析为字节数。
//  * @param sizeStr 大小字符串或字节数（作为字符串）
//  * @returns 字节数（number）
//  */
// function parseSize(sizeStr: string): number {
//     if (!isNaN(Number(sizeStr))) {
//         return Number(sizeStr);
//     }
//     const match = sizeStr.match(/(\d+(?:\.\d+)?)(\s*)([a-zA-Z]+)/);
//     if (!match) return 0;
//
//     const [_, numStr, , unit] = match;
//     const num = parseFloat(numStr);
//     const unitMap: Record<string, number> = {
//         BYTES: 1,
//         B: 1,
//         KB: 1024,
//         MB: 1024 ** 2,
//         GB: 1024 ** 3,
//     };
//     return num * (unitMap[unit.toUpperCase()] || 1);
// }
//
// /**
//  * 将字节数格式化为可读字符串（KB, MB, GB）。
//  * @param bytes 字节数
//  * @param decimals 小数点位数
//  * @returns 格式化后的字符串
//  */
// function formatBytes(bytes: number, decimals = 2): string {
//     if (bytes === 0) return '0 Bytes';
//     const k = 1024;
//     const dm = decimals < 0 ? 0 : decimals;
//     const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
//     const i = Math.floor(Math.log(bytes) / Math.log(k));
//     return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
// }
//
//
// function pageDataToTreeData(files: FileItem[]) {
//     // 保持不变，但Dashboard组件中未使用
//     const tree: FileTreeNode[] = [];
//     files.forEach(file => {
//         const parts = file.name.split('/');
//         let currentLevel = tree;
//
//         parts.forEach((part, index) => {
//             const isLeaf = index === parts.length - 1;
//
//             let node = currentLevel.find(n => n.name === part);
//             if (!node) {
//                 const id = parts.slice(0, index + 1).join('/');
//                 node = {
//                     id,
//                     name: part,
//                     children: [],
//                     type: isLeaf ? file.type : 'folder',
//                     size: isLeaf ? file.size : undefined,
//                     mtime: isLeaf ? file.mtime.replace('T', ' ').replace('Z', '') : undefined,
//                 };
//                 currentLevel.push(node);
//             }
//             currentLevel = node.children!;
//         });
//     })
//     return tree;
// }
//
// /**
//  * 递归为树形结构的每个节点添加唯一 ID，并计算文件夹的总用量。
//  */
// function addIdsAndCalculateSize(nodes: FileItem[], parentId = ""): FileTreeNode[] {
//     return nodes.map((node) => {
//         const id = parentId ? `${parentId}/${node.name}` : node.name;
//
//         const newNode: FileTreeNode = {
//             id,
//             name: node.name,
//             type: node.type,
//             size: node.size,
//             mtime: node.mtime ? node.mtime.replace('T', ' ').replace('Z', '') : undefined,
//             children: [],
//         };
//
//         let folderTotalSize = 0;
//
//         if (node.type === 'folder' && Array.isArray(node.children)) {
//             newNode.children = addIdsAndCalculateSize(node.children, id);
//
//             folderTotalSize = newNode.children.reduce((sum, child) => {
//                 return sum + (child.size ? parseSize(child.size) : 0);
//             }, 0);
//
//             newNode.size = formatBytes(folderTotalSize);
//         }
//
//         return newNode;
//     });
// }
//
//
// const colorPalette = [
//     '#4caf50', '#2196f3', '#ff9800', '#9c27b0', '#f44336',
//     '#00bcd4', '#8bc34a', '#ffc107', '#e91e63', '#3f51b5'
// ];
//
// // 定义用于展示的用量类型，用于前五 + 其他的逻辑
// type UsageSegment = {
//     name: string;
//     sizeBytes: number;
//     color: string;
//     percent?: number;
// };
//
//
// export default function Dashboard() {
//     const [userUsage, setUserUsage] = useState<UserUsage[]>([]);
//     const [files, setFiles] = useState<FileItem[]>([]);
//     // const [filesByType, setFilesByType] = useState<Record<string, number>>({}); // 废弃，改为前五项统计
//     const [usage, setUsage] = useState('');
//
//     const [selectedFile, setSelectedFile] = useState<File | null>(null);
//     const [selectedFolderFiles, setSelectedFolderFiles] = useState<FileList | null>(null);
//     const [selectedFolderName, setSelectedFolderName] = useState('');
//     const [uploading, setUploading] = useState(false);
//     const [uploadError, setUploadError] = useState('');
//     const [uploadProgress, setUploadProgress] = useState(0);
//     const folderInputRef = useRef<HTMLInputElement>(null);
//
//     const [data, setData] = useState<FileTreeNode[]>([]); // 树形结构数据
//
//     useEffect(() => {
//         if (folderInputRef.current) {
//             folderInputRef.current.setAttribute('directory', '');
//             folderInputRef.current.setAttribute('webkitdirectory', '');
//         }
//     }, []);
//
//     // 1. 获取文件列表
//     useEffect(() => {
//         fetch('/api/files', { credentials: 'include' })
//             .then(res => res.json())
//             .then(data => {
//                 setFiles(data.files || []);
//                 setUsage(data.usage || '')
//             })
//     }, []);
//
//     // 2. 获取每个人的用量
//     useEffect(() => {
//         fetch('/api/usage', { credentials: 'include' })
//             .then(res => res.json())
//             .then(data => {
//                 setUserUsage(data.usage || []);
//             });
//     }, []);
//
//     // 3. 构建文件树并计算文件夹大小
//     useEffect(() => {
//         if (files.length === 0) return;
//
//         // 使用递归函数构建树
//         const treeData = addIdsAndCalculateSize(files);
//         setData(treeData);
//
//         // 🚨 文件类型统计被新的根文件前五统计逻辑取代，这里不再设置 filesByType
//         // setFilesByType(fileTypes);
//
//     }, [files]);
//
//     // ... (handleFileChange, handleFolderChange, handleUpload 保持不变)
//     const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
//         if (e.target.files && e.target.files.length > 0) {
//             setSelectedFile(e.target.files[0]);
//             setSelectedFolderFiles(null);
//             setSelectedFolderName('');
//             setUploadError('');
//         }
//     };
//
//     const handleFolderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
//         if (e.target.files && e.target.files.length > 0) {
//             setSelectedFolderFiles(e.target.files);
//             setSelectedFile(null);
//             setUploadError('');
//
//             if (e.target.files[0].webkitRelativePath) {
//                 const pathParts = e.target.files[0].webkitRelativePath.split('/');
//                 if (pathParts.length > 0) {
//                     setSelectedFolderName(pathParts[0]);
//                 }
//             }
//         }
//     };
//
//     const handleUpload = (isFolder = false) => {
//         if ((!selectedFile && !selectedFolderFiles) || uploading) return;
//
//         setUploading(true);
//         setUploadError('');
//         setUploadProgress(0);
//
//         const formData = new FormData();
//
//         if (isFolder && selectedFolderFiles) {
//             Array.from(selectedFolderFiles).forEach(file => {
//                 const newFile = new File([file], file.webkitRelativePath);
//                 formData.append('folderFiles', newFile);
//             });
//             formData.append('folderName', selectedFolderName);
//         } else if (selectedFile) {
//             formData.append('file', selectedFile);
//         }
//
//         const xhr = new XMLHttpRequest();
//
//         xhr.upload.onprogress = (event) => {
//             if (event.lengthComputable) {
//                 const percent = Math.round((event.loaded / event.total) * 100);
//                 setUploadProgress(percent);
//             }
//         };
//
//         xhr.onload = () => {
//             if (xhr.status === 200) {
//                 fetch('/api/files', { credentials: 'include' })
//                     .then(res => res.json())
//                     .then(data => {
//                         setFiles(data.files || []);
//                         setUsage(data.usage || '');
//                     });
//
//                 setSelectedFile(null);
//                 setSelectedFolderFiles(null);
//                 setSelectedFolderName('');
//                 setUploadProgress(0);
//             } else {
//                 setUploadError(`上传失败（状态码：${xhr.status}）`);
//             }
//             setUploading(false);
//         };
//
//         xhr.onerror = () => {
//             setUploadError('上传出错，请重试');
//             setUploading(false);
//         };
//
//         const url = isFolder ? '/api/upload-folder' : '/api/upload';
//         xhr.open('POST', url, true);
//         xhr.withCredentials = true;
//         xhr.send(formData);
//     };
//
//     // ------------------------------------
//     // 渲染前的计算逻辑
//     // ------------------------------------
//
//     // 1. 计算个人磁盘用量（根文件前五 + 其他）
//
//     // 根级项目 (FileTreeNode) 及其大小 (bytes)
//     const rootItemsWithSize: UsageSegment[] = data.map(node => ({
//         name: node.name,
//         sizeBytes: parseSize(node.size || '0 Bytes'),
//         color: '' // 暂时不需要颜色
//     }));
//
//     // 按大小降序排序
//     rootItemsWithSize.sort((a, b) => b.sizeBytes - a.sizeBytes);
//
//     const topFiveItems = rootItemsWithSize.slice(0, 5);
//     const otherItems = rootItemsWithSize.slice(5);
//
//     const totalSizeTopFive = topFiveItems.reduce((sum, item) => sum + item.sizeBytes, 0);
//     const totalSizeOther = otherItems.reduce((sum, item) => sum + item.sizeBytes, 0);
//
//     // 个人总用量（所有根项目的总和）
//     const personalTotalSize = totalSizeTopFive + totalSizeOther;
//     const formattedPersonalUsage = formatBytes(personalTotalSize);
//
//     // 构建用于饼图的 segments (前五 + 其他)
//     const segments: UsageSegment[] = topFiveItems.map((item, index) => ({
//         ...item,
//         color: colorPalette[index % colorPalette.length]
//     }));
//
//     if (totalSizeOther > 0) {
//         // 如果有“其他”项，则添加进去
//         segments.push({
//             name: '其他',
//             sizeBytes: totalSizeOther,
//             color: colorPalette[5 % colorPalette.length] // 确保其他项有颜色
//         });
//     }
//
//     // 计算百分比
//     const segmentsWithPercent = segments.map(seg => ({
//         ...seg,
//         percent: personalTotalSize > 0 ? (seg.sizeBytes / personalTotalSize) * 100 : 0
//     }));
//
//
//     // 2. 计算总体磁盘用量（所有用户的总和）
//     const totalUsageSize = userUsage.reduce((sum, u) => {
//         // 尝试解析 size，即使它看起来像一个没有单位的数字
//         return sum + parseSize(u.size);
//     }, 0);
//
//     // 🚀 修正：使用 formatBytes 确保显示准确和美观
//     const formattedTotalUsage = formatBytes(totalUsageSize, 2);
//
//
//     // return (
//     //     <div className="dashboard-container">
//     //         <h2>文件存储概览</h2>
//     //
//     //         {/* 个人磁盘用量：显示所有项目的总和 */}
//     //         <p>个人磁盘用量: {formattedPersonalUsage}</p>
//     //
//     //         {/* 饼图/进度条：展示前五大根文件/文件夹 + 其他 */}
//     //         <div className="storage-bar">
//     //             {segmentsWithPercent.map((seg, idx) => (
//     //                 <div
//     //                     key={idx}
//     //                     className="storage-segment"
//     //                     style={{width: `${seg.percent}%`, backgroundColor: seg.color}}
//     //                     title={`${seg.name}: ${formatBytes(seg.sizeBytes)} (${seg.percent.toFixed(1)}%)`}
//     //                 />
//     //             ))}
//     //         </div>
//     //         <ul className="storage-legend">
//     //             {segmentsWithPercent.map((seg, idx) => (
//     //                 <li key={idx}>
//     //                     <span className="legend-dot" style={{backgroundColor: seg.color}}></span>
//     //                     {seg.name} - {seg.percent.toFixed(1)}%
//     //                 </li>
//     //             ))}
//     //         </ul>
//     //
//     //         <h2>总体磁盘概览</h2>
//     //         {/* 🚀 修正：总用量使用正确的格式化值 */}
//     //         <p>总用量: {formattedTotalUsage}</p>
//     //         <div className="storage-bar">
//     //             {userUsage.map((usage, idx) => (
//     //                 <div key={idx}
//     //                         className="storage-segment"
//     //                         style={{
//     //                             width: `${totalUsageSize > 0 ? (parseSize(usage.size) / totalUsageSize * 100) : 0}%`,
//     //                             backgroundColor: colorPalette[idx % colorPalette.length]
//     //                         }}
//     //                         title={`${usage.name}: ${usage.size}`}>
//     //                 </div>
//     //             ))}
//     //         </div>
//     //         <ul className={"storage-legend"}>
//     //             {userUsage.map((usage, idx) => (
//     //                 <li key={idx}>
//     //                     <span className="legend-dot"
//     //                             style={{backgroundColor: colorPalette[idx % colorPalette.length]}}></span>
//     //                     {usage.name} - {usage.size}
//     //                 </li>
//     //             ))}
//     //         </ul>
//     //
//     //         {/* ... (上传部分保持不变) */}
//     //         <div className="upload-section">
//     //             <input
//     //                 type="file"
//     //                 id="file-upload"
//     //                 style={{display: 'none'}}
//     //                 onChange={handleFileChange}
//     //             />
//     //             <label htmlFor="file-upload" className="upload-btn">
//     //                 选择文件
//     //             </label>
//     //
//     //             <input
//     //                 ref={folderInputRef}
//     //                 type="file"
//     //                 id="folder-upload"
//     //                 style={{display: 'none'}}
//     //                 onChange={handleFolderChange}
//     //             />
//     //             <label htmlFor="folder-upload" className="upload-btn">
//     //                 选择文件夹
//     //             </label>
//     //
//     //             {(selectedFile || selectedFolderName) && (
//     //                 <span className="selected-file">
//     //                     {selectedFile ? selectedFile.name : `文件夹: ${selectedFolderName}`}
//     //                 </span>
//     //             )}
//     //
//     //             <button
//     //                 className="upload-btn"
//     //                 onClick={() => handleUpload(!!selectedFolderFiles)}
//     //                 disabled={(uploading) || (!selectedFile && !selectedFolderFiles)}
//     //             >
//     //                 {uploading ? '上传中...' : '开始上传'}
//     //             </button>
//     //
//     //             {uploadError && (
//     //                 <div className="upload-error">{uploadError}</div>
//     //             )}
//     //
//     //             {uploading && (
//     //                 <div className="upload-progress-bar">
//     //                     <div
//     //                         className="upload-progress-fill"
//     //                         style={{width: `${uploadProgress}%`}}
//     //                     ></div>
//     //                 </div>
//     //             )}
//     //         </div>
//     //
//     //         <div className="file-tree-container">
//     //             <FileTree data={data}/>
//     //         </div>
//     //
//     //     </div>
//     // );
//     return (
//         <div className="dashboard-container">
//
//             {/* === 左侧侧边栏 === */}
//             <aside className="sidebar-container">
//                 {/* Logo 占位 */}
//                 <div style={{ padding: '24px', fontSize: '20px', fontWeight: 'bold', color: 'var(--primary-color)' }}>
//                     <i className="fa-solid fa-cloud" style={{ marginRight: '10px' }}></i>
//                     MagusCloud
//                 </div>
//
//                 {/* 导航菜单占位 */}
//                 <div style={{ padding: '0 12px' }}>
//                     <div style={{ padding: '12px 20px', background: '#eef5ff', color: 'var(--primary-color)', borderRadius: '8px', fontWeight: 600 }}>
//                         <i className="fa-solid fa-folder-open" style={{ width: '24px' }}></i> 全部文件
//                     </div>
//                 </div>
//
//                 <div style={{ marginTop: 'auto', padding: '20px', color: '#888', fontSize: '12px' }}>
//                     (Task 3: 侧边栏施工区)
//                 </div>
//             </aside>
//
//             {/* === 右侧主内容区 === */}
//             <main className="main-container">
//
//                 {/* 顶部 Header */}
//                 <header className="header-area">
//                     <div style={{ color: '#888' }}>全部文件 </div>
//                 </header>
//
//                 {/* 核心内容滚动区 (原本的组件都塞在这里) */}
//                 <div className="content-scroll-area">
//
//                     {/* 把你原本的 个人/总体 用量展示 暂时放在这里 */}
//                     <div style={{ background: 'white', padding: '20px', borderRadius: '12px', marginBottom: '20px', boxShadow: 'var(--shadow-sm)' }}>
//                         <h3>文件存储概览</h3>
//                         <p>个人磁盘用量: {formattedPersonalUsage}</p>
//                         <div className="storage-bar">
//                             {segmentsWithPercent.map((seg, idx) => (
//                                 <div key={idx} className="storage-segment"
//                                      style={{width: `${seg.percent}%`, backgroundColor: seg.color}}
//                                      title={`${seg.name}: ${formatBytes(seg.sizeBytes)}`} />
//                             ))}
//                         </div>
//                         {/* Legend 简略版 */}
//                         <ul className="storage-legend" style={{ marginBottom: 0 }}>
//                             {segmentsWithPercent.map((seg, idx) => (
//                                 <li key={idx}><span className="legend-dot" style={{backgroundColor: seg.color}}></span>{seg.name}</li>
//                             ))}
//                         </ul>
//                     </div>
//
//                     {/* 上传区域 */}
//                     <div style={{ background: 'white', padding: '20px', borderRadius: '12px', marginBottom: '20px', boxShadow: 'var(--shadow-sm)' }}>
//                         <div className="upload-section" style={{ margin: 0 }}>
//                             <input type="file" id="file-upload" style={{display: 'none'}} onChange={handleFileChange} />
//                             <label htmlFor="file-upload" className="upload-btn">
//                                 <i className="fa-solid fa-cloud-arrow-up"></i> 选择文件
//                             </label>
//
//                             <input ref={folderInputRef} type="file" id="folder-upload" style={{display: 'none'}} onChange={handleFolderChange} />
//                             <label htmlFor="folder-upload" className="upload-btn" style={{ marginLeft: '10px', background: 'white', border: '1px solid #ddd', color: '#333' }}>
//                                 <i className="fa-solid fa-folder-plus"></i> 选择文件夹
//                             </label>
//
//                             {(selectedFile || selectedFolderName) && (
//                                 <span className="selected-file">
//                                     {selectedFile ? selectedFile.name : `文件夹: ${selectedFolderName}`}
//                                 </span>
//                             )}
//
//                             <button className="upload-btn" onClick={() => handleUpload(!!selectedFolderFiles)}
//                                     disabled={(uploading) || (!selectedFile && !selectedFolderFiles)}
//                                     style={{ marginLeft: 'auto' }}
//                             >
//                                 {uploading ? '上传中...' : '开始上传'}
//                             </button>
//                         </div>
//
//                         {uploadError && <div className="upload-error">{uploadError}</div>}
//                         {uploading && <div className="upload-progress-bar"><div className="upload-progress-fill" style={{width: `${uploadProgress}%`}}></div></div>}
//                     </div>
//
//                     {/* 文件树 */}
//                     <div className="file-tree-container">
//                         <FileTree data={data}/>
//                     </div>
//                 </div>
//             </main>
//         </div>
//     );
//
// }

// src/pages/Dashboard.tsx
import React, { useEffect, useMemo, useRef, useState } from 'react';
import "../styles/Dashboard.css";
// import type { FileTreeNode } from "../components/file_tree/FileTree.tsx";
// import FileTree from "../components/file_tree/FileTree.tsx";
import FileTree, { FileTreeNode, SortKey } from "../components/file_tree/FileTree.tsx";
import Sidebar from "./Sidebar.tsx";
import Header from "../components/header/Header.tsx";
import ShareList, { ShareItem } from "../components/actions/ShareList.tsx"; // 引入分享列表
import { message } from 'antd'; // 引入提示组件

// ==========================================
// 类型定义 & 工具函数 (保持不变)
// ==========================================
type FileItem = { name: string, size: string, mtime: string, type: 'file' | 'folder', children?: FileItem[] };

function parseSize(sizeStr: string): number {
    if (!isNaN(Number(sizeStr))) return Number(sizeStr);
    const match = sizeStr.match(/(\d+(?:\.\d+)?)(\s*)([a-zA-Z]+)/);
    if (!match) return 0;
    const [_, numStr, , unit] = match;
    const num = parseFloat(numStr);
    const unitMap: Record<string, number> = { BYTES: 1, B: 1, KB: 1024, MB: 1024 ** 2, GB: 1024 ** 3 };
    return num * (unitMap[unit.toUpperCase()] || 1);
}

function formatBytes(bytes: number, decimals = 2): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(decimals < 0 ? 0 : decimals)) + ' ' + sizes[i];
}

function addIdsAndCalculateSize(nodes: FileItem[], parentId = ""): FileTreeNode[] {
    return nodes.map((node) => {
        const id = parentId ? `${parentId}/${node.name}` : node.name;

        let nodeSizeInBytes = 0;
        let formattedSize = node.size; // 默认为原始值

        // 🔥 修复：如果节点是文件，立即解析并格式化它的大小
        if (node.type === 'file' && node.size) {
            nodeSizeInBytes = parseSize(node.size); // 1. 解析
            formattedSize = formatBytes(nodeSizeInBytes);  // 2. 格式化 (e.g., "63.41 KB")
        }

        const newNode: FileTreeNode = {
            id,
            name: node.name,
            type: node.type,
            size: formattedSize, // 使用格式化后的值
            mtime: node.mtime ? node.mtime.replace('T', ' ').replace('Z', '') : undefined,
            children: [],
        };

        // 如果是文件夹，递归处理子节点
        if (node.type === 'folder' && Array.isArray(node.children)) {
            newNode.children = addIdsAndCalculateSize(node.children, id);

            // 累加所有子节点的大小 (parseSize 可以正确解析 "63.41 KB" 这类字符串)
            const folderTotalSize = newNode.children.reduce((sum, child) => {
                return sum + (child.size ? parseSize(child.size) : 0);
            }, 0);

            // 格式化文件夹的总大小
            newNode.size = formatBytes(folderTotalSize);
        }

        return newNode;
    });
}

// const getCurrentFolderChildren = (rootData: FileTreeNode[], path: string[]): FileTreeNode[] => {
//     let currentLevel = rootData;
//     for (const folderName of path) {
//         const foundNode = currentLevel.find(node => node.name === folderName && node.type === 'folder');
//         if (foundNode && foundNode.children) {
//             currentLevel = foundNode.children;
//         } else {
//             return [];
//         }
//     }
//     return [...currentLevel].sort((a, b) => {
//         if (a.type === b.type) return 0;
//         return a.type === 'folder' ? -1 : 1;
//     });
// };
const getCurrentFolderChildren = (rootData: FileTreeNode[], path: string[]): FileTreeNode[] => {
    let currentLevel = rootData;
    for (const folderName of path) {
        const foundNode = currentLevel.find(node => node.name === folderName && node.type === 'folder');
        if (foundNode && foundNode.children) {
            currentLevel = foundNode.children;
        } else {
            return [];
        }
    }
    return [...currentLevel]; // 返回原始数组
};


type SortDirection = 'asc' | 'desc';
interface SortConfig {
    key: SortKey;
    direction: SortDirection;
}

const PAGE_SIZE = 10;

export default function Dashboard() {
    // ==========================================
    // 1. 状态管理
    // ==========================================
    // 页面切换状态
    const [activeTab, setActiveTab] = useState<'all' | 'share'>('all');

    // 文件列表状态
    const [files, setFiles] = useState<FileItem[]>([]);
    const [usage, setUsage] = useState<string>('计算中...');
    const [data, setData] = useState<FileTreeNode[]>([]);
    const [currentPath, setCurrentPath] = useState<string[]>([]);

    // 分享列表状态
    const [shareItems, setShareItems] = useState<ShareItem[]>([]);
    // 排序、搜索、分页状态
    const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'name', direction: 'asc' });
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    // 上传状态
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [selectedFolderFiles, setSelectedFolderFiles] = useState<FileList | null>(null);
    const [selectedFolderName, setSelectedFolderName] = useState('');
    const [uploading, setUploading] = useState(false);
    const [uploadError, setUploadError] = useState('');
    const [uploadProgress, setUploadProgress] = useState(0);
    const folderInputRef = useRef<HTMLInputElement>(null);

    // ==========================================
    // 2. 数据获取 (API)
    // ==========================================

    // 获取文件列表
    const fetchFiles = () => {
        fetch('/api/files', { credentials: 'include' })
            .then(res => res.json())
            .then(data => {
                setFiles(data.files || []);
                setUsage(data.usage || '0 B');
            })
            .catch(err => console.error("Fetch files error:", err));
    };

    // 获取分享列表
    const fetchShareList = () => {
        fetch('/api/share/list', { method: 'GET', credentials: 'include' })
            .then(res => res.json())
            .then(data => {
                const list = Array.isArray(data) ? data : (data.data || []);
                setShareItems(list);
            })
            .catch(err => console.error("Fetch share list error:", err));
    };

    // 取消分享
    const handleCancelShare = async (shareId: string) => {
        try {
            const res = await fetch(`/api/share/${shareId}`, { method: 'DELETE', credentials: 'include' });
            if (res.ok) {
                message.success('已取消分享');
                fetchShareList();
            } else {
                message.error('取消失败');
            }
        } catch (error) {
            message.error('请求出错');
        }
    };

    // ==========================================
    // 3. 生命周期 Effect
    // ==========================================
    useEffect(() => {
        fetchFiles(); // 初始化加载文件
        if (folderInputRef.current) {
            folderInputRef.current.setAttribute('directory', '');
            folderInputRef.current.setAttribute('webkitdirectory', '');
        }
    }, []);

    // 监听 Tab 切换，懒加载数据
    useEffect(() => {
        if (activeTab === 'share') {
            fetchShareList();
        } else if (activeTab === 'all') {
            fetchFiles();
        }
    }, [activeTab]);

    // 构建树结构
    useEffect(() => {
        if (files.length === 0) {
            setData([]);
            return;
        };
        const treeData = addIdsAndCalculateSize(files);
        setData(treeData);
    }, [files]);

    // ==========================================
    // 4. 交互 Handlers
    // ==========================================

    // 切换侧边栏 Tab
    const handleTabChange = (tab: 'all' | 'share') => {
        setActiveTab(tab);
        if (tab === 'all') setCurrentPath([]); // 切回全部文件时重置路径
    };

    // 面包屑导航
    const handleNavigate = (newPath: string[]) => {
        setCurrentPath(newPath);
    };

    // 文件夹点击进入
    const handleFolderClick = (folderName: string) => {
        setCurrentPath([...currentPath, folderName]);
    };

    // 排序 Handler
    const handleSort = (key: SortKey) => {
        let direction: SortDirection = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
        setCurrentPage(1); // 排序后重置到第一页
    };

    // 搜索 Handler
    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearchTerm(e.target.value);
        setCurrentPage(1); // 搜索后重置到第一页
    };

    // 分页 Handler
    const handlePageChange = (newPage: number) => {
        setCurrentPage(newPage);
    };

    // 上传逻辑 (保持不变)
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            setSelectedFile(e.target.files[0]);
            setSelectedFolderFiles(null);
            setSelectedFolderName('');
            setUploadError('');
        }
    };

    const handleFolderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            setSelectedFolderFiles(e.target.files);
            setSelectedFile(null);
            setUploadError('');
            if (e.target.files[0].webkitRelativePath) {
                const pathParts = e.target.files[0].webkitRelativePath.split('/');
                if (pathParts.length > 0) setSelectedFolderName(pathParts[0]);
            }
        }
    };

    const handleUpload = (isFolder = false) => {
        if ((!selectedFile && !selectedFolderFiles) || uploading) return;
        setUploading(true);
        setUploadError('');
        setUploadProgress(0);

        const formData = new FormData();
        if (isFolder && selectedFolderFiles) {
            Array.from(selectedFolderFiles).forEach(file => {
                const newFile = new File([file], file.webkitRelativePath);
                formData.append('folderFiles', newFile);
            });
            formData.append('folderName', selectedFolderName);
        } else if (selectedFile) {
            formData.append('file', selectedFile);
        }

        const xhr = new XMLHttpRequest();
        xhr.upload.onprogress = (event) => {
            if (event.lengthComputable) {
                setUploadProgress(Math.round((event.loaded / event.total) * 100));
            }
        };
        xhr.onload = () => {
            if (xhr.status === 200) {
                fetchFiles();
                setSelectedFile(null);
                setSelectedFolderFiles(null);
                setSelectedFolderName('');
                setUploadProgress(0);
            } else {
                setUploadError(`上传失败：${xhr.status}`);
            }
            setUploading(false);
        };
        xhr.onerror = () => {
            setUploadError('上传出错');
            setUploading(false);
        };
        const url = isFolder ? '/api/upload-folder' : '/api/upload';
        xhr.open('POST', url, true);
        xhr.withCredentials = true;
        xhr.send(formData);
    };

    // 此块代码将自动在依赖项 (data, currentPath, searchTerm, sortConfig) 变化时
    // 重新计算列表，而在其他 state 变化时使用缓存，性能极高。
    const processedItems = useMemo(() => {
        // 1. 获取基础数据
        let items = getCurrentFolderChildren(data, currentPath);

        // 2. 应用搜索过滤
        if (searchTerm) {
            items = items.filter(item =>
                item.name.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        // 3. 应用排序 (文件夹优先)
        items.sort((a, b) => {
            // 规则1：文件夹始终排在文件前面
            if (a.type === 'folder' && b.type !== 'folder') return -1;
            if (a.type !== 'folder' && b.type === 'folder') return 1;

            // 规则2：按用户选择的列排序
            const { key, direction } = sortConfig;
            const dir = direction === 'asc' ? 1 : -1;

            switch (key) {
                case 'size':
                    return (parseSize(a.size || '0') - parseSize(b.size || '0')) * dir;
                case 'mtime':
                    const dateA = a.mtime ? new Date(a.mtime).getTime() : 0;
                    const dateB = b.mtime ? new Date(b.mtime).getTime() : 0;
                    return (dateA - dateB) * dir;
                case 'name':
                default:
                    return a.name.localeCompare(b.name) * dir;
            }
        });

        return items;
    }, [data, currentPath, searchTerm, sortConfig]);

    // 计算分页
    const totalPages = Math.ceil(processedItems.length / PAGE_SIZE);
    const paginatedItems = processedItems.slice(
        (currentPage - 1) * PAGE_SIZE,
        currentPage * PAGE_SIZE
    );

    // ==========================================
    // 5. 视图渲染
    // ==========================================

    // 渲染主内容区 (根据 Tab 切换)
    const renderMainContent = () => {
        // --- 场景 A: 我的分享 ---
        if (activeTab === 'share') {
            return (
                <div className="file-tree-container" style={{
                    background: 'transparent',
                    minHeight: '400px'
                }}>
                    <ShareList
                        items={shareItems}
                        onCancelShare={handleCancelShare}
                    />
                </div>
            );
        }

        // --- 场景 B: 全部文件 (包含上传框 + 文件列表) ---
        const currentItems = getCurrentFolderChildren(data, currentPath);
        return (
            <>
                {/* 上传卡片 */}
                <div style={{
                    background: 'white',
                    padding: '16px 24px',
                    borderRadius: '12px',
                    marginBottom: '16px',
                    boxShadow: 'var(--shadow-sm)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '12px'
                }}>
                    <div className="upload-section" style={{ margin: 0, display: 'flex', gap: '12px' }}>
                        <input type="file" id="file-upload" style={{display: 'none'}} onChange={handleFileChange} />
                        <label htmlFor="file-upload" className="upload-btn">
                            <i className="fa-solid fa-cloud-arrow-up" style={{marginRight: '8px'}}></i> 上传文件
                        </label>
                        <input ref={folderInputRef} type="file" id="folder-upload" style={{display: 'none'}} onChange={handleFolderChange} />
                        <label htmlFor="folder-upload" className="upload-btn" style={{ background: 'white', border: '1px solid #ddd', color: '#333' }}>
                            <i className="fa-solid fa-folder-plus" style={{marginRight: '8px'}}></i> 文件夹
                        </label>
                    </div>

                    {(selectedFile || selectedFolderName) && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, justifyContent: 'flex-end' }}>
                            <span className="selected-file" style={{ maxWidth: '200px', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                                待上传: <strong>{selectedFile ? selectedFile.name : selectedFolderName}</strong>
                            </span>
                            <button className="upload-btn" onClick={() => handleUpload(!!selectedFolderFiles)}
                                    disabled={(uploading)}
                                    style={{ background: 'var(--primary-color)', color: 'white', border: 'none' }}
                            >
                                {uploading ? `上传中 ${uploadProgress}%` : '开始上传'}
                            </button>
                        </div>
                    )}
                    {uploadError && <div className="upload-error" style={{width: '100%'}}>{uploadError}</div>}
                    {uploading && (
                        <div className="upload-progress-bar" style={{width: '100%'}}>
                            <div className="upload-progress-fill" style={{width: `${uploadProgress}%`}}></div>
                        </div>
                    )}
                </div>

                {/* 文件列表 */}
                {/*<div className="file-tree-container" style={{*/}
                {/*    background: 'transparent',*/}
                {/*    minHeight: '400px'*/}
                {/*}}>*/}
                {/*    <FileTree*/}
                {/*        items={currentItems}*/}
                {/*        onNavigate={handleFolderClick}*/}
                {/*        onDelete={(id) => {*/}
                {/*            console.log('deleted', id);*/}
                {/*            fetchFiles(); // 删除后刷新*/}
                {/*        }}*/}
                {/*    />*/}
                <div className="file-tree-container" style={{
                    background: 'white',
                    borderRadius: '12px',
                    padding: '24px',
                    boxShadow: 'var(--shadow-sm)',
                    minHeight: '400px'
                }}>
                    {/* 🔥 12. 新增搜索框 */}
                    <input
                        type="text"
                        placeholder="在当前文件夹中搜索..."
                        value={searchTerm}
                        onChange={handleSearchChange}
                        style={{
                            width: 'calc(100% - 24px)',
                            padding: '10px 12px',
                            border: '1px solid #ddd',
                            borderRadius: '6px',
                            marginBottom: '16px',
                            fontSize: '14px',
                            outline: 'none',
                            transition: 'border-color 0.2s',
                        }}
                        onFocus={(e) => e.target.style.borderColor = '#3b8cff'}
                        onBlur={(e) => e.target.style.borderColor = '#ddd'}
                    />

                    {/* 🔥 13. 传入排序 Props */}
                    <FileTree
                        items={paginatedItems} // ✅ 传入分页后的列表
                        onNavigate={handleFolderClick}
                        onDelete={(id) => {
                            console.log('deleted', id);
                            fetchFiles();
                        }}
                        sortConfig={sortConfig} // ✅ 传入当前排序
                        onSort={handleSort}     // ✅ 传入排序回调
                    />

                    {/* 🔥 14. 新增分页控制器 */}
                    <div style={{
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        marginTop: '20px',
                        paddingTop: '16px',
                        borderTop: '1px solid #f0f2f5'
                    }}>
                        <button
                            onClick={() => handlePageChange(currentPage - 1)}
                            disabled={currentPage === 1}
                            style={{ padding: '4px 12px', cursor: 'pointer', marginRight: '16px', opacity: currentPage === 1 ? 0.5 : 1 }}
                        >
                            &lt; 上一页
                        </button>
                        <span>
                            第 {currentPage} 页 / 共 {totalPages} 页
                        </span>
                        <button
                            onClick={() => handlePageChange(currentPage + 1)}
                            disabled={currentPage >= totalPages}
                            style={{ padding: '4px 12px', cursor: 'pointer', marginLeft: '16px', opacity: currentPage >= totalPages ? 0.5 : 1 }}
                        >
                            下一页 &gt;
                        </button>
                    </div>
                </div>
            </>
        );
    };

    return (
        <div className="dashboard-container">
            {/* 左侧：传递 activeTab 和 onTabChange */}
            <Sidebar
                usedSize={usage}
                activeTab={activeTab}
                onTabChange={handleTabChange}
            />

            <main className="main-container">
                {/* 头部：如果是分享页，面包屑显示“我的分享” */}
                <Header
                    currentPath={activeTab === 'share' ? ['我的分享'] : currentPath}
                    onNavigate={handleNavigate}
                />

                <div className="content-scroll-area" style={{ padding: '24px' }}>
                    {renderMainContent()}
                </div>
            </main>
        </div>
    );
}