const fs = require('fs');
const html = fs.readFileSync('leaderboard.html', 'utf8');

const scripts = [...html.matchAll(/<script[\s\S]*?>([\s\S]*?)<\/script>/g)];
scripts.forEach((match, i) => {
  const code = match[1].trim();
  if (!code) return;
  fs.writeFileSync('script_' + i + '.js', code);
  try {
    if (match[0].includes('type="module"')) {
      // For module, import/export causes syntax error in new Function, so we strip them for syntax check
      const cleanCode = code.replace(/import\s+.*?from\s+['"].*?['"];?/g, '');
      new Function(cleanCode);
    } else {
      new Function(code);
    }
    console.log('Script ' + i + ': Syntax OK');
  } catch (e) {
    console.error('Script ' + i + ': Syntax Error: ', e.message);
  }
});
