const fs = require('fs');
const lh = fs.readFileSync('leaderboard.html', 'utf8');
const scriptMatch = lh.match(/<script>([\s\S]*?)<\/script>/);
if (scriptMatch) {
  try {
    new Function(scriptMatch[1]);
    console.log('Syntax OK');
  } catch (e) {
    console.error('Syntax Error:', e);
  }
} else {
  console.log('No script found');
}
