import pinyin from 'pinyin';

export function toPinyin(input: string): string {
    const result = pinyin(input, {
        style: pinyin.STYLE_NORMAL, // 不带音调
        heteronym: false            // 不开启多音字模式
    });
    return result.flat().join('');
}