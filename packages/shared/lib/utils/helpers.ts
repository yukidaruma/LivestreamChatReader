export const sleep = async (time: number) => new Promise(r => setTimeout(r, time));

export const validateRegex = (pattern: string): string | null => {
  try {
    new RegExp(pattern);
    return null;
  } catch (error) {
    return error instanceof Error ? error.message : 'Invalid regular expression';
  }
};
