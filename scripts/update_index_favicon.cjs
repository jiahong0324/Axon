const fs = require('fs');
let content = fs.readFileSync('index.html', 'utf8');
const isCrlf = content.includes('\r\n');
const nl = isCrlf ? '\r\n' : '\n';

const lines = content.split(/\r?\n/);
const startIndex = lines.findIndex(l => l.includes('<link rel="icon" type="image/x-icon"'));
if (startIndex !== -1) {
  // Find endIndex where apple-touch-icon is
  const endIndex = lines.findIndex((l, i) => i >= startIndex && l.includes('<link rel="apple-touch-icon"'));
  if (endIndex !== -1) {
    const newTags = [
      '    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />',
      '    <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />',
      '    <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />',
      '    <link rel="icon" type="image/x-icon" href="/favicon.ico" />',
      '    <link rel="shortcut icon" href="/favicon.ico" />',
      '    <link rel="apple-touch-icon" href="/icons/logo.png" />'
    ];
    lines.splice(startIndex, endIndex - startIndex + 1, ...newTags);
    fs.writeFileSync('index.html', lines.join(nl), 'utf8');
    console.log('index.html successfully updated with new favicon tags');
  }
}
