import type { logger as loggerType } from './logger';
import type { CommandFilter, TextFilter } from '@extension/storage';

/** @returns Transformed text, or null if the filtering should be terminated */
const executeCommand = (text: string, filter: CommandFilter, logger?: typeof loggerType): string | null => {
  switch (filter.command) {
    case 'mute': {
      if (filter.pattern) {
        try {
          const regex = new RegExp(filter.isRegex ? filter.pattern : RegExp.escape(filter.pattern), 'i');
          if (regex.test(text)) {
            return null;
          }
        } catch (error) {
          logger?.warn(`Invalid pattern in mute command: ${filter.pattern}`, error);
        }
      }

      // When regex error occured or pattern didn't match, continue filtering
      return text;
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
          const regex = new RegExp(filter.isRegex ? filter.pattern : RegExp.escape(filter.pattern), 'ig');
          result = result.replaceAll(regex, filter.replacement);
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
