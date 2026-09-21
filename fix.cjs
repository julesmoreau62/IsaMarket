const fs = require('fs');
let html = fs.readFileSync('c:/Users/glpst/Downloads/IsaMarket-main/IsaMarket-main/index.html', 'utf8');

// 1. Fix closeBetDrawer -> closeTradeDrawer
html = html.replace(/closeBetDrawer\(\);/g, 'closeTradeDrawer();');

// 2. Fix showToast Pari Place
// Assuming we have showToast('Bet Confirmed'...) in executeTrade
const oldToast = "showToast('Bet Confirmed', `You placed ${stake} Squid on ${currentDrawerOutcome}`);";
const newToast = "showToast('Pari Placé!', 'Ton pari a été pris en compte.');";
html = html.replace(oldToast, newToast);

// 3. Fix percentage validation in saveNewMarket
const oldVal = `if (totalProb > 0 && totalProb !== 100) {
        options = options.map(o => ({ ...o, prob: o.prob / (totalProb / 100) }));
      }`;
const newVal = `if (totalProb > 0 && totalProb !== 100) {
        alert('Le total des probabilités doit être exactement de 100% ! Vous avez mis ' + totalProb + '%');
        return;
      }`;
html = html.replace(oldVal, newVal);

fs.writeFileSync('c:/Users/glpst/Downloads/IsaMarket-main/IsaMarket-main/index.html', html);
console.log('Done!');
