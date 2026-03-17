export function oscSetBackground(r: number, g: number, b: number): string {
  const hex = (n: number) => n.toString(16).padStart(2, "0");
  return `\x1b]11;rgb:${hex(r)}/${hex(g)}/${hex(b)}\x07`;
}

export function oscResetBackground(): string {
  return "\x1b]111\x07";
}
