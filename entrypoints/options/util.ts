// Valid field names that can be used in speech templates
export const FIELD_NAMES = ['name', 'body'];

export const validateSpeechTemplate = (template: string): string[] | null => {
  const fieldNameMatches = template.match(/%\((\w*)\)/g);

  if (!fieldNameMatches) {
    return null;
  }

  const extractedFieldNames = fieldNameMatches.map(match => match.replace(/%\((\w*)\)/, '$1'));

  const invalidFieldNames = [...new Set(extractedFieldNames)].filter(name => !FIELD_NAMES.includes(name));

  return invalidFieldNames.length > 0 ? invalidFieldNames : null;
};
