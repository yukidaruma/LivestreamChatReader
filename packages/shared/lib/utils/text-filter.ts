import type { logger as loggerType } from './logger';
import type { CommandFilter, TextFilter } from '@extension/storage/lib/base/types';

/** @returns Transformed text, or null if the filtering should be terminated */
const executeCommand = (text: string, filter: CommandFilter, logger?: typeof loggerType): string | null => {
  switch (filter.command) {
    case 'end': {
      // If pattern provided, check if pattern matches before ending
      if (filter.pattern) {
        const { pattern, isRegex, flags } = filter;
        let matches = false;

        if (isRegex) {
          try {
            const regex = new RegExp(pattern, flags || '');
            matches = regex.test(text);
          } catch (error) {
            logger?.warn(`Invalid regex in end command: ${pattern}`, error);
            return text; // Invalid regex, continue filtering
          }
        } else {
          matches = text.includes(pattern);
        }

        if (!matches) {
          return text; // Pattern doesn't match, continue filtering
        }
      }
      return null; // End filtering
    }
    default:
      logger?.warn(`Unknown command: ${filter.command}`);
      return text;
  }
};

export const applyTextFilters = (
  text: string,
  filters: TextFilter[],
  { fieldName, logger }: { fieldName?: string; logger?: typeof loggerType } = {},
): string => {
  let result = text;

  for (const filter of filters) {
    if (!filter.enabled) {
      continue;
    }
    if (filter.fieldName && filter.fieldName !== fieldName) {
      continue;
    }

    switch (filter.type) {
      case 'pattern': {
        try {
          if (filter.isRegex) {
            const regex = new RegExp(filter.pattern, filter.flags ?? '');
            result = result.replace(regex, filter.replacement);
          } else {
            result = result.replaceAll(filter.pattern, filter.replacement);
          }
        } catch (error) {
          logger?.warn(`Invalid pattern in filter ${filter.id}:`, error);
        }
        break;
      }
      case 'command': {
        const commandResult = executeCommand(result, filter, logger);
        if (commandResult === null) {
          return '';
        }

        result = commandResult;
        break;
      }
    }
  }

  return result;
};
