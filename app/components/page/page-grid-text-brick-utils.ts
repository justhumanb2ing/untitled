export function calculatePageGridTextRowSpan(
  element: HTMLElement | null,
  rowHeight: number,
  marginY: number
): number {
  if (!element || rowHeight <= 0) {
    return 1;
  }

  const scrollHeight = element.scrollHeight;
  const computed = window.getComputedStyle(element);
  const lineHeight = Number.parseFloat(computed.lineHeight);
  const paddingTop = Number.parseFloat(computed.paddingTop);
  const paddingBottom = Number.parseFloat(computed.paddingBottom);
  const singleLineHeight = Number.isFinite(lineHeight)
    ? lineHeight + paddingTop + paddingBottom
    : scrollHeight;
  const targetHeight = Math.max(scrollHeight, singleLineHeight);

  if (!Number.isFinite(targetHeight) || targetHeight <= 0) {
    return 1;
  }

  const rawSpan = (targetHeight + marginY) / (rowHeight + marginY);
  return Number(rawSpan.toFixed(2));
}
