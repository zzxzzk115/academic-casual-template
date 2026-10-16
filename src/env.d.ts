/// <reference types="astro/client" />
declare module 'bibtex-parse-js' {
  const parser: { toJSON(input: string): Array<{ citationKey: string; entryType: string; entryTags: Record<string, string> }> };
  export default parser;
}
