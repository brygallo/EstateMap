/** Compare API/JWT identifiers without depending on their JSON number/string representation. */
export function sameIdentifier(
  left: string | number | null | undefined,
  right: string | number | null | undefined
): boolean {
  if (left == null || right == null) return false;
  return String(left) === String(right);
}
