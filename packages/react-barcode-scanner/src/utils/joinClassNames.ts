export function joinClassNames(...parts: Array<string | undefined>): string {
  return parts.filter((part) => part).join(" ");
}
