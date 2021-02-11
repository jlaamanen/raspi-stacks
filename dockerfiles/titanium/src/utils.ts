export function base64encode(text: string) {
  return Buffer.from(text).toString("base64");
}
