import React from 'react';

/**
 * JsonLd — renders one or more Schema.org JSON-LD <script> tags.
 *
 * Props:
 *   data — a single JSON-LD object, or null/undefined (renders nothing)
 *   extra — an array of additional JSON-LD objects (e.g. BreadcrumbList, ItemList)
 *
 * Degrades gracefully: if data is null, renders nothing. If extra is empty,
 * only the primary block is rendered. Never throws — invalid data is skipped.
 *
 * This is the single shared entry point for all structured-data injection on
 * public pages. Experience functions return `seo.structured_data` (primary
 * entity) and `seo.structured_data_extra` (array of supplementary blocks).
 */
export default function JsonLd({ data, extra }) {
  const blocks = [];
  if (data && typeof data === 'object' && Object.keys(data).length > 0) {
    blocks.push(data);
  }
  if (Array.isArray(extra)) {
    for (const block of extra) {
      if (block && typeof block === 'object' && Object.keys(block).length > 0) {
        blocks.push(block);
      }
    }
  }
  if (blocks.length === 0) return null;
  return (
    <>
      {blocks.map((block, i) => (
        <script
          key={i}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(block) }}
        />
      ))}
    </>
  );
}