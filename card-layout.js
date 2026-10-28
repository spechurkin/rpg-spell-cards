'use strict';

function groupSpellParts(parts) {
    const groups = [];
    for (let i = 0; i < parts.length; i += 3) groups.push(parts.slice(i, i + 3));
    return groups;
}

function packCardPairs(pairs) {
    const pages = [];
    for (const pair of pairs) {
        const width = pair.children.length;
        let placement;
        for (const page of pages) {
            const row = page.rows.findIndex(used => used + width <= 3);
            if (row !== -1) {
                placement = {page, row};
                break;
            }
        }
        if (!placement) {
            const page = {rows: [0, 0, 0], items: []};
            pages.push(page);
            placement = {page, row: 0};
        }
        const {page, row} = placement;
        page.items.push({pair, row: row + 1, column: page.rows[row] + 1, width});
        page.rows[row] += width;
    }
    return pages.map(page => page.items.sort((a, b) => a.row - b.row || a.column - b.column));
}

if (typeof module !== 'undefined' && module.exports) module.exports = {packCardPairs, groupSpellParts};
