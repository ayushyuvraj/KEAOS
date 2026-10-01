import React, { useState } from 'react';
import { Copy, Check, Terminal, ExternalLink } from 'lucide-react';

/**
 * Institutional Markdown & Natural Document Viewer for KEAOS
 * Strictly adheres to 0px angular geometry, institutional typography, and light/dark theme harmony.
 * Guarantees maximum contrast: Pitch-dark charcoal (#0F172A / text-slate-900) in Light Mode,
 * and high-clarity slate (#E2E8F0 / text-slate-200) in Dark Mode.
 */
export default function MarkdownViewer({ content, isDarkMode = false, className = '' }) {
  if (!content || typeof content !== 'string') {
    return (
      <div className={`p-8 text-center font-mono text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
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

    return blocks.map((block, idx) => renderBlock(block, idx, isDarkMode));
  };

  return (
    <div 
      className={`space-y-4 font-sans text-sm leading-relaxed ${isDarkMode ? 'text-slate-200' : 'text-slate-900'} ${className}`}
      style={{ color: isDarkMode ? '#E2E8F0' : '#0B0F19' }}
    >
      {renderBlocks()}
    </div>
  );
}

// Inline formatting helper: **bold**, *italic*, `code`, [link](url)
function renderInline(text, isDarkMode = false) {
  if (!text) return null;

  // Split by code chunks first to avoid formatting inside inline code
  const parts = text.split(/(`[^`]+`)/g);

  return parts.map((part, pIdx) => {
    if (part.startsWith('`') && part.endsWith('`')) {
      return (
        <code
          key={pIdx}
          className={`px-1.5 py-0.5 font-mono text-[11px] border rounded-none font-semibold ${
            isDarkMode 
              ? 'bg-[#1E293B] text-[#60A5FA] border-[#334155]' 
              : 'bg-[#E2E8F0] text-[#00338D] border-[#CBD5E1]'
          }`}
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
              <strong 
                key={sIdx} 
                className={`font-bold ${isDarkMode ? 'text-white' : 'text-[#001E50]'}`}
              >
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
                    <em 
                      key={iIdx} 
                      className={`italic ${isDarkMode ? 'text-slate-300' : 'text-slate-800'}`}
                    >
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

function renderBlock(block, idx, isDarkMode = false) {
  switch (block.type) {
    case 'heading': {
      const { level, text } = block;
      if (level === 1) {
        return (
          <h1
            key={idx}
            className={`text-xl font-extrabold border-b-2 border-[#00338D] pb-2 mt-6 mb-3 tracking-tight flex items-center justify-between ${
              isDarkMode ? 'text-white' : 'text-[#001E50]'
            }`}
          >
            <span>{renderInline(text, isDarkMode)}</span>
            <span className={`text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded-none ${
              isDarkMode ? 'bg-blue-950 text-blue-300' : 'bg-[#00338D]/10 text-[#00338D]'
            }`}>
              SECTION
            </span>
          </h1>
        );
      }
      if (level === 2) {
        return (
          <h2
            key={idx}
            className={`text-base font-bold border-l-4 border-[#00338D] pl-3 py-0.5 mt-5 mb-2.5 tracking-tight ${
              isDarkMode ? 'text-white' : 'text-[#001E50]'
            }`}
          >
            {renderInline(text, isDarkMode)}
          </h2>
        );
      }
      if (level === 3) {
        return (
          <h3
            key={idx}
            className={`text-sm font-bold mt-4 mb-2 tracking-tight uppercase font-mono text-[13px] ${
              isDarkMode ? 'text-blue-400' : 'text-[#00338D]'
            }`}
          >
            {renderInline(text, isDarkMode)}
          </h3>
        );
      }
      return (
        <h4
          key={idx}
          className={`text-xs font-bold mt-3 mb-1.5 uppercase font-mono tracking-wider ${
            isDarkMode ? 'text-slate-200' : 'text-[#0B0F19]'
          }`}
        >
          {renderInline(text, isDarkMode)}
        </h4>
      );
    }

    case 'paragraph': {
      // Check if paragraph is a labeled field like "Meeting Objective: ..." or "Current Status: ..."
      const isLabeled = /^([A-Za-z\s0-9]+):\s*(.+)$/.test(block.text);
      if (isLabeled && block.text.length < 250) {
        const parts = block.text.split(/:\s*(.+)/);
        return (
          <div 
            key={idx} 
            className={`my-2 p-3 border-l-2 border-[#0091DA] text-xs ${
              isDarkMode ? 'bg-[#0F172A]' : 'bg-[#F8FAFC]'
            }`}
          >
            <span className={`font-bold uppercase font-mono tracking-wider mr-2 ${
              isDarkMode ? 'text-white' : 'text-[#001E50]'
            }`}>
              {parts[0]}:
            </span>
            <span className={isDarkMode ? 'text-slate-200' : 'text-slate-900 font-medium'}>
              {renderInline(parts[1], isDarkMode)}
            </span>
          </div>
        );
      }
      return (
        <p 
          key={idx} 
          className={`my-2 text-xs md:text-sm leading-relaxed ${
            isDarkMode ? 'text-slate-200' : 'text-slate-900 font-medium'
          }`}
        >
          {renderInline(block.text, isDarkMode)}
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
                <li 
                  key={itemIdx} 
                  className={`flex items-start gap-2.5 text-xs ${
                    isDarkMode ? 'text-slate-200' : 'text-slate-900 font-medium'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    readOnly
                    className="mt-0.5 accent-[#00338D] cursor-default rounded-none"
                  />
                  <span className={isChecked ? (isDarkMode ? 'line-through text-slate-500' : 'line-through text-slate-400') : ''}>
                    {renderInline(taskMatch[3], isDarkMode)}
                  </span>
                </li>
              );
            }

            // Numbered list item: 1. text
            const numMatch = trimmed.match(/^(\d+)\.\s+(.*)$/);
            if (numMatch) {
              return (
                <li 
                  key={itemIdx} 
                  className={`flex items-start gap-2.5 text-xs ${
                    isDarkMode ? 'text-slate-200' : 'text-slate-900 font-medium'
                  }`}
                >
                  <span className={`w-5 h-5 font-mono text-[11px] font-bold flex items-center justify-center shrink-0 rounded-none shadow-xs ${
                    isDarkMode 
                      ? 'bg-blue-900/40 text-blue-300 border border-blue-800/50' 
                      : 'bg-[#00338D]/15 text-[#00338D] border border-[#00338D]/30 font-bold'
                  }`}>
                    {numMatch[1]}
                  </span>
                  <span className="pt-0.5 leading-snug">{renderInline(numMatch[2], isDarkMode)}</span>
                </li>
              );
            }

            // Bullet list item
            const bulletText = trimmed.replace(/^[•\-\*]\s+/, '');
            return (
              <li 
                key={itemIdx} 
                className={`flex items-start gap-2.5 text-xs ${
                  isDarkMode ? 'text-slate-200' : 'text-slate-900 font-medium'
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${
                  isDarkMode ? 'bg-blue-400' : 'bg-[#00338D]'
                }`} />
                <span>{renderInline(bulletText, isDarkMode)}</span>
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
      const dataRows = rows.slice(1).filter(r => !r.every(c => /^[-:]+$/.test(c)));

      return (
        <div key={idx} className={`my-3 overflow-x-auto border shadow-xs ${
          isDarkMode ? 'border-[#334155]' : 'border-[#CBD5E1]'
        }`}>
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-[#001E50] text-white text-[11px] font-mono uppercase tracking-wider font-bold">
                {headerRow.map((h, hIdx) => (
                  <th key={hIdx} className="py-2.5 px-3 border-r border-white/10 last:border-r-0">
                    {renderInline(h, isDarkMode)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className={`divide-y ${
              isDarkMode ? 'divide-[#334155] bg-[#0B0F19]' : 'divide-[#E2E8F0] bg-white'
            }`}>
              {dataRows.map((row, rIdx) => (
                <tr key={rIdx} className={isDarkMode ? 'hover:bg-[#1E293B]/40 transition-colors' : 'hover:bg-[#F8F9FB] transition-colors'}>
                  {row.map((cell, cIdx) => (
                    <td 
                      key={cIdx} 
                      className={`py-2 px-3 border-r last:border-r-0 font-medium ${
                        isDarkMode 
                          ? 'text-[#E2E8F0] border-[#334155]' 
                          : 'text-[#0B0F19] border-[#E2E8F0]'
                      }`}
                    >
                      {renderInline(cell, isDarkMode)}
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
          className={`my-3 p-3.5 border-l-4 border-[#00338D] text-xs italic rounded-none leading-relaxed ${
            isDarkMode ? 'bg-[#1E293B]/60 text-slate-300' : 'bg-[#F0F4FA] text-slate-800'
          }`}
        >
          {renderInline(block.text, isDarkMode)}
        </blockquote>
      );
    }

    case 'code': {
      return <CodeBlockRenderer key={idx} code={block.code} lang={block.lang} />;
    }

    case 'hr': {
      return <hr key={idx} className={`my-4 ${isDarkMode ? 'border-[#334155]' : 'border-[#E2E8F0]'}`} />;
    }

    default:
      return null;
  }
}
