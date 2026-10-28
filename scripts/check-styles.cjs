const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const sass = require('sass');

const root = path.join(__dirname, '..');
const expected = sass.compile(path.join(root, 'sass/main.scss'), { style: 'expanded' }).css;
const actual = fs.readFileSync(path.join(root, 'style.css'), 'utf8');
const normalize = css => css.replace(/\/\*# sourceMappingURL=.*?\*\//g, '').replace(/\r\n/g, '\n').trim();

assert.equal(normalize(actual), normalize(expected), 'style.css устарел. Запустите npm run styles:build.');
console.log('style.css соответствует sass/main.scss.');
