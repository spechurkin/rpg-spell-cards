const {test} = require('node:test');
const assert = require('node:assert/strict');
const {render} = require('../enriched-text.js');
const {validateDeck} = require('../index.js');
test('emphasis, nesting and literal code', () => {
    assert.equal(render('**жирный _курсив_** и __линия__ ~~нет~~ ~нет~'), '<p><strong>жирный <em>курсив</em></strong> и <u>линия</u> <s>нет</s> <s>нет</s></p>');
    assert.equal(render('`**код**`'), '<p><code>**код**</code></p>');
});
test('paragraphs and block syntax', () => {
    assert.equal(render('## Заголовок\n\n- один\n- два\n\n> цитата\n\n---\n1. первый'), '<h4>Заголовок</h4><ul><li>один</li><li>два</li></ul><blockquote>цитата</blockquote><hr><ol><li>первый</li></ol>');
    assert.equal(render('а\r\nб\n\nв'), '<p>а<br>б</p><p>в</p>');
});
test('HTML and unsafe links never execute', () => {
    assert.equal(render('<img src=x onerror=alert(1)>'), '<p>&lt;img src=x onerror=alert(1)&gt;</p>');
    for (const url of ['javascript:evil', 'data:text/html,evil', '//evil.test']) assert.ok(!render('[x](' + url + ')').includes('<a'));
    assert.ok(render('[x](https://example.com/?a=1&b=2)').includes('href="https://example.com/?a=1&amp;b=2"'));
    assert.ok(!render('[x](https://x.test/"onclick="bad)').includes(' onclick='));
});
const spell = {
    level: '0',
    name: 'Тест',
    action: '1 действие',
    range: 'Касание',
    duration: 'Мгновенная',
    school: '',
    components: '',
    description: '**Текст**',
    fontSize: 12
};
test('deck round trip, optional fields and independent IDs', () => {
    const first = validateDeck({version: 1, spells: [spell, spell]});
    assert.equal(first[0].level, '0');
    assert.equal(first[0].school, '');
    assert.notEqual(first[0].id, first[1].id);
    assert.deepEqual(validateDeck({version: 1, spells: []}), []);
});
test('reject invalid imports before mutation', () => {
    for (const data of [null, {}, {version: 2, spells: []}, {version: 1, spells: [{}]}, {
        version: 1,
        spells: [{...spell, fontSize: NaN}]
    }, {version: 1, spells: [{...spell, description: 'a'.repeat(30001)}]}, {
        version: 1,
        spells: [{...spell, name: {}}]
    }, {version: 1, spells: Array(301).fill(spell)}]) assert.throws(() => validateDeck(data));
});
