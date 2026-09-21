const fs = require('fs');
let html = fs.readFileSync('c:/Users/glpst/Downloads/IsaMarket-main/IsaMarket-main/leaderboard.html', 'utf8');

const scriptMatches = [...html.matchAll(/<script[\s\S]*?>([\s\S]*?)<\/script>/g)];
console.log(scriptMatches[4][1].substring(2000, 3000));
