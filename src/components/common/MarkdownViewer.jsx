import React, { useState } from 'react';
import { Copy, Check, Terminal, ExternalLink } from 'lucide-react';

/**
 * Institutional Markdown & Natural Document Viewer for KEAOS
 * Strictly adheres to 0px angular geometry, institutional typography, and light/dark theme harmony.
 */
export default function MarkdownViewer({ content, className = '' }) {
  if (!content || typeof content !== 'string') {
    return (
      <div className="p-8 text-center text-slate-400 font-mono text-xs">
        No output content generated.
      </div>
    );
  }

  // Pre-parse markdown blocks: code blocks, tables, lists, headers, quotes, paragraphs
  const renderBlocks = () => {
    const lines = content.split('\n');
    const blocks = [];
    let i = 0;

    while (i < lines.length) {
      const line = lines[i];

      // 1. Code Block (```)
      if (line.trim().startsWith('```')) {
        const lang = line.trim().slice(3).trim() || 'text';
        const codeLines = [];
        i++;
        while (i < lines.length && !lines[i].trim().startsWith('```')) {
          codeLines.push(lines[i]);
          i++;
        }
        i++; // skip closing ```
        blocks.push({
          type: 'code',
          lang,
          code: codeLines.join('\n')
        });
        continue;
      }

      // 2. Table (| col1 | col2 |)
      if (line.trim().startsWith('|') && line.trim().endsWith('|')) {
        const tableLines = [];
        while (i < lines.length && lines[i].trim().startsWith('|') && lines[i].trim().endsWith('|')) {
          tableLines.push(lines[i].trim());
          i++;
        }
        blocks.push({
          type: 'table',
          lines: tableLines
        });
        continue;
      }

      // 3. Horizontal Rule (--- or ***)
      if (/^(\-{3,}|\*{3,}|_{3,})$/.test(line.trim())) {
        blocks.push({ type: 'hr' });
        i++;
        continue;
      }

      // 4. Headings (#, ##, ###, ####)
      const hMatch = line.match(/^(#{1,6})\s+(.*)$/);
      if (hMatch) {
        blocks.push({
          type: 'heading',
          level: hMatch[1].length,
          text: hMatch[2]
        });
        i++;
        continue;
      }

      // 5. Blockquote (> quote)
      if (line.trim().startsWith('>')) {
        const quoteLines = [];
        while (i < lines.length && lines[i].trim().startsWith('>')) {
          quoteLines.push(lines[i].replace(/^>\s?/, ''));
          i++;
        }
        blocks.push({
          type: 'quote',
          text: quoteLines.join('\n')
        });
        continue;
      }

      // 6. Task List or Bullet / Numbered List
      const isListItem = /^\s*([•\-\*]|\d+\.)\s+/.test(line);
      if (isListItem) {
        const listItems = [];
        while (i < lines.length && (/^\s*([•\-\*]|\d+\.)\s+/.test(lines[i]) || (lines[i].startsWith('   ') && listItems.length > 0))) {
          listItems.push(lines[i]);
          i++;
        }
        blocks.push({
          type: 'list',
          items: listItems
        });
        continue;
      }

      // 7. Regular paragraph / text line
      if (line.trim().length === 0) {
        i++;
        continue;
      }

      const pLines = [line];
      i++;
      while (
        i < lines.length &&
        lines[i].trim().length > 0 &&
        !lines[i].trim().startsWith('```') &&
        !lines[i].trim().startsWith('|') &&
        !lines[i].match(/^(#{1,6})\s+/) &&
        !lines[i].trim().startsWith('>') &&
        !/^\s*([•\-\*]|\d+\.)\s+/.test(lines[i]) &&
        !/^(\-{3,}|\*{3,}|_{3,})$/.test(lines[i].trim())
      ) {
        pLines.push(lines[i]);
        i++;
      }
      blocks.push({
        type: 'paragraph',
        text: pLines.join(' ')
      });
    }

    return blocks.map((block, idx) => renderBlock(block, idx));
  };

  return (
    <div className={`space-y-4 font-sans text-sm leading-relaxed text-[#0B0F19] dark:text-[#E2E8F0] ${className}`}>
      {renderBlocks()}
    </div>
  );
}

// Inline formatting helper: **bold**, *italic*, `code`, [link](url)
function renderInline(text) {
  if (!text) return null;

  // Split by code chunks first to avoid formatting inside inline code
  const parts = text.split(/(`[^`]+`)/g);

  return parts.map((part, pIdx) => {
    if (part.startsWith('`') && part.endsWith('`')) {
      return (
        <code
          key={pIdx}
          className="px-1.5 py-0.5 font-mono text-[11px] bg-[#E2E8F0] dark:bg-[#1E293B] text-[#00338D] dark:text-[#60A5FA] border border-[#CBD5E1] dark:border-[#334155] rounded-none font-semibold"
        >
          {part.slice(1, -1)}
        </code>
      );
    }

    // Replace bold (**text** or __text__)
    const subParts = part.split(/(\*\*[^*]+\*\*|__[^_]+__)/g);
    return (
      <span key={pIdx}>
        {subParts.map((sub, sIdx) => {
          if ((sub.startsWith('**') && sub.endsWith('**')) || (sub.startsWith('__') && sub.endsWith('__'))) {
            const boldText = sub.slice(2, -2);
            return (
              <strong key={sIdx} className="font-bold text-[#001E50] dark:text-white">
                {boldText}
              </strong>
            );
          }

          // Replace italics (*text* or _text_)
          const italicParts = sub.split(/(\*[^*]+\*|_[^_]+_)/g);
          return (
            <span key={sIdx}>
              {italicParts.map((it, iIdx) => {
                if ((it.startsWith('*') && it.endsWith('*')) || (it.startsWith('_') && it.endsWith('_'))) {
                  return (
                    <em key={iIdx} className="italic text-slate-700 dark:text-slate-300">
                      {it.slice(1, -1)}
                    </em>
                  );
                }
                return it;
              })}
            </span>
          );
        })}
      </span>
    );
  });
}

function CodeBlockRenderer({ code, lang }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="my-3 border border-[#00338D]/30 dark:border-slate-700 bg-[#0B0F19] text-white shadow-sm overflow-hidden rounded-none">
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#001438] border-b border-white/10 text-xs font-mono text-slate-400">
        <span className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-[#0091DA]">
          <Terminal className="w-3.5 h-3.5" />
          {lang}
        </span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 text-[10px] text-slate-300 hover:text-white transition-colors cursor-pointer"
        >
          {copied ? <Check className="w-3 h-3 text-[#009A44]" /> : <Copy className="w-3 h-3" />}
          <span>{copied ? 'Copied' : 'Copy'}</span>
        </button>
      </div>
      <pre className="p-3.5 text-xs font-mono text-slate-200 overflow-x-auto leading-relaxed select-text">
        <code>{code}</code>
      </pre>
    </div>
  );
}

function renderBlock(block, idx) {
  switch (block.type) {
    case 'heading': {
      const { level, text } = block;
      if (level === 1) {
        return (
          <h1
            key={idx}
            className="text-xl font-extrabold text-[#001E50] dark:text-white border-b-2 border-[#00338D] pb-2 mt-6 mb-3 tracking-tight flex items-center justify-between"
          >
            <span>{renderInline(text)}</span>
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 bg-[#00338D]/10 text-[#00338D] dark:bg-blue-950 dark:text-blue-300 rounded-none">
              SECTION
            </span>
          </h1>
        );
      }
      if (level === 2) {
        return (
          <h2
            key={idx}
            className="text-base font-bold text-[#001E50] dark:text-white border-l-4 border-[#00338D] pl-3 py-0.5 mt-5 mb-2.5 tracking-tight"
          >
            {renderInline(text)}
          </h2>
        );
      }
      if (level === 3) {
        return (
          <h3
            key={idx}
            className="text-sm font-bold text-[#00338D] dark:text-blue-400 mt-4 mb-2 tracking-tight uppercase font-mono text-[13px]"
          >
            {renderInline(text)}
          </h3>
        );
      }
      return (
        <h4
          key={idx}
          className="text-xs font-bold text-[#0B0F19] dark:text-slate-200 mt-3 mb-1.5 uppercase font-mono tracking-wider"
        >
          {renderInline(text)}
        </h4>
      );
    }

    case 'paragraph': {
      // Check if paragraph is a labeled field like "Meeting Objective: ..." or "Current Status: ..."
      const isLabeled = /^([A-Za-z\s0-9]+):\s*(.+)$/.test(block.text);
      if (isLabeled && block.text.length < 250) {
        const parts = block.text.split(/:\s*(.+)/);
        return (
          <div key={idx} className="my-2 p-3 bg-[#F8FAFC] dark:bg-[#0F172A] border-l-2 border-[#0091DA] text-xs">
            <span className="font-bold text-[#001E50] dark:text-white uppercase font-mono tracking-wider mr-2">
              {parts[0]}:
            </span>
            <span className="text-slate-800 dark:text-slate-200">{renderInline(parts[1])}</span>
          </div>
        );
      }
      return (
        <p key={idx} className="my-2 text-xs md:text-sm text-slate-800 dark:text-slate-200 leading-relaxed">
          {renderInline(block.text)}
        </p>
      );
    }

    case 'list': {
      return (
        <ul key={idx} className="my-2 space-y-1.5 pl-1">
          {block.items.map((item, itemIdx) => {
            const trimmed = item.trim();
            // Check for task checkbox: - [ ] or - [x]
            const taskMatch = trimmed.match(/^([•\-\*]|\d+\.)\s*\[([ xX])\]\s*(.*)$/);
            if (taskMatch) {
              const isChecked = taskMatch[2].toLowerCase() === 'x';
              return (
                <li key={itemIdx} className="flex items-start gap-2.5 text-xs text-slate-800 dark:text-slate-200">
                  <input
                    type="checkbox"
                    checked={isChecked}
                    readOnly
                    className="mt-0.5 accent-[#00338D] cursor-default rounded-none"
                  />
                  <span className={isChecked ? 'line-through text-slate-400' : ''}>
                    {renderInline(taskMatch[3])}
                  </span>
                </li>
              );
            }

            // Numbered list item: 1. text
            const numMatch = trimmed.match(/^(\d+)\.\s+(.*)$/);
            if (numMatch) {
              return (
                <li key={itemIdx} className="flex items-start gap-2 text-xs text-slate-800 dark:text-slate-200">
                  <span className="w-5 h-5 bg-[#00338D]/10 dark:bg-blue-900/40 text-[#00338D] dark:text-blue-300 font-mono text-[11px] font-bold flex items-center justify-center shrink-0 rounded-none">
                    {numMatch[1]}
                  </span>
                  <span className="pt-0.5">{renderInline(numMatch[2])}</span>
                </li>
              );
            }

            // Bullet list item
            const bulletText = trimmed.replace(/^[•\-\*]\s+/, '');
            return (
              <li key={itemIdx} className="flex items-start gap-2.5 text-xs text-slate-800 dark:text-slate-200">
                <span className="w-1.5 h-1.5 rounded-full bg-[#00338D] dark:bg-blue-400 mt-1.5 shrink-0" />
                <span>{renderInline(bulletText)}</span>
              </li>
            );
          })}
        </ul>
      );
    }

    case 'table': {
      const rows = block.lines.map(line =>
        line
          .split('|')
          .slice(1, -1)
          .map(cell => cell.trim())
      );
      if (rows.length === 0) return null;
      const headerRow = rows[0];
      // Skip separator row (e.g. |---|---|)
      const dataRows = rows.slice(1).filter(r => !r.every(c => /^[-:]+$/.test(c)));

      return (
        <div key={idx} className="my-3 overflow-x-auto border border-[#CBD5E1] dark:border-[#334155] shadow-xs">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-[#001E50] text-white text-[11px] font-mono uppercase tracking-wider font-bold">
                {headerRow.map((h, hIdx) => (
                  <th key={hIdx} className="py-2.5 px-3 border-r border-white/10 last:border-r-0">
                    {renderInline(h)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0] dark:divide-[#334155] bg-white dark:bg-[#0B0F19]">
              {dataRows.map((row, rIdx) => (
                <tr key={rIdx} className="hover:bg-[#F8F9FB] dark:hover:bg-[#1E293B]/40 transition-colors">
                  {row.map((cell, cIdx) => (
                    <td key={cIdx} className="py-2 px-3 text-[#0B0F19] dark:text-[#E2E8F0] border-r border-[#E2E8F0] dark:border-[#334155] last:border-r-0 font-medium">
                      {renderInline(cell)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }

    case 'quote': {
      return (
        <blockquote
          key={idx}
          className="my-3 p-3.5 bg-[#F0F4FA] dark:bg-[#1E293B]/60 border-l-4 border-[#00338D] text-xs text-slate-700 dark:text-slate-300 italic rounded-none leading-relaxed"
        >
          {renderInline(block.text)}
        </blockquote>
      );
    }

    case 'code': {
      return <CodeBlockRenderer key={idx} code={block.code} lang={block.lang} />;
    }

    case 'hr': {
      return <hr key={idx} className="my-4 border-[#E2E8F0] dark:border-[#334155]" />;
    }

    default:
      return null;
  }
}
