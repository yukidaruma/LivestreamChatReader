import {
  extractFieldValues,
  extractTextContent,
  formatText,
  normalizeWhitespaces,
} from '@extension/shared/lib/utils/chat-parser';
import { strict as assert } from 'assert';
import type { FieldExtractor } from '@extension/shared/lib/utils/chat-parser';
import type { SiteConfig } from '@extension/shared/lib/utils/site-config';

const makeSiteConfig = (fields: FieldExtractor[], emoji?: SiteConfig['emoji']): SiteConfig => ({
  id: 'test',
  name: 'Test',
  urlPatterns: [],
  messageSelector: '',
  fields,
  emoji,
});

describe('Text-to-Speech Utility Functions', () => {
  describe('extractFieldValues', () => {
    it('should extract text content from mock elements', () => {
      const mockElement = {
        querySelector: (selector: string) => {
          const mockElements: Record<string, any> = {
            '#author-name': { textContent: 'Donut', childNodes: [{ nodeType: 3, textContent: 'Donut' }] },
            '#message': { textContent: 'Hi', childNodes: [{ nodeType: 3, textContent: 'Hi' }] },
          };
          return mockElements[selector];
        },
      } as Element;

      const config = makeSiteConfig([
        { name: 'name', selector: '#author-name' },
        { name: 'body', selector: '#message' },
      ]);

      const result = extractFieldValues(mockElement, config);
      assert.deepEqual(result, { name: 'Donut', body: 'Hi' });
    });

    it('should extract attributes when specified', () => {
      const mockElement = {
        querySelector: (selector: string) => {
          if (selector === '.user') {
            return {
              getAttribute: (attr: string) => (attr === 'data-id' ? '123' : null),
            };
          }
          return null;
        },
      } as Element;

      const config = makeSiteConfig([{ name: 'userId', selector: '.user', attribute: 'data-id' }]);

      const result = extractFieldValues(mockElement, config);
      assert.deepEqual(result, { userId: '123' });
    });

    it('should use default values when element is not found', () => {
      const mockElement = {
        querySelector: (_selector: string) => null,
      } as Element;

      const config = makeSiteConfig([{ name: 'name', selector: '.missing', defaultValue: 'Anonymous' }]);

      const result = extractFieldValues(mockElement, config);
      assert.deepEqual(result, { name: 'Anonymous' });
    });

    it('should handle empty text content', () => {
      const mockElement = {
        querySelector: (selector: string) => {
          if (selector === '.empty') {
            return { textContent: '   ', childNodes: [{ nodeType: 3, textContent: '   ' }] };
          }
          return null;
        },
      } as Element;

      const config = makeSiteConfig([{ name: 'content', selector: '.empty' }]);

      const result = extractFieldValues(mockElement, config);
      assert.deepEqual(result, { content: '' }); // Should be trimmed to empty string
    });

    it('should handle YouTube message structure', () => {
      const mockElement = {
        querySelector: (selector: string) => {
          const mockElements: Record<string, any> = {
            '#author-name': {
              textContent: 'Donut',
              childNodes: [{ nodeType: 3, textContent: 'Donut' }],
            },
            '#message': {
              textContent: 'Great stream!',
              childNodes: [{ nodeType: 3, textContent: 'Great stream!' }],
            },
          };
          return mockElements[selector];
        },
      } as Element;

      const config = makeSiteConfig([
        { name: 'name', selector: '#author-name' },
        { name: 'body', selector: '#message' },
      ]);

      const result = extractFieldValues(mockElement, config);
      assert.deepEqual(result, { name: 'Donut', body: 'Great stream!' });
    });

    it('should extract emoji names from img elements when emoji config is provided', () => {
      const emojiImg = {
        nodeType: 1,
        matches: (sel: string) => sel === 'img.emoji',
        getAttribute: (attr: string) => (attr === 'shared-tooltip-text' ? ':thumbsup:' : null),
        childNodes: [],
      };

      const messageEl = {
        textContent: 'Hello ',
        childNodes: [{ nodeType: 3, textContent: 'Hello ' }, emojiImg, { nodeType: 3, textContent: ' world' }],
      };

      const mockElement = {
        querySelector: (selector: string) => {
          if (selector === '#message') return messageEl;
          if (selector === '#author-name')
            return { textContent: 'User', childNodes: [{ nodeType: 3, textContent: 'User' }] };
          return null;
        },
      } as Element;

      const config = makeSiteConfig(
        [
          { name: 'name', selector: '#author-name' },
          { name: 'body', selector: '#message' },
        ],
        { selector: 'img.emoji', nameAttribute: 'shared-tooltip-text' },
      );

      const result = extractFieldValues(mockElement, config);
      assert.deepEqual(result, { name: 'User', body: 'Hello :thumbsup: world' });
    });

    it('should extract emoji with Twitch-style alt attribute', () => {
      const emojiImg = {
        nodeType: 1,
        matches: (sel: string) => sel === 'img.chat-line__message--emote',
        getAttribute: (attr: string) => (attr === 'alt' ? 'Kappa' : null),
        childNodes: [],
      };

      const messageEl = {
        textContent: '',
        childNodes: [emojiImg],
      };

      const mockElement = {
        querySelector: (selector: string) => {
          if (selector === '[data-a-target="chat-line-message-body"]') return messageEl;
          if (selector === '.chat-author__display-name')
            return { textContent: 'Viewer', childNodes: [{ nodeType: 3, textContent: 'Viewer' }] };
          return null;
        },
      } as Element;

      const config = makeSiteConfig(
        [
          { name: 'name', selector: '.chat-author__display-name' },
          { name: 'body', selector: '[data-a-target="chat-line-message-body"]' },
        ],
        { selector: 'img.chat-line__message--emote', nameAttribute: 'alt' },
      );

      const result = extractFieldValues(mockElement, config);
      assert.deepEqual(result, { name: 'Viewer', body: 'Kappa' });
    });

    it('should fall back to textContent without emoji config', () => {
      const mockElement = {
        querySelector: (selector: string) => {
          if (selector === '#message') {
            return { textContent: 'plain text', childNodes: [{ nodeType: 3, textContent: 'plain text' }] };
          }
          return null;
        },
      } as Element;

      const config = makeSiteConfig([{ name: 'body', selector: '#message' }]);

      const result = extractFieldValues(mockElement, config);
      assert.deepEqual(result, { body: 'plain text' });
    });
  });

  describe('extractTextContent', () => {
    it('should return textContent when no emoji config is provided', () => {
      const element = { textContent: 'Hello world' } as Element;
      assert.equal(extractTextContent(element), 'Hello world');
    });

    it('should return textContent for null textContent when no emoji config', () => {
      const element = { textContent: null } as Element;
      assert.equal(extractTextContent(element), '');
    });

    it('should extract text from mixed text and emoji nodes', () => {
      const element = {
        childNodes: [
          { nodeType: 3, textContent: 'Hello ' },
          {
            nodeType: 1,
            matches: (sel: string) => sel === 'img.emoji',
            getAttribute: (attr: string) => (attr === 'alt' ? ':wave:' : null),
            childNodes: [],
          },
          { nodeType: 3, textContent: ' there' },
        ],
      } as unknown as Element;

      assert.equal(extractTextContent(element, { selector: 'img.emoji', nameAttribute: 'alt' }), 'Hello :wave: there');
    });

    it('should recurse into non-emoji element nodes', () => {
      const element = {
        childNodes: [
          {
            nodeType: 1,
            matches: (_sel: string) => false,
            childNodes: [
              { nodeType: 3, textContent: 'nested ' },
              {
                nodeType: 1,
                matches: (sel: string) => sel === 'img.emoji',
                getAttribute: (attr: string) => (attr === 'alt' ? ':smile:' : null),
                childNodes: [],
              },
            ],
          },
        ],
      } as unknown as Element;

      assert.equal(extractTextContent(element, { selector: 'img.emoji', nameAttribute: 'alt' }), 'nested :smile:');
    });

    it('should handle emoji with missing attribute gracefully', () => {
      const element = {
        childNodes: [
          { nodeType: 3, textContent: 'Hi ' },
          {
            nodeType: 1,
            matches: (sel: string) => sel === 'img.emoji',
            getAttribute: (_attr: string) => null,
            childNodes: [],
          },
        ],
      } as unknown as Element;

      assert.equal(extractTextContent(element, { selector: 'img.emoji', nameAttribute: 'alt' }), 'Hi ');
    });
  });

  describe('formatText', () => {
    it('should replace single field placeholder', () => {
      const result = formatText('Hello, %(name)!', { name: 'Donut' });
      assert.equal(result, 'Hello, Donut!');
    });

    it('should replace multiple field placeholders', () => {
      const result = formatText('%(name): %(body)', {
        name: 'Donut',
        body: 'Hello there',
      });
      assert.equal(result, 'Donut: Hello there');
    });

    // Note: This should not happen in a real application
    it('should replace missing fields with empty string', () => {
      const result = formatText('%(name): %(body)', { name: 'Donut' });
      assert.equal(result, 'Donut: ');
    });

    it('should handle empty format string', () => {
      const result = formatText('', { name: 'Donut' });
      assert.equal(result, '');
    });

    it('should return text unchanged when no placeholders are used', () => {
      const result = formatText('Plain text', { name: 'Donut' });
      assert.equal(result, 'Plain text');
    });
  });

  describe('normalizeWhitespaces', () => {
    it('should normalize all types of whitespace to single spaces', () => {
      assert.equal(normalizeWhitespaces('Hello     world'), 'Hello world');
      assert.equal(normalizeWhitespaces('Hello\t\t\tworld'), 'Hello world');
      assert.equal(normalizeWhitespaces('Hello\n\nworld'), 'Hello world');
      assert.equal(normalizeWhitespaces('Hello\n\t  \n world'), 'Hello world');
      assert.equal(normalizeWhitespaces('Hello　　world'), 'Hello world'); // Fullwidth space
    });

    it('should trim leading and trailing whitespace', () => {
      assert.equal(normalizeWhitespaces('  \t\n Hello world \n\t  '), 'Hello world');
    });

    it('should return normal text as is', () => {
      assert.equal(normalizeWhitespaces(''), ''); // Empty string
      assert.equal(normalizeWhitespaces('Hello world'), 'Hello world'); // Normal text
    });

    it('should handle real chat message with whitespaces', () => {
      const result = normalizeWhitespaces('Donut:\n\n    Great　stream!\n');
      assert.equal(result, 'Donut: Great stream!');
    });
  });
});
