import type { SiteConfig } from './site-config';

export const DEFAULT_SPEECH_TEMPLATE = '%(name) %(body)';

export type FieldExtractor = {
  name: string;
  selector: string;
  attribute?: string;
  defaultValue?: string;
};

// Recursively walks child nodes to extract text, replacing emoji <img> elements with their names.
export const extractTextContent = (element: Element, emoji?: SiteConfig['emoji']): string => {
  if (!emoji) {
    return element.textContent ?? '';
  }

  const parts: string[] = [];
  for (const node of element.childNodes) {
    if (node.nodeType === Node.TEXT_NODE) {
      parts.push(node.textContent ?? '');
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      const el = node as Element;
      if (el.matches(emoji.selector)) {
        const emojiName = el.getAttribute(emoji.nameAttribute);
        if (emojiName) {
          // Wrap Twitch emote in ':' for normalization (PogChamp -> :PogChamp:)
          parts.push(emojiName.startsWith(':') ? emojiName : `:${emojiName}:`);
        }
      } else {
        parts.push(extractTextContent(el, emoji));
      }
    }
  }

  return parts.join('');
};

export const extractFieldValues = (element: Element, config: SiteConfig): Record<string, string> => {
  const result: Record<string, string> = {};

  for (const field of config.fields) {
    let value: string | null = null;

    if (field.selector) {
      const targetElement = element.querySelector(field.selector);
      if (targetElement) {
        if (field.attribute) {
          value = targetElement.getAttribute(field.attribute);
        } else {
          const text = extractTextContent(targetElement, config.emoji);
          value = text.trim() || null;
        }
      }
    }

    const resolvedValue = value ?? field.defaultValue;
    result[field.name] = normalizeWhitespaces(resolvedValue ?? '');
  }

  return result;
};

export const formatText = (format: string, fields: Record<string, string>): string =>
  format.replace(/%\((\w+)\)/g, (_match, fieldName) => fields[fieldName] ?? '');

export const normalizeWhitespaces = (text: string): string => text.replace(/\s+/g, ' ').trim();
