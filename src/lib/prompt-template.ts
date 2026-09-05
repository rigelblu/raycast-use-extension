export function fillPromptBody(body: string, args: string[]): string {
  const joinedArgs = args.join(" ");

  /**
   * Note: .source extracts the raw regex pattern string without slashes/flags,
   * allowing us to safely build a complex regex out of smaller, commented pieces.
   *
   * /\\$/.source +                Match a literal '$'
   * /(ARGUMENTS|\\d+)/.source +   Capture group 1: 'ARGUMENTS', or digits
   * /(?![\\w+])/.source,          Negative lookahead: fail if followed by a word character or '+'
   *                               Prevents '$1' matching '$10', or '$ARGUMENTS' matching '$ARGUMENTST'
   * "g"                           Global flag to replace all occurrences
   */
  return body.replace(/\$(ARGUMENTS|\d+)(?![\w+])/g, (token, key: string) => {
    if (key === "ARGUMENTS") return joinedArgs;

    // Placeholders are zero-based: `$0` is the first argument. That is the corpus convention —
    // every installed skill that reads positionals starts at `$0`, and none starts at `$1`.
    const index = Number(key);
    if (index >= args.length) return token;

    return args[index];
  });
}
