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