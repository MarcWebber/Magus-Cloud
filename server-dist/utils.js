"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.toPinyin = toPinyin;
const pinyin_1 = __importDefault(require("pinyin"));
function toPinyin(input) {
    const result = (0, pinyin_1.default)(input, {
        style: pinyin_1.default.STYLE_NORMAL, // 不带音调
        heteronym: false // 不开启多音字模式
    });
    return result.flat().join('');
}
