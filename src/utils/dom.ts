/** 创建带 class 和可选文本的元素，简化 DOM 构建 */
export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className = '',
  text = ''
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text) node.textContent = text;
  return node;
}

/** 创建按钮 */
export function button(label: string, className = ''): HTMLButtonElement {
  const btn = el('button', `btn ${className}`.trim(), label);
  btn.type = 'button';
  return btn;
}
