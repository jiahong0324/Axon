const fs = require('fs');
const tailwindColors = require('tailwindcss/colors');

const accents = ['blue', 'purple', 'green', 'cyan', 'orange', 'red'];
let css = '\n/* Dynamic Theme Colors */\n';

accents.forEach(accent => {
  const c = tailwindColors[accent];
  if (!c) return;
  const hexToRgb = hex => {
    hex = hex.replace('#', '');
    return parseInt(hex.substring(0, 2), 16) + ' ' +
           parseInt(hex.substring(2, 4), 16) + ' ' +
           parseInt(hex.substring(4, 6), 16);
  };
  
  if (accent === 'blue') {
    css += ':root {\n';
  } else {
    css += '[data-accent="' + accent + '"] {\n';
  }
  
  Object.keys(c).forEach(shade => {
    if (shade !== '950') {
      css += '  --color-theme-' + shade + ': ' + hexToRgb(c[shade]) + ';\n';
    }
  });
  css += '}\n';
});

fs.appendFileSync('./src/index.css', css);
console.log('Added CSS variables');
