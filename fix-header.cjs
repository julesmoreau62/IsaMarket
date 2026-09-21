const fs = require('fs');
const ih = fs.readFileSync('index.html', 'utf8');
const lh = fs.readFileSync('leaderboard.html', 'utf8');

const headerI = ih.match(/<header[\s\S]*?<\/header>/)[0];
const headerL = lh.match(/<header[\s\S]*?<\/header>/)[0];

const catI = ih.match(/<!-- ================= CATEGORY FILTER BAR ================= -->[\s\S]*?<\/div>\s*<\/div>\s*<\/div>/);
const catL = lh.match(/<!-- ================= CATEGORY FILTER BAR ================= -->[\s\S]*?<\/div>\s*<\/div>\s*<\/div>/);

let newLh = lh.replace(headerL, headerI);
if (catL) {
    newLh = newLh.replace(catL[0], catI[0]);
} else {
    newLh = newLh.replace('</header>', '</header>\n\n  ' + catI[0]);
}

fs.writeFileSync('leaderboard.html', newLh);
console.log('done');
