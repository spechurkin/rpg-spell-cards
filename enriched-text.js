(function (root) {
    'use strict';
    const escape = value => String(value).replace(/[&<>"']/g, c => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    }[c]));

    function inline(source, depth = 0) {
        if (depth > 12) return escape(source);
        let result = '';
        while (source.length) {
            let match;
            if ((match = /^`([^`\n]+)`/.exec(source))) result += '<code>' + escape(match[1]) + '</code>';
            else if ((match = /^\[([^\]\n]+)\]\(([^\s)]+)\)/.exec(source))) {
                result += /^(https?:\/\/|mailto:)/i.test(match[2]) ? '<a href="' + escape(match[2]) + '" target="_blank" rel="noopener noreferrer">' + inline(match[1], depth + 1) + '</a>' : escape(match[0]);
            } else {
                for (const [marker, tag] of [['***', 'strong'], ['**', 'strong'], ['__', 'u'], ['~~', 's'], ['*', 'em'], ['_', 'em'], ['~', 's']]) {
                    if (!source.startsWith(marker)) continue;
                    const end = source.indexOf(marker, marker.length);
                    if (end <= marker.length) continue;
                    const content = inline(source.slice(marker.length, end), depth + 1);
                    result += '<' + tag + '>' + (marker === '***' ? '<em>' + content + '</em>' : content) + '</' + tag + '>';
                    match = [source.slice(0, end + marker.length)];
                    break;
                }
                if (!match) {
                    if (source[0] === '\\' && source.length > 1) {
                        result += escape(source[1]);
                        source = source.slice(2);
                        continue;
                    }
                    result += escape(source[0]);
                    source = source.slice(1);
                    continue;
                }
            }
            source = source.slice(match[0].length);
        }
        return result;
    }

    function render(source) {
        const lines = String(source).replace(/\r\n?/g, '\n').split('\n');
        let result = '', paragraph = [], list = '', quote = [];
        const flush = () => {
            if (paragraph.length) result += '<p>' + paragraph.map(line => inline(line)).join('<br>') + '</p>';
            paragraph = [];
        };
        const closeList = () => {
            if (list) result += '</' + list + '>';
            list = '';
        };
        const closeQuote = () => {
            if (quote.length) result += '<blockquote>' + quote.map(line => inline(line)).join('<br>') + '</blockquote>';
            quote = [];
        };
        for (const line of lines) {
            const heading = /^(#{1,3})\s+(.+)$/.exec(line), item = /^\s*(?:([-+*])|\d+\.)\s+(.+)$/.exec(line),
                citation = /^>\s?(.*)$/.exec(line);
            if (!line.trim()) {
                flush();
                closeList();
                closeQuote();
            } else if (heading) {
                flush();
                closeList();
                closeQuote();
                const level = heading[1].length + 2;
                result += '<h' + level + '>' + inline(heading[2]) + '</h' + level + '>';
            } else if (/^\s*---+\s*$/.test(line)) {
                flush();
                closeList();
                closeQuote();
                result += '<hr>';
            } else if (item) {
                flush();
                closeQuote();
                const type = item[1] ? 'ul' : 'ol';
                if (type !== list) {
                    closeList();
                    list = type;
                    result += '<' + type + '>';
                }
                result += '<li>' + inline(item[2]) + '</li>';
            } else if (citation) {
                flush();
                closeList();
                quote.push(citation[1]);
            } else {
                closeList();
                closeQuote();
                paragraph.push(line);
            }
        }
        flush();
        closeList();
        closeQuote();
        return result;
    }

    if (typeof module !== 'undefined' && module.exports) module.exports = {escape, render};
    else root.EnrichedText = {escape, render};
})(globalThis);
