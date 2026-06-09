const HEADING_LINE_MULTIPLIER: Record<number, number> = {
  1: 1.6,
  2: 1.45,
  3: 1.3,
  4: 1.15,
  5: 1.05,
  6: 1,
};

const BLOCK_GAP_LINES = 0.5;
const FENCED_BLOCK_PADDING_LINES = 1;
const TABLE_ROW_HEIGHT_LINES = 1;
const LIST_ITEM_GAP_LINES = 0.15;

type MarkdownBlock =
  | { kind: "paragraph"; text: string }
  | { kind: "heading"; level: number; text: string }
  | { kind: "list"; items: string[] }
  | { kind: "fenced"; lines: string[]; open: boolean }
  | { kind: "table"; rows: string[] };

function getCharsPerLine(contentWidth: number): number {
  return Math.max(20, Math.floor(contentWidth / 6.5));
}

function countWrappedLines(text: string, charsPerLine: number): number {
  if (!text) {
    return 0;
  }

  return text.split("\n").reduce((total, line) => {
    const trimmed = line.trim();
    if (!trimmed) {
      return total + 1;
    }
    return total + Math.max(1, Math.ceil(trimmed.length / charsPerLine));
  }, 0);
}

function parseMarkdownBlocks(content: string): MarkdownBlock[] {
  const blocks: MarkdownBlock[] = [];
  const lines = content.split("\n");
  let index = 0;

  while (index < lines.length) {
    const line = lines[index];
    const trimmed = line.trim();

    if (!trimmed) {
      index += 1;
      continue;
    }

    const fenceMatch = trimmed.match(/^(`{3,}|~{3,})(.*)$/);
    if (fenceMatch) {
      const fenceMarker = fenceMatch[1];
      const fenceLines: string[] = [];
      index += 1;

      while (index < lines.length) {
        const innerLine = lines[index];
        if (innerLine.trim().startsWith(fenceMarker)) {
          index += 1;
          blocks.push({ kind: "fenced", lines: fenceLines, open: false });
          break;
        }
        fenceLines.push(innerLine);
        index += 1;
      }

      if (index >= lines.length) {
        blocks.push({ kind: "fenced", lines: fenceLines, open: true });
      }
      continue;
    }

    const headingMatch = trimmed.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      blocks.push({
        kind: "heading",
        level: headingMatch[1].length,
        text: headingMatch[2],
      });
      index += 1;
      continue;
    }

    if (/^\|.+\|$/.test(trimmed)) {
      const rows: string[] = [];
      while (index < lines.length && /^\|.+\|$/.test(lines[index].trim())) {
        const row = lines[index].trim();
        if (!/^\|[\s:|-]+\|$/.test(row)) {
          rows.push(row);
        }
        index += 1;
      }
      if (rows.length > 0) {
        blocks.push({ kind: "table", rows });
      }
      continue;
    }

    if (/^[-*+]\s+/.test(trimmed) || /^\d+\.\s+/.test(trimmed)) {
      const items: string[] = [];
      while (index < lines.length) {
        const listLine = lines[index].trim();
        const itemMatch =
          listLine.match(/^[-*+]\s+(.+)$/) ?? listLine.match(/^\d+\.\s+(.+)$/);
        if (!itemMatch) {
          break;
        }
        items.push(itemMatch[1]);
        index += 1;
      }
      blocks.push({ kind: "list", items });
      continue;
    }

    const paragraphLines: string[] = [line];
    index += 1;
    while (index < lines.length && lines[index].trim()) {
      paragraphLines.push(lines[index]);
      index += 1;
    }
    blocks.push({ kind: "paragraph", text: paragraphLines.join("\n") });
  }

  return blocks;
}

function estimateBlockLines(
  block: MarkdownBlock,
  charsPerLine: number
): number {
  switch (block.kind) {
    case "paragraph":
      return countWrappedLines(block.text, charsPerLine);
    case "heading": {
      const multiplier =
        HEADING_LINE_MULTIPLIER[block.level] ?? HEADING_LINE_MULTIPLIER[6];
      return Math.max(
        1,
        countWrappedLines(block.text, charsPerLine) * multiplier
      );
    }
    case "list":
      return block.items.reduce((total, item, itemIndex) => {
        const itemLines = countWrappedLines(item, charsPerLine);
        const gap = itemIndex === 0 ? 0 : LIST_ITEM_GAP_LINES;
        return total + gap + Math.max(1, itemLines);
      }, 0);
    case "fenced": {
      const lineCount = Math.max(1, block.lines.length);
      return lineCount + FENCED_BLOCK_PADDING_LINES;
    }
    case "table":
      return Math.max(1, block.rows.length) * TABLE_ROW_HEIGHT_LINES;
  }
}

/** Predict rendered line count for a structured reply before DOM measurement. */
export function estimateStructuredReplyLineCount(
  content: string,
  contentWidth: number
): number {
  const trimmed = content.trim();
  if (!trimmed) {
    return 1;
  }

  const charsPerLine = getCharsPerLine(contentWidth);
  const blocks = parseMarkdownBlocks(content);

  if (blocks.length === 0) {
    return Math.max(1, countWrappedLines(content, charsPerLine));
  }

  return blocks.reduce((total, block, blockIndex) => {
    const blockLines = estimateBlockLines(block, charsPerLine);
    const gap = blockIndex === 0 ? 0 : BLOCK_GAP_LINES;
    return total + gap + blockLines;
  }, 0);
}

export function estimateStructuredReplyTextHeight(
  content: string,
  contentWidth: number,
  lineHeight: number
): number {
  const lineCount = estimateStructuredReplyLineCount(content, contentWidth);
  return Math.max(lineHeight, lineCount * lineHeight);
}
