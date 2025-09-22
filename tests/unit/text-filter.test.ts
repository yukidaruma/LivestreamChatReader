import { applyTextFilters } from '../../packages/shared/lib/utils/text-filter';
import { describe, it } from 'bun:test';
import { strict as assert } from 'assert';
import type { TextFilter } from '../../packages/storage/lib/base/types';

describe('Text Filter Functions', () => {
  describe('applyTextFilters', () => {
    describe('empty filters', () => {
      it('should return input text unchanged', () => {
        const filters: TextFilter[] = [];
        const result = applyTextFilters('Hello World!', filters);
        assert.equal(result, 'Hello World!');
      });
      it('should return input text unchanged when no filters are enabled', () => {
        const filters: TextFilter[] = [
          {
            id: 1,
            enabled: false,
            target: 'output',
            type: 'pattern',
            pattern: 'Hello',
            replacement: 'Hi',
          },
        ];
        const result = applyTextFilters('Hello World!', filters);
        assert.equal(result, 'Hello World!');
      });
    });

    describe('pattern filters', () => {
      it('should apply non-regex text replacement', () => {
        const filters: TextFilter[] = [
          {
            id: 1,
            enabled: true,
            target: 'output',
            type: 'pattern',
            pattern: 'う',
            replacement: 'あ',
          },
        ];

        const result = applyTextFilters('あいうえお', filters);
        assert.equal(result, 'あいあえお');
      });

      it('should not normalize whitespaces', () => {
        const filters: TextFilter[] = [
          {
            id: 1,
            enabled: true,
            target: 'output',
            type: 'pattern',
            pattern: 'Hello',
            replacement: '',
          },
        ];

        const result = applyTextFilters('   Hello  World!   ', filters);
        assert.equal(result, '     World!   '); // Should trim whitespaces
      });

      it('should treat pattern as literal text when isRegex is false', () => {
        const filters: TextFilter[] = [
          {
            id: 1,
            enabled: true,
            target: 'output',
            type: 'pattern',
            pattern: '(test)',
            replacement: '[TEST]',
          },
        ];

        const result = applyTextFilters('Hello (test) world', filters);
        assert.equal(result, 'Hello [TEST] world');
      });

      it('should support capture groups in regex replacement', () => {
        const filters: TextFilter[] = [
          {
            id: 1,
            enabled: true,
            target: 'output',
            type: 'pattern',
            isRegex: true,
            pattern: '(\\w+) (\\w+)',
            replacement: '$2 $1',
          },
        ];

        const result = applyTextFilters('hello world', filters);
        assert.equal(result, 'world hello');
      });

      it('should skip disabled filter', () => {
        const filters: TextFilter[] = [
          {
            id: 1,
            enabled: false,
            target: 'output',
            type: 'pattern',
            pattern: 'test',
            replacement: 'TEST',
          },
        ];

        const result = applyTextFilters('test message', filters);
        assert.equal(result, 'test message');
      });

      it('should handle invalid regex gracefully', () => {
        const filters: TextFilter[] = [
          {
            id: 1,
            enabled: true,
            target: 'output',
            type: 'pattern',
            isRegex: true,
            pattern: '[a-z', // Invalid regex
            replacement: 'X',
          },
        ];

        const result = applyTextFilters('Hello World!', filters);
        assert.equal(result, 'Hello World!');
      });
    });

    describe('command filters: end', () => {
      it('should not work without pattern', () => {
        const filters: TextFilter[] = [
          {
            id: 1,
            enabled: true,
            target: 'output',
            type: 'command',
            command: 'mute',
          },
        ];

        const result = applyTextFilters('Hello World!', filters);
        assert.equal(result, 'Hello World!');
      });

      it('should terminate filtering and ignore subsequent filters', () => {
        const filters: TextFilter[] = [
          {
            id: 1,
            enabled: true,
            target: 'output',
            type: 'pattern',
            pattern: 'Hello',
            replacement: 'Hi',
          },
          {
            id: 2,
            enabled: true,
            target: 'output',
            type: 'command',
            command: 'mute',
            pattern: 'Hi World!',
          },
          {
            id: 3,
            enabled: true,
            target: 'output',
            type: 'pattern',
            pattern: 'World',
            replacement: 'Universe',
          },
        ];

        const result = applyTextFilters('Hello World!', filters);
        assert.equal(result, null);
      });

      it('should ignore unknown command', () => {
        const filters: TextFilter[] = [
          {
            id: 1,
            enabled: true,
            target: 'output',
            type: 'command',
            command: 'unknown' as any,
          },
        ];

        const result = applyTextFilters('Hello World!', filters);
        assert.equal(result, 'Hello World!');
      });

      it('should skip disabled mute command', () => {
        const filters: TextFilter[] = [
          {
            id: 1,
            enabled: true,
            target: 'output',
            type: 'pattern',
            pattern: 'Hello',
            replacement: 'Hi',
          },
          {
            id: 2,
            enabled: false,
            target: 'output',
            type: 'command',
            command: 'mute',
            isRegex: true,
            pattern: '^', // would match any text if enabled
          },
          {
            id: 3,
            enabled: true,
            target: 'output',
            type: 'pattern',
            pattern: 'World',
            replacement: 'Universe',
          },
        ];

        const result = applyTextFilters('Hello World!', filters);
        assert.equal(result, 'Hi Universe!');
      });

      it('should apply mute command for field-specific filters', () => {
        const filters: TextFilter[] = [
          {
            id: 1,
            enabled: true,
            target: 'field',
            fieldName: 'body',
            type: 'pattern',
            pattern: 'Hello',
            replacement: 'Hi',
          },
          {
            id: 2,
            enabled: true,
            target: 'field',
            fieldName: 'body',
            type: 'command',
            command: 'mute',
            pattern: 'Hi',
          },
        ];

        const result1 = applyTextFilters('Hello World!', filters, { fieldName: 'body' });
        assert.equal(result1, null);

        const result2 = applyTextFilters('Hello World!', filters, { fieldName: 'name' });
        assert.equal(result2, 'Hello World!');
      });

      it('should handle mute command with text pattern argument', () => {
        const filters: TextFilter[] = [
          {
            id: 1,
            enabled: true,
            target: 'output',
            type: 'command',
            command: 'mute',
            pattern: 'World',
          },
        ];

        const result = applyTextFilters('Hello World!', filters);
        assert.equal(result, null);
      });

      it('should not mute when text pattern does not match', () => {
        const filters: TextFilter[] = [
          {
            id: 1,
            enabled: true,
            target: 'output',
            type: 'command',
            command: 'mute',
            pattern: 'NotFound',
          },
          {
            id: 2,
            enabled: true,
            target: 'output',
            type: 'pattern',
            pattern: 'Hello',
            replacement: 'Hi',
          },
        ];

        const result = applyTextFilters('Hello World!', filters);
        assert.equal(result, 'Hi World!');
      });

      it('should handle mute command with regexp pattern argument', () => {
        const filters: TextFilter[] = [
          {
            id: 1,
            enabled: true,
            target: 'output',
            type: 'command',
            command: 'mute',
            isRegex: true,
            pattern: 'W\\w+d',
          },
        ];

        const result = applyTextFilters('Hello World!', filters);
        assert.equal(result, null);
      });

      it('should not mute when regexp pattern does not match', () => {
        const filters: TextFilter[] = [
          {
            id: 1,
            enabled: true,
            target: 'output',
            type: 'command',
            command: 'mute',
            isRegex: true,
            pattern: '^Goodbye',
          },
          {
            id: 2,
            enabled: true,
            target: 'output',
            type: 'pattern',
            pattern: 'Hello',
            replacement: 'Hi',
          },
        ];

        const result = applyTextFilters('Hello World!', filters);
        assert.equal(result, 'Hi World!');
      });

      describe('case insensitive matching', () => {
        it('should use case insensitive match for replacement', () => {
          const filters: TextFilter[] = [
            {
              id: 1,
              enabled: true,
              target: 'output',
              type: 'pattern',
              isRegex: true,
              pattern: 'W',
              replacement: '笑',
            },
          ];

          const result = applyTextFilters('www', filters);
          assert.equal(result, '笑笑笑');
        });

        it('should use case insensitive match for replacement', () => {
          const filters: TextFilter[] = [
            {
              id: 1,
              enabled: true,
              target: 'output',
              type: 'pattern',
              isRegex: true,
              pattern: '[wｗ]',
              replacement: 'w',
            },
          ];

          const result = applyTextFilters('すごいWＷ', filters);
          assert.equal(result, 'すごいww');
        });

        it('should use case insensitive match for command with text pattern', () => {
          const filters: TextFilter[] = [
            {
              id: 1,
              enabled: true,
              target: 'output',
              type: 'command',
              command: 'mute',
              pattern: 'hello',
            },
          ];

          const result = applyTextFilters('Hello World!', filters);
          assert.equal(result, null);
        });

        it('should use case insensitive match for command with regex', () => {
          const filters: TextFilter[] = [
            {
              id: 1,
              enabled: true,
              target: 'output',
              type: 'command',
              command: 'mute',
              isRegex: true,
              pattern: 'hello',
            },
          ];

          const result = applyTextFilters('Hello World!', filters);
          assert.equal(result, null);
        });
      });

      it('should evaluate mute pattern against text modified by previous filters', () => {
        const filters: TextFilter[] = [
          {
            id: 1,
            enabled: true,
            target: 'output',
            type: 'pattern',
            pattern: 'Hello',
            replacement: 'Goodbye',
          },
          {
            id: 2,
            enabled: true,
            target: 'output',
            type: 'command',
            command: 'mute',
            pattern: 'Goodbye',
          },
        ];

        const result = applyTextFilters('Hello World!', filters);
        assert.equal(result, null);
      });

      it('should mute when text pattern does not match with isNot option for allowlist', () => {
        const filters: TextFilter[] = [
          {
            id: 1,
            enabled: true,
            target: 'output',
            type: 'command',
            command: 'mute',
            pattern: 'Allowlist',
            options: {
              isNot: true,
            },
          },
        ];

        const result = applyTextFilters('Hello World!', filters);
        assert.equal(result, null);
      });

      it('should not mute when text pattern matches with isNot option', () => {
        const filters: TextFilter[] = [
          {
            id: 1,
            enabled: true,
            target: 'output',
            type: 'command',
            command: 'mute',
            pattern: 'Hello',
            options: {
              isNot: true,
            },
          },
          {
            id: 2,
            enabled: true,
            target: 'output',
            type: 'pattern',
            pattern: 'World',
            replacement: 'Universe',
          },
        ];

        const result = applyTextFilters('Hello World!', filters);
        assert.equal(result, 'Hello Universe!');
      });

      it('should mute when regex pattern does not match with isNot option', () => {
        const filters: TextFilter[] = [
          {
            id: 1,
            enabled: true,
            target: 'output',
            type: 'command',
            command: 'mute',
            isRegex: true,
            pattern: 'White.*',
            options: {
              isNot: true,
            },
          },
        ];

        const result = applyTextFilters('Hello World!', filters);
        assert.equal(result, null);
      });

      it('should not mute when regex pattern matches with isNot option', () => {
        const filters: TextFilter[] = [
          {
            id: 1,
            enabled: true,
            target: 'output',
            type: 'command',
            command: 'mute',
            isRegex: true,
            pattern: 'H.llo',
            options: {
              isNot: true,
            },
          },
        ];

        const result = applyTextFilters('Hello World!', filters);
        assert.equal(result, 'Hello World!');
      });
    });

    describe('multiple filters', () => {
      it('should apply filters in sequence', () => {
        const filters: TextFilter[] = [
          {
            id: 1,
            enabled: true,
            target: 'output',
            type: 'pattern',
            pattern: 'Hello',
            replacement: 'Hi',
          },
          {
            id: 2,
            enabled: true,
            target: 'output',
            type: 'pattern',
            pattern: 'World',
            replacement: 'Universe',
          },
        ];

        const result = applyTextFilters('Hello World!', filters);
        assert.equal(result, 'Hi Universe!');
      });

      it('should skip disabled filters in sequence', () => {
        const filters: TextFilter[] = [
          {
            id: 1,
            enabled: true,
            target: 'output',
            type: 'pattern',
            pattern: 'Hello',
            replacement: 'Hi',
          },
          {
            id: 2,
            enabled: false,
            target: 'output',
            type: 'pattern',
            pattern: 'World',
            replacement: 'Universe',
          },
        ];

        const result = applyTextFilters('Hello World!', filters);
        assert.equal(result, 'Hi World!');
      });
    });

    describe('field-specific filters', () => {
      it('should apply filter only to specified field', () => {
        const filters: TextFilter[] = [
          {
            id: 1,
            enabled: true,
            target: 'field',
            fieldName: 'name',
            type: 'pattern',
            pattern: 'User',
            replacement: 'ユーザー',
          },
        ];

        const result1 = applyTextFilters('User123', filters, { fieldName: 'name' });
        assert.equal(result1, 'ユーザー123');

        const result2 = applyTextFilters('User123', filters, { fieldName: 'body' });
        assert.equal(result2, 'User123'); // Should not apply to different field

        const result3 = applyTextFilters('User123', filters);
        assert.equal(result3, 'User123'); // Should not apply without field context
      });

      it('should apply all filters whose conditions are met', () => {
        const filters: TextFilter[] = [
          {
            id: 1,
            enabled: true,
            target: 'field',
            fieldName: 'body',
            type: 'pattern',
            pattern: 'filter',
            replacement: '',
          },
          {
            id: 2,
            enabled: true,
            target: 'output',
            type: 'pattern',
            isRegex: true,
            pattern: '^.',
            replacement: 'A',
          },
          // Not applied because fieldName does not match
          {
            id: 3,
            enabled: true,
            target: 'field',
            fieldName: 'name',
            type: 'pattern',
            isRegex: true,
            pattern: '.',
            replacement: '',
          },
          // Not applied because filter is disabled
          {
            id: 4,
            enabled: false,
            target: 'output',
            type: 'pattern',
            isRegex: true,
            pattern: '.',
            replacement: '',
          },
        ];

        const result = applyTextFilters('Hello filter world!', filters, { fieldName: 'body' });
        assert.equal(result, 'Aello  world!');
      });

      it('should apply output filter regardless of field', () => {
        const filters: TextFilter[] = [
          {
            id: 1,
            enabled: true,
            target: 'output',
            type: 'pattern',
            pattern: 'test',
            replacement: 'テスト',
          },
        ];

        const result1 = applyTextFilters('test message', filters, { fieldName: 'name' });
        assert.equal(result1, 'テスト message');

        const result2 = applyTextFilters('test message', filters);
        assert.equal(result2, 'テスト message');
      });
    });
  });
});
