const fs = require('fs');
const ih = fs.readFileSync('index.html', 'utf8');
const lh = fs.readFileSync('leaderboard.html', 'utf8');

const iMatch = ih.match(/<!-- ================= LIVE STADIUM TICKER RIBBON[\s\S]*?<\/header>/);
const lMatch = lh.match(/<!-- ================= LIVE STADIUM TICKER RIBBON[\s\S]*?<\/header>/);

if (iMatch && lMatch) {
  let newLh = lh.replace(lMatch[0], iMatch[0]);
  
  // replace navs to be correct for leaderboard
  newLh = newLh.replace(
    '<button onclick="filterCategory(\'all\')" class="nav-btn px-3 py-1.5 rounded bg-pitch-800 text-white hover:bg-pitch-750 transition flex items-center gap-1.5 border border-pitch-700">\n            <i data-lucide="layout-grid" class="w-3.5 h-3.5 text-volt"></i> Matches & Props\n          </button>',
    '<a href="index.html" class="nav-btn px-3 py-1.5 rounded text-slate-400 hover:text-white hover:bg-pitch-900 transition flex items-center gap-1.5">\n            <i data-lucide="layout-grid" class="w-3.5 h-3.5 text-slate-400"></i> Matches & Props\n          </a>'
  );
  
  newLh = newLh.replace(
    '<a href="leaderboard.html" class="nav-btn px-3 py-1.5 rounded text-slate-400 hover:text-white hover:bg-pitch-900 transition flex items-center gap-1.5">\n            <i data-lucide="trophy" class="w-3.5 h-3.5 text-trophy"></i> Championship\n          </a>',
    '<a href="leaderboard.html" class="nav-btn px-3 py-1.5 rounded bg-pitch-800 text-white hover:bg-pitch-750 transition flex items-center gap-1.5 border border-pitch-700">\n            <i data-lucide="trophy" class="w-3.5 h-3.5 text-trophy"></i> Championship\n          </a>'
  );

  fs.writeFileSync('leaderboard.html', newLh);
  console.log('Fixed leaderboard header!');
} else {
  console.log('Matches not found!');
}
