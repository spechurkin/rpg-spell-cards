'use strict';
const STORAGE_KEY = 'rpg-spell-cards.deck.v1';
const fields = ['level', 'name', 'action', 'range', 'duration', 'school', 'components', 'description'];
const blankSpell = () => ({id: crypto.randomUUID(), ...Object.fromEntries(fields.map(key => [key, ''])), fontSize: 12});
const initialSpell = () => ({
    ...blankSpell(),
    level: '0',
    name: 'Перенос заряда',
    fontSize: 12,
    action: '1 основное действие',
    range: 'Касание',
    duration: 'Мгновенная',
    school: 'Превращение',
    description: 'Вы можете перенести любое количество зарядов из одного аккумулятора в другой или из одной энергоячейки в другую. Заряды переносятся только между двумя однотипными предметами (двумя аккумуляторами одной ёмкости, двумя одинаковыми энергоячейками и т. д.): вы разряжаете один предмет, заряжая другой.\n\nПеред сотворением заклинания вы должны указать, сколько зарядов собираетесь переносить. Если заряжаемый предмет неспособен вместить выбранное количество зарядов, он должен пройти испытание Стойкости и при провале получит **1d6 урона электричеством**. Заклинание не позволяет определить, насколько разряжен заряжаемый предмет, но вы всегда можете перенести меньше зарядов, чтобы минимизировать риски.'
});

function validateDeck(data) {
    if (!data || data.version !== 1 || !Array.isArray(data.spells) || data.spells.length > 300) throw new Error('Ожидается колода версии 1, не более 300 карточек.');
    return data.spells.map(spell => {
        if (!spell || typeof spell !== 'object') throw new Error('Некорректная карточка в файле.');
        const result = blankSpell();
        for (const field of fields) {
            const limit = field === 'description' ? 30000 : field === 'components' ? 300 : field === 'level' ? 20 : 180;
            if (typeof spell[field] !== 'string' || spell[field].length > limit) throw new Error('Некорректное поле: ' + field + '.');
            result[field] = spell[field].trim();
        }
        if (typeof spell.fontSize !== 'number' || !Number.isFinite(spell.fontSize) || spell.fontSize < 8 || spell.fontSize > 16) throw new Error('Размер текста должен быть от 8 до 16 px.');
        result.fontSize = spell.fontSize;
        return result;
    });
}

if (typeof module !== 'undefined' && module.exports) module.exports = {validateDeck};
if (typeof document !== 'undefined') document.addEventListener('DOMContentLoaded', () => {
    const $ = id => document.getElementById(id), form = $('spell-form'), cards = $('cards'), list = $('spell-list');
    const {escape, render} = EnrichedText;
    let spells = [initialSpell()], selected, saveError = '', timer, frame;
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) spells = validateDeck(JSON.parse(saved));
    } catch {
        saveError = 'Не удалось прочитать сохранённую колоду. Исходные данные оставлены в браузере. Скачайте JSON перед закрытием.';
    }
    selected = spells[0]?.id;
    const current = () => spells.find(spell => spell.id === selected);
    const notify = text => {
        $('message').textContent = text;
        $('message').hidden = false;
        clearTimeout(timer);
        timer = setTimeout(() => $('message').hidden = true, 6000);
    };

    function save() {
        if (saveError) {
            $('save-status').textContent = saveError;
            return;
        }
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify({version: 1, spells}));
            $('save-status').textContent = 'Сохранено в этом браузере. JSON сохранит колоду отдельным файлом.';
        } catch {
            $('save-status').textContent = 'Браузер не сохранил изменения. Скачайте JSON, чтобы не потерять колоду.';
        }
    }

    const icons = {
        action: '<path d="M4 2h12M4 18h12M5 2c0 5 5 5 5 8s-5 3-5 8M15 2c0 5-5 5-5 8s5 3 5 8"/>',
        range: '<path d="M2 6h16v8H2zM5 6v4M8 6v3M11 6v4M14 6v3"/>',
        duration: '<circle cx="10" cy="11" r="7"/><path d="M10 7v4l3 2M7 1h6M10 1v3"/>'
    };
    const icon = kind => '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.4" aria-hidden="true">' + icons[kind] + '</svg>';

    function drawList() {
        $('count').textContent = spells.length;
        list.innerHTML = spells.map(spell => '<button class="spell-item" data-id="' + spell.id + '" aria-pressed="' + (spell.id === selected) + '"><span class="list-level">' + escape(spell.level || '·') + '</span><span>' + escape(spell.name || 'Без названия') + '</span></button>').join('');
    }

    function drawCards() {
        cards.replaceChildren();
        if (!spells.length) {
            cards.innerHTML = '<p class="empty-preview">Здесь появятся ваши карточки. Начните с кнопки «+» в колоде.</p>';
        }
        const pairs = [];
        spells.forEach(spell => {
            let pair, partCount = 0;
            const makeCard = (continuation = false) => {
                if (partCount % 3 === 0) {
                    pair = document.createElement('div');
                    pair.className = 'card-pair';
                    cards.append(pair);
                    pairs.push(pair);
                }
                partCount++;
                const card = document.createElement('article');
                card.className = 'card' + (spell.id === selected ? ' selected' : '') + ($('guides').checked ? ' guide' : '');
                card.dataset.id = spell.id;
                card.tabIndex = 0;
                card.setAttribute('aria-label', 'Редактировать: ' + (spell.name || 'Без названия'));
                card.style.setProperty('--description-size', spell.fontSize + 'px');
                const facts = ['action', 'range', 'duration'].filter(key => spell[key].trim()).map(key => '<span class="fact" title="' + ({
                    action: 'Действие',
                    range: 'Дистанция',
                    duration: 'Длительность'
                }[key]) + '">' + icon(key) + '<span>' + escape(spell[key]) + '</span></span>').join('');
                card.innerHTML = '<h3 class="card-title">' + (spell.level.trim() ? '<span class="level">' + escape(spell.level) + '</span>' : '') + '<span>' + escape(spell.name || 'Без названия') + '</span></h3>' + (facts ? '<div class="card-facts">' + facts + '</div>' : '') + '<div class="description">' + render(spell.description) + '</div>' + '<footer class="card-footer">' + (spell.components.trim() ? '<p class="card-components" title="Компоненты">' + escape(spell.components) + '</p>' : '') + (spell.school.trim() ? '<p class="card-school" title="Школа магии">' + escape(spell.school) + '</p>' : '') + '</footer>';
                if (continuation) {
                    card.classList.add('card-continuation');
                    card.innerHTML = '<div class="description"></div><footer class="card-footer"></footer>';
                }
                card.querySelector('.card-footer').insertAdjacentHTML('beforeend', '<div class="card-pagination"></div>');
                pair.append(card);
                return card;
            };
            paginateDescription(makeCard(), render(spell.description), () => makeCard(true));
        });
        pairs.filter(pair => !pair.children.length).forEach(pair => pair.remove());
        packCardPairs(pairs.filter(pair => pair.children.length)).forEach(items => {
            const page = document.createElement('div');
            page.className = 'print-page';
            items.forEach(({pair, row, column, width}) => {
                pair.style.gridRow = row;
                pair.style.gridColumn = column + ' / span ' + width;
                page.append(pair);
            });
            cards.append(page);
        });
        cancelAnimationFrame(frame);
        frame = requestAnimationFrame(checkOverflow);
    }

    function checkOverflow() {
        const overflowing = [];
        cards.querySelectorAll('.card').forEach(card => {
            const overflow = !cardFits(card);
            card.classList.toggle('overflow', overflow);
            if (overflow) overflowing.push(spells.find(spell => spell.id === card.dataset.id)?.name || 'Без названия');
        });
        $('overflow-warning').hidden = !overflowing.length;
        $('overflow-warning').textContent = 'Текст выходит за допустимую область карточки: ' + [...new Set(overflowing)].join(', ') + '. Сократите название, характеристики или компоненты либо уменьшите размер текста.';
        return overflowing.length;
    }

    function select(id, focus = false) {
        selected = id;
        const spell = current();
        form.hidden = !spell;
        $('empty-editor').hidden = !!spell;
        $('duplicate').disabled = $('delete').disabled = !spell;
        $('export').disabled = $('print').disabled = !spells.length;
        if (spell) {
            for (const field of [...fields, 'fontSize']) form.elements[field].value = spell[field];
            $('font-value').value = spell.fontSize + ' px';
        }
        drawList();
        drawCards();
        if (focus && spell) form.elements.name.focus();
    }

    function add(copy) {
        if (spells.length >= 300) return notify('В одной колоде может быть не более 300 карточек.');
        const spell = copy ? {
            ...copy,
            id: crypto.randomUUID(),
            name: copy.name ? copy.name.slice(0, 172) + ' (копия)' : ''
        } : blankSpell();
        spells.push(spell);
        select(spell.id, true);
        save();
    }

    form.addEventListener('submit', event => event.preventDefault());
    form.addEventListener('input', event => {
        const spell = current(), key = event.target.name;
        if (!spell || ![...fields, 'fontSize'].includes(key)) return;
        if (fields.includes(key) && !event.isComposing) {
            const field = event.target, value = field.value.trimStart();
            if (value !== field.value) {
                const removed = field.value.length - value.length;
                const start = field.selectionStart, end = field.selectionEnd, direction = field.selectionDirection;
                field.value = value;
                field.setSelectionRange(Math.max(0, start - removed), Math.max(0, end - removed), direction);
            }
        }
        spell[key] = key === 'fontSize' ? Number(event.target.value) : event.target.value.trim();
        $('font-value').value = spell.fontSize + ' px';
        drawList();
        drawCards();
        save();
    });
    form.addEventListener('paste', event => {
        const field = event.target;
        if (!fields.includes(field.name) || !event.clipboardData) return;
        event.preventDefault();
        const text = event.clipboardData.getData('text/plain').trim();
        const start = field.selectionStart, end = field.selectionEnd;
        const available = field.maxLength < 0 ? text.length : Math.max(0, field.maxLength - field.value.length + end - start);
        const inserted = text.slice(0, available);
        if (!document.execCommand('insertText', false, inserted)) field.setRangeText(inserted, start, end, 'end');
        field.dispatchEvent(new Event('input', {bubbles: true}));
    });
    form.addEventListener('focusout', event => {
        const field = event.target;
        if (!fields.includes(field.name) || field.value === field.value.trim()) return;
        field.value = field.value.trim();
        field.dispatchEvent(new Event('input', {bubbles: true}));
    });
    $('description').maxLength = 30000;
    $('description').addEventListener('keydown', event => {
        if (!(event.ctrlKey || event.metaKey) || event.altKey) return;
        const key = event.code;
        const marker = key === 'KeyB' ? '**' : key === 'KeyI' ? '*' : key === 'KeyU' ? '__' : key === 'KeyE' ? '`' : key === 'KeyX' && event.shiftKey ? '~~' : key === 'KeyK' ? 'link' : null;
        if (!marker) return;
        event.preventDefault();
        const area = event.currentTarget, start = area.selectionStart, end = area.selectionEnd,
            text = area.value.slice(start, end);
        const before = marker === 'link' ? '[' : marker, after = marker === 'link' ? '](https://)' : marker;
        if (area.value.length + before.length + after.length > area.maxLength) return;
        // execCommand preserves the textarea undo stack in browsers that support it.
        const inserted = document.execCommand('insertText', false, before + text + after);
        if (!inserted) area.setRangeText(before + text + after, start, end, 'end');
        area.setSelectionRange(start + before.length, start + before.length + text.length);
        area.dispatchEvent(new Event('input', {bubbles: true}));
    });
    list.addEventListener('click', event => {
        const item = event.target.closest('[data-id]');
        if (item) select(item.dataset.id);
    });
    cards.addEventListener('click', event => {
        if (event.target.closest('a')) return;
        const card = event.target.closest('.card');
        if (card) select(card.dataset.id);
    });
    cards.addEventListener('keydown', event => {
        if (event.target.classList.contains('card') && ['Enter', ' '].includes(event.key)) {
            event.preventDefault();
            select(event.target.dataset.id, true);
        }
    });
    $('add').onclick = $('empty-add').onclick = () => add();
    $('duplicate').onclick = () => add(current());
    let pendingDelete;
    $('delete').onclick = () => {
        pendingDelete = selected;
        $('delete-name').textContent = current()?.name || 'Без названия';
        $('delete-dialog').showModal();
    };
    $('delete-dialog').addEventListener('close', () => {
        if ($('delete-dialog').returnValue !== 'delete') return;
        const index = spells.findIndex(spell => spell.id === pendingDelete);
        spells = spells.filter(spell => spell.id !== pendingDelete);
        select(spells[Math.min(index, spells.length - 1)]?.id);
        save();
    });
    $('guides').onchange = drawCards;
    $('export').onclick = () => {
        const blob = new Blob([JSON.stringify({version: 1, spells}, null, 2)], {type: 'application/json'});
        const url = URL.createObjectURL(blob), anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = 'spell-cards.json';
        anchor.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    };
    $('import').onclick = () => $('import-file').click();
    $('import-file').onchange = async event => {
        const file = event.target.files[0];
        if (!file) return;
        try {
            if (file.size > 10 * 1024 * 1024) throw new Error('Файл больше 10 МБ.');
            const imported = validateDeck(JSON.parse(await file.text()));
            if (spells.length + imported.length > 300) throw new Error('После добавления будет больше 300 карточек.');
            if (!imported.length) return notify('В файле нет карточек.');
            spells.push(...imported);
            select(imported[0].id);
            save();
            notify('Карточки из файла добавлены в колоду.');
        } catch (error) {
            notify('Не удалось открыть колоду. ' + error.message);
        } finally {
            event.target.value = '';
        }
    };
    $('print').onclick = () => {
        if (checkOverflow()) {
            notify('Сначала исправьте карточки с красной рамкой: текст не помещается.');
            return;
        }
        window.print();
    };
    window.addEventListener('beforeprint', checkOverflow);
    window.addEventListener('resize', () => {
        cancelAnimationFrame(frame);
        frame = requestAnimationFrame(drawCards);
    });
    select(selected);
    if (saveError) $('save-status').textContent = saveError;
});
