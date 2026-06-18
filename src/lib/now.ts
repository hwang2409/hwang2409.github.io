import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

export interface NowEntry {
  date: string;
  category: string;
  content: string;
}

export interface NowLog {
  note: string;
  entries: NowEntry[];
}

const nowFilePath = path.join(process.cwd(), 'content', 'now.md');
const defaultNote = 'append-only notes, latest first';

function parseNowEntries(markdown: string): NowEntry[] {
  const normalized = markdown.replace(/\r\n/g, '\n').trim();
  const headings = [...normalized.matchAll(/^##\s+(.+?)\s*\/\s*(.+?)\s*$/gm)];

  return headings
    .map((heading, index) => {
      const start = (heading.index ?? 0) + heading[0].length;
      const end = headings[index + 1]?.index ?? normalized.length;

      return {
        date: heading[1].trim(),
        category: heading[2].trim(),
        content: normalized.slice(start, end).trim(),
      };
    })
    .filter((entry) => entry.date && entry.category && entry.content);
}

export function getNowLog(): NowLog {
  if (!fs.existsSync(nowFilePath)) {
    return {
      note: defaultNote,
      entries: [],
    };
  }

  const fileContent = fs.readFileSync(nowFilePath, 'utf8');
  const { data, content } = matter(fileContent);

  return {
    note: typeof data.note === 'string' ? data.note : defaultNote,
    entries: parseNowEntries(content),
  };
}
