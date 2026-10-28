'use strict';

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
        if (body.scrollHeight <= body.clientHeight + 1) break;
        const text = remaining.textContent;
        if (!text.length || body.clientHeight < 20) {
            card.dataset.unfit = 'true';
            break;
        }
        let low = 0, high = text.length;
        while (low < high) {
            const middle = Math.ceil((low + high) / 2);
            body.innerHTML = fragmentAt(remaining, middle, false).innerHTML;
            if (body.scrollHeight <= body.clientHeight + 1) low = middle; else high = middle - 1;
        }
        let cut = low;
        if (cut < 1) {
            body.innerHTML = remaining.innerHTML;
            card.dataset.unfit = 'true';
            break;
        }
        // Prefer a word boundary; long unbroken strings still make forward progress.
        const wordEnd = text.slice(0, cut).search(/\s+\S*$/);
        if (wordEnd > cut / 2) cut = wordEnd + 1;
        if (cut > 0 && /[\uD800-\uDBFF]/.test(text[cut - 1])) cut--;
        if (!cut) cut = low;
        const head = fragmentAt(remaining, cut, false), tail = fragmentAt(remaining, cut, true);
        body.innerHTML = head.innerHTML;
        remaining = tail;
        if (!remaining.textContent.length) break;
        card = createContinuation();
    }
    parts.forEach((part, index) => {
        part.querySelector('.card-pagination').textContent = parts.length > 1 ? (index + 1) + ' / ' + parts.length : '';
    });
    return parts;
}
