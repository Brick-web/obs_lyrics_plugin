/**
 * LRC 解析器测试脚本
 * 测试与上传的 LRC 文件一起的解析功能
 */

import { parseLrc, parseLrcFile, isLrcFile } from '../js/lrcParser.js';

// 测试用的 LRC 内容（来自上传的文件）
const testLrcContent = `[ti:海阔天空]
[00:00.000] 作词 : 黄家驹
[00:01.000] 作曲 : 黄家驹
[00:02.000] 编曲 : Beyond / 梁邦彦
[00:03.000]
[00:18.246] 今天我 寒夜里看雪飘过
[00:24.831] 怀着冷却了的心窝漂远方
[00:30.676] 风雨里追赶 雾里分不清影踪
[00:36.951] 天空海阔你与我
[00:40.003] 可会变（谁没在变）
[00:43.152] 多少次 迎着冷眼与嘲笑
[00:49.791] 从没有放弃过心中的理想
[00:55.688] 一刹那恍惚 若有所失的感觉
[01:01.838] 不知不觉已变淡
[01:04.999] 心里爱（谁明白我）`;

async function runTests() {
    console.log('=== LRC 解析器测试 ===\n');

    // 测试 1: isLrcFile 函数
    console.log('测试 1: 文件类型检测');
    console.assert(isLrcFile('song.lrc') === true, '应该识别 .lrc 文件');
    console.assert(isLrcFile('song.json') === false, '不应该识别 .json 文件');
    console.assert(isLrcFile('song.LRC') === true, '应该识别大写 .LRC 文件');
    console.log('✅ 文件类型检测通过\n');

    // 测试 2: 解析 LRC 内容
    console.log('测试 2: LRC 内容解析');
    const result = parseLrc(testLrcContent);

    console.log('标题:', result.title);
    console.assert(result.title === '海阔天空', '应该正确提取标题');

    console.log('歌词数量:', result.lyrics.length);
    console.assert(result.lyrics.length === 13, `应该有 13 句歌词，实际 ${result.lyrics.length}`);

    console.log('\n歌词示例:');
    result.lyrics.forEach((lyric, index) => {
        if (index < 3 || index >= result.lyrics.length - 1) {
            console.log(`  [${index}] "${lyric.text}" (${lyric.duration}ms)`);
        } else if (index === 3) {
            console.log('  ...');
        }
    });

    // 测试 3: 时长计算
    console.log('\n测试 3: 时长计算');
    const firstLyric = result.lyrics[0];
    const secondLyric = result.lyrics[1];
    console.log(`第1句: "${firstLyric.text}" (${firstLyric.duration}ms)`);
    console.log(`第2句: "${secondLyric.text}" (${secondLyric.duration}ms)`);
    console.assert(firstLyric.duration > 0, '时长应该大于 0');
    console.assert(secondLyric.duration > 0, '时长应该大于 0');
    console.log('✅ 时长计算通过\n');

    // 测试 4: 解析字符串内容
    console.log('测试 4: 字符串内容解析');
    const result2 = await parseLrcFile(testLrcContent);
    console.assert(result2.title === '海阔天空', '通过 parseLrcFile 解析应该正确');
    console.log('✅ 字符串解析通过\n');

    // 测试 5: 空行处理
    console.log('测试 5: 空行处理');
    const lrcWithEmpty = `[ti:测试]
[00:00.000] 第一行
[00:03.000]
[00:06.000] 第二行`;
    const result3 = parseLrc(lrcWithEmpty);
    console.log('歌词数量:', result3.lyrics.length);
    console.assert(result3.lyrics.length === 2, '应该跳过空歌词行');
    console.log('✅ 空行处理通过\n');

    console.log('=== 所有测试通过！ ===');
}

runTests().catch(err => {
    console.error('测试失败:', err);
    process.exit(1);
});
