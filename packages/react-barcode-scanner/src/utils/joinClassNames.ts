export function joinClassNames(...parts: Array<string | false | undefined>): string {
  return parts.filter((part) => part).join(" ");
}
