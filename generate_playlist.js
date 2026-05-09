const fs = require('fs');
const path = require('path');

const lyricsDir = path.join(__dirname, 'lyrics');
const playlistFile = path.join(__dirname, 'playlist.json');

// 确保 lyrics 目录存在
if (!fs.existsSync(lyricsDir)) {
    console.error('Lyrics directory not found!');
    process.exit(1);
}

const files = fs.readdirSync(lyricsDir);
const playlist = [];

console.log(`Found ${files.length} files in lyrics directory.`);

files.forEach((file, index) => {
    if (path.extname(file).toLowerCase() === '.json') {
        const filePath = path.join(lyricsDir, file);
        try {
            const content = fs.readFileSync(filePath, 'utf8');
            const data = JSON.parse(content);

            // 构造播放列表项
            playlist.push({
                id: `song_${index + 1}`,
                title: data.title || file.replace('.json', ''), // 优先使用文件内的 title，否则用文件名
                path: `lyrics/${file}`
            });
            console.log(`Processed: ${file}`);
        } catch (err) {
            console.error(`Error processing ${file}:`, err.message);
        }
    }
});

fs.writeFileSync(playlistFile, JSON.stringify(playlist, null, 2), 'utf8');
console.log(`\nSuccess! Generated playlist.json with ${playlist.length} songs.`);
