export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs?: Record<string, string>,
  ...children: (string | HTMLElement | Node)[]
): HTMLElementTagNameMap[K] {
  const element = document.createElement(tag);

  if (attrs) {
    for (const [key, value] of Object.entries(attrs)) {
      element.setAttribute(key, value);
    }
  }

  for (const child of children) {
    if (typeof child === "string") {
      element.appendChild(document.createTextNode(child));
    } else {
      element.appendChild(child);
    }
  }

  return element;
}

export function text(content: string): Text {
  return document.createTextNode(content);
}

export function clear(element: HTMLElement): void {
  while (element.firstChild) {
    element.removeChild(element.firstChild);
  }
}

export function addClass(element: HTMLElement, ...classes: string[]): void {
  element.classList.add(...classes);
}

export function removeClass(element: HTMLElement, ...classes: string[]): void {
  element.classList.remove(...classes);
}

export function toggleClass(
  element: HTMLElement,
  className: string,
  force?: boolean,
): void {
  element.classList.toggle(className, force);
}
