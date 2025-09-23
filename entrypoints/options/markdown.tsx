// Supports a subset of Markdown: headings (##, ###), unordered lists (-, up to 2 levels), paragraphs, and links ([text](url)).
//

type ParsedElement = {
  type: 'h3' | 'h4' | 'ul' | 'li' | 'p';
  content: string;
  children?: ParsedElement[];
  level?: number;
};

const parseMarkdown = (markdown: string): ParsedElement[] => {
  const lines = markdown.split('\n').filter(line => line.trim());
  const elements: ParsedElement[] = [];
  let currentList: ParsedElement | null = null;

  for (const line of lines) {
    const trimmed = line.trimEnd();

    // Map markdown headings with 1 increased heading level (## -> h3, ### -> h4)
    if (trimmed.startsWith('## ')) {
      currentList = null;
      elements.push({ type: 'h3', content: trimmed.slice(3) });
    } else if (trimmed.startsWith('### ')) {
      currentList = null;
      elements.push({ type: 'h4', content: trimmed.slice(4) });
    } else if (trimmed.startsWith('- ')) {
      if (!currentList) {
        currentList = { type: 'ul', content: '', children: [] };
        elements.push(currentList);
      }
      currentList.children!.push({ type: 'li', content: trimmed.slice(2) });
    } else if (trimmed.startsWith('  - ')) {
      const lastItem = currentList?.children?.slice(-1)[0];
      if (lastItem) {
        if (!lastItem.children) lastItem.children = [];
        if (lastItem.children.length === 0 || lastItem.children[0].type !== 'ul') {
          lastItem.children.push({ type: 'ul', content: '', children: [] });
        }
        const nestedList = lastItem.children.find(child => child.type === 'ul');
        nestedList?.children?.push({ type: 'li', content: trimmed.slice(4) });
      }
    } else {
      currentList = null;
      elements.push({ type: 'p', content: trimmed });
    }
  }

  return elements;
};

const escapeHtml = (text: string): string =>
  text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const processLinks = (text: string): string => {
  const escaped = escapeHtml(text);

  return escaped.replace(
    /\[([^\]]+)\]\(([^)]+)\)/g,
    (_, linkText, url) => `<a href="${url}" target="_blank" rel="noopener noreferrer">${linkText}</a>`,
  );
};

const renderElementToHtml = (element: ParsedElement): string => {
  const { type, content, children } = element;
  const childrenHtml = children?.map(renderElementToHtml).join('') || '';
  const contentHtml = type === 'ul' ? '' : processLinks(content);

  return `<${type}>${contentHtml}${childrenHtml}</${type}>`;
};

type MarkdownRendererProps = {
  className?: string;
  markdown: string;
};

export const MarkdownRenderer = ({ className, markdown }: MarkdownRendererProps) => {
  const elements = parseMarkdown(markdown);
  const html = elements.map(element => renderElementToHtml(element)).join('');

  return <div className={className} dangerouslySetInnerHTML={{ __html: html }} />;
};
