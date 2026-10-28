'use strict';

function rectFitsWithin(rect, area, tolerance = 0.5) {
    return rect.top >= area.top - tolerance && rect.left >= area.left - tolerance &&
        rect.bottom <= area.bottom + tolerance && rect.right <= area.right + tolerance;
}

function descriptionFits(card) {
    const body = card.querySelector('.description');
    const area = body.getBoundingClientRect();
    const range = document.createRange();
    range.selectNodeContents(body);
    // Range rectangles measure the rendered lines, including fractional pixels.
    return Array.from(range.getClientRects()).every(rect =>
        !rect.width || !rect.height || rectFitsWithin(rect, area));
}

function cardFits(card) {
    const bounds = card.getBoundingClientRect();
    const style = getComputedStyle(card);
    const area = {
        top: bounds.top + parseFloat(style.borderTopWidth) + parseFloat(style.paddingTop),
        left: bounds.left + parseFloat(style.borderLeftWidth) + parseFloat(style.paddingLeft),
        bottom: bounds.bottom - parseFloat(style.borderBottomWidth) - parseFloat(style.paddingBottom),
        right: bounds.right - parseFloat(style.borderRightWidth) - parseFloat(style.paddingRight)
    };
    return !card.dataset.unfit && Array.from(card.children).every(child =>
        rectFitsWithin(child.getBoundingClientRect(), area)) && descriptionFits(card);
}

function wordCut(text, limit, blockBreaks = []) {
    if (limit === text.length || /\s/.test(text[limit] || '') || /\s/.test(text[limit - 1] || '')) return limit;
    let cut = 0;
    for (const boundary of blockBreaks) if (boundary <= limit) cut = Math.max(cut, boundary);
    for (const match of text.slice(0, limit).matchAll(/\s+/g)) cut = Math.max(cut, match.index + match[0].length);
    return cut || limit;
}

function descriptionBlockBreaks(root) {
    const boundaries = [];
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT);
    let offset = 0, node;
    while ((node = walker.nextNode())) {
        if (node.nodeType === Node.TEXT_NODE) offset += node.length;
        else if (/^(P|H[3-5]|UL|OL|LI|BLOCKQUOTE|BR|HR)$/.test(node.tagName)) {
            boundaries.push(offset, offset + node.textContent.length);
        }
    }
    return boundaries;
}

// Split DOM ranges so emphasis, links and list items survive a card boundary.
function paginateDescription(card, source, createContinuation) {
    const parts = [];
    let remaining = document.createElement('div');
    remaining.innerHTML = source;
    remaining.querySelectorAll('ol').forEach(list => Array.from(list.children).forEach((li, index) => li.setAttribute('value', index + 1)));
    const clean = root => {
        Array.from(root.querySelectorAll('*')).reverse().forEach(node => {
            if (!node.textContent && !node.querySelector('br,hr') && !['BR', 'HR'].includes(node.tagName)) node.remove();
        });
        return root;
    };
    const fragmentAt = (root, count, tail) => {
        const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
        let node = walker.nextNode(), offset = count;
        while (node && offset > node.length) {
            offset -= node.length;
            node = walker.nextNode();
        }
        const range = document.createRange();
        range.selectNodeContents(root);
        if (node) {
            if (tail) range.setStart(node, offset); else range.setEnd(node, offset);
        }
        const box = document.createElement('div');
        box.append(range.cloneContents());
        return clean(box);
    };
    while (true) {
        const body = card.querySelector('.description');
        body.innerHTML = remaining.innerHTML;
        parts.push(card);
        if (descriptionFits(card)) break;
        const text = remaining.textContent;
        if (!text.length || body.clientHeight < 20) {
            card.dataset.unfit = 'true';
            break;
        }
        // Joining the next part changes the borders and the available width.
        const next = createContinuation();
        let low = 0, high = text.length - 1;
        while (low < high) {
            const middle = Math.ceil((low + high) / 2);
            body.innerHTML = fragmentAt(remaining, middle, false).innerHTML;
            if (descriptionFits(card)) low = middle; else high = middle - 1;
        }
        let cut = low;
        if (cut < 1) {
            next.remove();
            body.innerHTML = remaining.innerHTML;
            card.dataset.unfit = 'true';
            break;
        }
        // Adjacent paragraphs have no whitespace between them in textContent.
        cut = wordCut(text, cut, descriptionBlockBreaks(remaining));
        if (cut > 0 && /[\uD800-\uDBFF]/.test(text[cut - 1])) cut--;
        if (!cut) cut = low;
        const head = fragmentAt(remaining, cut, false), tail = fragmentAt(remaining, cut, true);
        body.innerHTML = head.innerHTML;
        remaining = tail;
        if (!remaining.textContent.length) {
            next.remove();
            break;
        }
        card = next;
    }
    parts.forEach((part, index) => {
        part.querySelector('.card-pagination').textContent = parts.length > 1 ? (index + 1) + ' / ' + parts.length : '';
    });
    return parts;
}

if (typeof module !== 'undefined' && module.exports) module.exports = {rectFitsWithin, descriptionFits, cardFits, wordCut};
