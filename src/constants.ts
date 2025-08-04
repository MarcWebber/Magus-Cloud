import {FileTreeNode} from "./components/file_tree/FileTree.tsx";

export const initialData: FileTreeNode[] = [
    {
        id: '1',
        name: 'docs',
        type: 'folder',
        children: [
            { id: '2', name: 'report.pdf', type: 'file' },
            { id: '3', name: 'design.docx', type: 'file' },
        ],
    },
    {
        id: '4',
        name: 'image.png',
        type: 'file',
    },
];

export const extMap: Record<string, string> = {
    "txt":'📄',
    "jpg":'🖼️',
    "png":'🖼️',
    "mp4":'🎥',
    "avi":'🎥',
    "mp3":'🎵',
    "wav":'🎵',
    "zip":'📦',
    "rar":'📦',
    "pdf":'📑',
    "xls":'📈',
    "xlsx":'📈',
    "csv":'📈',
    "docx":'📄',
    "json":'📄',
    "html":'🌐',

}

export const nameMap: Record<string, string> = {
    "xuyi":'徐一',

}