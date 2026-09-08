import { isProjectWidgetName, type ProjectWidgetName } from './ProjectWidget';

export function parseProjectContent(html: string) {
  const blocks: Array<{ html: string } | { widget: ProjectWidgetName }> = [];
  let lastIndex = 0;

  for (const match of html.matchAll(/<!--\s*widget:\s*(\S+?)\s*-->/gu)) {
    const widget = match[1];
    if (!isProjectWidgetName(widget)) continue;
    if (match.index > lastIndex) blocks.push({ html: html.slice(lastIndex, match.index) });
    blocks.push({ widget });
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < html.length) blocks.push({ html: html.slice(lastIndex) });
  return blocks;
}
