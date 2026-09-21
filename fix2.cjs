const fs = require('fs');
let html = fs.readFileSync('c:/Users/glpst/Downloads/IsaMarket-main/IsaMarket-main/index.html', 'utf8');

// 1. Fix renderPositionsList
const oldRender = `      container.innerHTML = userPositions.map(p => {
        return \`
          <div class="p-3.5 bg-pitch-950 border border-pitch-800 rounded-lg space-y-2">
            <div class="flex items-start justify-between gap-2">
              <h5 class="text-xs font-bold text-white leading-snug">\${p.marketTitle}</h5>
              <span class="shrink-0 px-2 py-0.5 rounded text-[10px] font-display font-black uppercase tracking-wider bg-volt/20 text-volt border border-volt/30">
                \${p.outcome} @ \${p.decimalOdds.toFixed(2)}
              </span>
            </div>
            <div class="flex items-center justify-between text-[11px] text-slate-400 pt-1.5 border-t border-pitch-800 font-mono">
              <span>Stake: <strong class="text-white">\${p.stake} 🦑</strong></span>
              <span class="text-volt font-bold">Max Return: \${p.payout.toFixed(1)} 🦑 (+\${p.netProfit.toFixed(1)} 🦑)</span>
            </div>
          </div>
        \`;
      }).join('');`;

const newRender = `      container.innerHTML = userPositions.map(p => {
        const decimalOdds = p.stake > 0 ? (p.payout / p.stake) : 1.0;
        const netProfit = p.payout - p.stake;
        return \`
          <div class="p-3.5 bg-pitch-950 border border-pitch-800 rounded-lg space-y-2">
            <div class="flex items-start justify-between gap-2">
              <h5 class="text-xs font-bold text-white leading-snug">\${p.marketTitle}</h5>
              <span class="shrink-0 px-2 py-0.5 rounded text-[10px] font-display font-black uppercase tracking-wider bg-volt/20 text-volt border border-volt/30">
                \${p.outcome} @ \${decimalOdds.toFixed(2)}
              </span>
            </div>
            <div class="flex items-center justify-between text-[11px] text-slate-400 pt-1.5 border-t border-pitch-800 font-mono">
              <span>Stake: <strong class="text-white">\${p.stake} 🦑</strong></span>
              <span class="text-volt font-bold">Max Return: \${(p.payout||0).toFixed(1)} 🦑 (+\${netProfit.toFixed(1)} 🦑)</span>
            </div>
          </div>
        \`;
      }).join('');`;
      
if (html.includes(oldRender)) {
  html = html.replace(oldRender, newRender);
} else {
  console.error("Could not find oldRender");
}

// 2. Add handleProbInput JS
const jsHook = `    function handleProbInput(input) {
      const list = document.getElementById('new-market-options-list');
      const rows = list.querySelectorAll('.market-option-row');
      if (rows.length === 2) {
        const inputs = list.querySelectorAll('.option-prob');
        const otherInput = (inputs[0] === input) ? inputs[1] : inputs[0];
        const val = parseInt(input.value) || 0;
        if (val >= 1 && val <= 99) {
          otherInput.value = 100 - val;
        }
      }
    }

    function addMarketOption() {`;

html = html.replace('    function addMarketOption() {', jsHook);

// 3. Update existing HTML inputs
html = html.replace(/<input type="number" placeholder="%" value="50" min="1" max="99" class="([^"]+)"/g, '<input type="number" placeholder="%" value="50" min="1" max="99" class="$1" oninput="handleProbInput(this)"');

// 4. Update addMarketOption string
html = html.replace(/<input type="number" placeholder="%" value="10" min="1" max="99" class="([^"]+)">/g, '<input type="number" placeholder="%" value="10" min="1" max="99" class="$1" oninput="handleProbInput(this)">');

fs.writeFileSync('c:/Users/glpst/Downloads/IsaMarket-main/IsaMarket-main/index.html', html);
console.log("Fixes applied!");
