const fs = require('fs');
let html = fs.readFileSync('c:/Users/glpst/Downloads/IsaMarket-main/IsaMarket-main/index.html', 'utf8');

const startIdx = html.indexOf('<div class="relative overflow-hidden rounded-2xl bg-gradient-to-br from-pitch-900 to-pitch-950 border border-pitch-800 p-6 md:p-10 mb-8 sm:mb-12 shadow-xl">');
const endIdx = html.indexOf('<!-- Categories -->');
if (startIdx !== -1 && endIdx !== -1) {
  html = html.substring(0, startIdx) + html.substring(endIdx);
  fs.writeFileSync('c:/Users/glpst/Downloads/IsaMarket-main/IsaMarket-main/index.html', html);
  console.log('Deleted William Hero Block');
} else {
  console.log('Could not find start/end indices');
}
