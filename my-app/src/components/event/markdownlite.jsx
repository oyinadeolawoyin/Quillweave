// src/lib/markdownLite.js
//
// Minimal, dependency-free markdown renderer for admin-authored text fields
// (currently: event descriptions). Intentionally supports only:
//   - **bold**  or __bold__
//   - *italic*  or _italic_
//   - paragraphs (a blank line between blocks of text)
//   - single line breaks within a paragraph (Enter without a blank line)
//
// This is NOT a full markdown parser — no links, headers, lists, code
// blocks, etc. If you need those later, swap this out for a real library
// (e.g. `react-markdown`) rather than growing this by hand.
//
// Returns React elements directly (never uses dangerouslySetInnerHTML), so
// there's no HTML-injection surface from admin input.

import React from "react";

function parseInline(text, keyPrefix) {
  // Bold delimiters are checked before italic in the same regex pass so
  // **bold** isn't partially consumed by the italic pattern first.
  const regex = /(\*\*|__)(.+?)\1|(\*|_)(.+?)\3/g;
  const tokens = [];
  let lastIndex = 0;
  let match;
  let i = 0;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) tokens.push(text.slice(lastIndex, match.index));
    if (match[1]) {
      tokens.push(<strong key={`${keyPrefix}-b-${i++}`}>{match[2]}</strong>);
    } else {
      tokens.push(<em key={`${keyPrefix}-i-${i++}`}>{match[4]}</em>);
    }
    lastIndex = regex.lastIndex;
  }
  if (lastIndex < text.length) tokens.push(text.slice(lastIndex));
  return tokens;
}

// Renders full text as paragraphs with bold/italic support. Use for the
// full event description on the event card / event page.
export function renderMarkdownLite(text, options = {}) {
  if (!text) return null;
  const { paragraphClassName = "mb-3 last:mb-0" } = options;
  const paragraphs = text.split(/\n\s*\n/); // blank line = new paragraph

  return paragraphs.map((para, pIdx) => {
    const lines = para.split("\n");
    return (
      <p key={pIdx} className={paragraphClassName}>
        {lines.map((line, lIdx) => (
          <React.Fragment key={lIdx}>
            {lIdx > 0 && <br />}
            {parseInline(line, `${pIdx}-${lIdx}`)}
          </React.Fragment>
        ))}
      </p>
    );
  });
}

// Strips markdown markers down to plain text — for truncated teasers (e.g.
// the homepage promo banner) where rendering partial formatting mid-cut
// could look broken, and raw ** characters shouldn't be visible.
export function stripMarkdown(text) {
  if (!text) return "";
  return text
    .replace(/(\*\*|__)(.+?)\1/g, "$2")
    .replace(/(\*|_)(.+?)\1/g, "$2")
    .replace(/\n\s*\n/g, " ")
    .replace(/\n/g, " ");
}