/**
 * LRC 文件解析器
 * 将 LRC 格式转换为 JSON 格式（项目内部使用的格式）
 */

export function parseLrc(lrcContent) {
    // 处理不同的行尾格式 (\r\n, \n, \r)
    let lines = lrcContent.split(/\r\n|\r|\n/);
    let title = '未知歌曲';
    let artist = '';

    // 存储时间戳和歌词的键值对
    const lyricsMap = [];

    for (const line of lines) {
        const trimmedLine = line.trim();

        // 跳过空行
        if (!trimmedLine) continue;

        // 提取元数据（例如 [ti:歌名])
        if (trimmedLine.startsWith('[ti:')) {
            title = trimmedLine.replace(/^\[ti:(.+?)\]\s*$/, '$1').trim();
        } else if (trimmedLine.startsWith('[ar:')) {
            artist = trimmedLine.replace(/^\[ar:(.+?)\]\s*$/, '$1').trim();
        }

        // 匹配歌词行：
        // [mm:ss]、[mm:ss.xx]（常见百分之一秒）、[mm:ss.xxx]（毫秒）都支持
        const match = trimmedLine.match(/^\[(\d{1,2}):(\d{2})(?:\.(\d{1,3}))?\]\s*(.*)$/);
        if (match) {
            const [, minutes, seconds, milliseconds, lyricText] = match;

            // 跳过空歌词
            if (!lyricText.trim()) {
                continue;
            }

            // 转换为毫秒：.5 => 500ms, .50 => 500ms, .500 => 500ms
            const ms = milliseconds ? parseInt(milliseconds.padEnd(3, '0'), 10) : 0;
            const totalMs = parseInt(minutes) * 60000 +
                parseInt(seconds) * 1000 +
                ms;

            lyricsMap.push({
                time: totalMs,
                text: lyricText.trim()
            });
        }
    }

    // 排序（确保按时间顺序）
    lyricsMap.sort((a, b) => a.time - b.time);

    // 同一时间点的多行歌词合并：
    // 第一行作为主歌词，第二行及之后作为副歌词/翻译。
    const groupedLyrics = [];
    for (const item of lyricsMap) {
        const last = groupedLyrics[groupedLyrics.length - 1];
        if (last && last.time === item.time) {
            if (last.translation) {
                last.translation += '\n' + item.text;
            } else {
                last.translation = item.text;
            }
        } else {
            groupedLyrics.push({
                time: item.time,
                text: item.text
            });
        }
    }

    // 转换为 JSON 格式（计算每句的 duration）
    const lyrics = groupedLyrics.map((item, index) => {
        // 下一句的开始时间 - 当前句的开始时间，如果是最后一句则设为 3000ms
        const nextTime = index < groupedLyrics.length - 1 ? groupedLyrics[index + 1].time : item.time + 3000;
        const duration = Math.max(nextTime - item.time, 500); // 最少 500ms

        const lyric = {
            text: item.text,
            duration: Math.round(duration)
        };
        if (item.translation) {
            lyric.translation = item.translation;
        }
        return lyric;
    });

    return {
        title: title || '未知歌曲',
        artist: artist,
        lyrics: lyrics
    };
}

/**
 * 判断文件是否为 LRC 格式
 */
export function isLrcFile(filename) {
    return filename.toLowerCase().endsWith('.lrc');
}

/**
 * 从 File 对象或字符串解析 LRC
 */
export async function parseLrcFile(fileOrContent) {
    let content;

    if (fileOrContent instanceof File) {
        content = await fileOrContent.text();
    } else if (typeof fileOrContent === 'string') {
        content = fileOrContent;
    } else {
        throw new Error('Invalid input: must be File or string');
    }

    return parseLrc(content);
}
