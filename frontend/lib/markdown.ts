// frontend/lib/markdown.ts - Exact markdown and text formatting ported from v1

export const esc = (v: any) =>
  String(v ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[c] || c));

export const time = (n: any) => {
  const num = Math.floor(Number(n) || 0);
  return `${Math.floor(num / 60)}:${String(num % 60).padStart(2, '0')}`;
};

export const date = (s: any) =>
  new Date(s).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

export const inline = (value: string) =>
  esc(value)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/(?<!\*)\*([^*\n]+)\*(?!\*)/g, '<em>$1</em>');

export const speakerDisplayName = (spk: any) => {
  if (spk == null) return '';
  const s = String(spk).trim();
  if (/^speaker\s+\d+$/i.test(s)) {
    return s.charAt(0).toUpperCase() + s.slice(1);
  }
  const mZero = s.match(/^(?:SPEAKER_?)(\d+)$/i);
  if (mZero) {
    const num = parseInt(mZero[1], 10);
    return `Speaker ${num + 1}`;
  }
  if (/^\d+$/.test(s)) {
    const num = parseInt(s, 10);
    return `Speaker ${num + 1}`;
  }
  return s;
};

export function markdown(text: string): string {
  const lines = String(text || '').split(/\r?\n/);
  const cells = (line: string) =>
    line.trim().replace(/^\||\|$/g, '').split('|').map((x) => x.trim());
  const separator = (line: string) =>
    /^\s*\|?\s*:?-{3,}:?\s*(?:\|\s*:?-{3,}:?\s*)+\|?\s*$/.test(line || '');

  const listStack: number[] = [];
  let html = '';

  const closeListsTo = (targetLevel: number) => {
    while (listStack.length > targetLevel) {
      listStack.pop();
      html += '</li></ul>';
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.includes('|') && separator(lines[i + 1])) {
      closeListsTo(0);
      const header = cells(line);
      i += 2;
      let rows = '';
      while (i < lines.length && lines[i].includes('|') && lines[i].trim()) {
        const row = cells(lines[i]);
        rows +=
          '<tr>' +
          header.map((_, n) => `<td>${inline(row[n] || '')}</td>`).join('') +
          '</tr>';
        i++;
      }
      i--;
      html +=
        '<div class="markdown-table"><table><thead><tr>' +
        header.map((c) => `<th>${inline(c)}</th>`).join('') +
        '</tr></thead><tbody>' +
        rows +
        '</tbody></table></div>';
      continue;
    }

    const item = line.match(/^(\s*)[-*]\s+(.+)/);
    if (item) {
      const indent = item[1].length;
      if (listStack.length === 0) {
        listStack.push(indent);
        html += '<ul><li>' + inline(item[2]);
      } else {
        const topIndent = listStack[listStack.length - 1];
        if (indent > topIndent) {
          listStack.push(indent);
          html += '<ul><li>' + inline(item[2]);
        } else if (indent < topIndent) {
          while (listStack.length > 1 && listStack[listStack.length - 1] > indent) {
            listStack.pop();
            html += '</li></ul>';
          }
          html += '</li><li>' + inline(item[2]);
        } else {
          html += '</li><li>' + inline(item[2]);
        }
      }
      continue;
    }

    closeListsTo(0);
    if (!line.trim() || /^\s*[-*_]{3,}\s*$/.test(line)) continue;
    const heading = line.match(/^\s*#{1,4}\s+(.+)/) || line.match(/^\s*\*\*(.+?)\*\*\s*$/);
    html += heading ? `<h3>${inline(heading[1])}</h3>` : `<p>${inline(line)}</p>`;
  }
  closeListsTo(0);
  return html;
}

function parseLocalActionItems(linesText: string): any[] {
  const result: any[] = [];
  for (const line of linesText.split(/\r?\n/)) {
    const stripped = line.trim();
    const item = stripped.match(/^[-*]\s+(?:\[[ xX]\]\s*)?(.+)/);
    if (item) {
      let text = item[1].trim();
      const stamp = text.match(/\[(?:(\d+):(\d{2})|(\d+(?:\.\d+)?)s)\]/);
      let seconds: number | null = null;
      if (stamp) {
        seconds = stamp[1] ? parseInt(stamp[1], 10) * 60 + parseInt(stamp[2], 10) : parseFloat(stamp[3]);
        text = text.replace(stamp[0], ' ');
      }
      const spkMatch = text.match(/(?:\[|\()\s*(Speaker\s*\w+|[A-Z][a-z]+)\s*(?:\]|\))/i);
      let speakerLabel: string | null = null;
      if (spkMatch) {
        speakerLabel = spkMatch[1].trim();
        text = text.replace(spkMatch[0], ' ');
      }
      text = text.replace(/\s*[—–]\s*/g, ', ').replace(/\s+/g, ' ').trim();
      if (text.endsWith(' .')) text = text.slice(0, -2) + '.';
      text = text.replace(/\s+\.\s*$/, '.');
      result.push({
        key: text,
        text,
        checked: false,
        start: seconds,
        speaker: speakerLabel,
      });
    }
  }
  return result;
}

export function summarySections(m: any, onCitationClick?: (seconds: number) => void): string {
  const sections: { title: string; lines: string[] }[] = [];
  let section = { title: '', lines: [] as string[] };

  for (const line of String(m.summary || '').split(/\r?\n/)) {
    const heading = line.match(/^\s*#{1,4}\s+(.+?)\s*$/) || line.match(/^\s*\*\*(.+?)\*\*\s*$/);
    if (heading) {
      if (section.title || section.lines.some((x) => x.trim())) sections.push(section);
      section = { title: heading[1], lines: [] };
    } else {
      section.lines.push(line);
    }
  }
  if (section.title || section.lines.some((x) => x.trim())) sections.push(section);

  return sections
    .map((part) => {
      const cleanTitle = part.title.replace(/^\d+[\.\)]\s*/, '').trim();
      const isAction = /^(action items?|next steps)\s*:?$/i.test(cleanTitle);
      let body = markdown(part.lines.join('\n'));

      const actionList = (m.action_items && m.action_items.length > 0)
        ? m.action_items
        : (isAction ? parseLocalActionItems(part.lines.join('\n')) : []);

      if (isAction && actionList.length > 0) {
        body =
          '<div class="action-list">' +
          actionList
            .map((a: any) => {
              let spk = a.speaker;
              let itemText = a.text || '';
              if (!spk) {
                const mSpk = itemText.match(/(?:\[|\()\s*(Speaker\s*\w+|[A-Z][a-z]+)\s*(?:\]|\))/i);
                if (mSpk) {
                  spk = mSpk[1].trim();
                  itemText = itemText.replace(mSpk[0], ' ');
                }
              }
              itemText = itemText.replace(/\s+\./g, '.').replace(/\s+/g, ' ').trim();
              const citationHtml =
                a.start != null
                  ? `<button type="button" class="action-citation" data-citation="${a.start}">Listen at ${time(
                      a.start
                    )}</button>`
                  : '<span class="action-citation-unavailable">Source timestamp unavailable</span>';
              return `<div class="action-row ${a.checked ? 'is-checked' : ''}"><div class="action-item-content"><input type="checkbox" class="action-checkbox" data-action="${esc(
                a.key
              )}" ${a.checked ? 'checked' : ''} aria-label="Mark action item complete"><span class="action-text">${inline(
                itemText
              )}</span></div><div class="action-meta">${
                spk
                  ? `<span class="action-speaker">${esc(spk)}</span><span class="action-meta-dot" aria-hidden="true">·</span>`
                  : ''
              }${citationHtml}</div></div>`;
            })
            .join('') +
          '</div>';
      }

      const headingHtml = part.title ? `<h3>${inline(part.title)}</h3>` : '';
      return `<section class="summary-section">${headingHtml}${body}</section>`;
    })
    .join('');
}
