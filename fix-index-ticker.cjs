const fs = require('fs');
let html = fs.readFileSync('c:/Users/glpst/Downloads/IsaMarket-main/IsaMarket-main/index.html', 'utf8');

// 1. Remove hardcoded ticker names
html = html.replace(/<span class="text-white font-bold">Thomas Bernard(.*?)<\/span>/g, '<span class="text-white font-bold">Waiting for matches...</span>');
html = html.replace(/<span class="text-white font-bold">Camille Renault(.*?)<\/span>/g, '<span class="text-white font-bold">Waiting for matches...</span>');
html = html.replace(/<span class="text-white font-bold">Lucas Dubois(.*?)<\/span>/g, '<span class="text-white font-bold">Waiting for matches...</span>');

fs.writeFileSync('c:/Users/glpst/Downloads/IsaMarket-main/IsaMarket-main/index.html', html);
console.log('index done');
