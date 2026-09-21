const fs = require('fs'); 
const ih = fs.readFileSync('index.html', 'utf8'); 
const lh = fs.readFileSync('leaderboard.html', 'utf8'); 
const m1 = ih.match(/<nav[\s\S]*?<\/nav>/); 
const m2 = lh.match(/<nav[\s\S]*?<\/nav>/); 
fs.writeFileSync('nav-diff.txt', 'INDEX:\n' + (m1?m1[0]:'null') + '\n\nLEADERBOARD:\n' + (m2?m2[0]:'null'));
