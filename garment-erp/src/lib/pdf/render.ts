import { renderToBuffer } from "@react-pdf/renderer";
import React from "react";

const REACT_ELEMENT = Symbol.for("react.element");
const REACT_TRANSITIONAL = Symbol.for("react.transitional.element");

/**
 * Next.js 15 uses React 19 RC in its server/RSC runtime, which stamps React elements
 * with `Symbol.for("react.transitional.element")`.
 *
 * However, @react-pdf/renderer reconciler expects React 18's `Symbol.for("react.element")`.
 * When an element with `react.transitional.element` is passed to @react-pdf/renderer,
 * the reconciler does not recognize it and throws:
 * "Error: Minified React error #31; object with keys {$$typeof, type, key, props, _owner, _store}"
 *
 * This function resolves any function component element (e.g. <IncentiveStatementPdf />)
 * to its primitive react-pdf element tree (<Document>, <Page>, <View>, <Text>), and
 * recursively normalizes `$$typeof` to `Symbol.for("react.element")`.
 */
export function normalizeReactPdfTree(node: any): any {
  if (!node || typeof node !== "object") {
    return node;
  }

  if (Array.isArray(node)) {
    return node.map(normalizeReactPdfTree);
  }

  // Resolve custom function components down to primitive trees
  let current = node;
  while (current && typeof current === "object" && typeof current.type === "function") {
    current = current.type(current.props);
  }

  if (!current || typeof current !== "object") {
    return current;
  }

  if (Array.isArray(current)) {
    return current.map(normalizeReactPdfTree);
  }

  const normalized: any = { ...current };

  // Rewrite transitional element symbol to standard react.element symbol
  if (normalized.$$typeof === REACT_TRANSITIONAL) {
    normalized.$$typeof = REACT_ELEMENT;
  }

  if (normalized.props) {
    const nextProps: any = { ...normalized.props };
    if (nextProps.children !== undefined) {
      if (Array.isArray(nextProps.children)) {
        nextProps.children = nextProps.children.map(normalizeReactPdfTree);
      } else {
        nextProps.children = normalizeReactPdfTree(nextProps.children);
      }
    }
    normalized.props = nextProps;
  }

  return normalized;
}

/**
 * Render a React PDF component/tree to a Buffer safely under Next.js 15 / React 19.
 */
export async function renderPdfToBuffer(element: React.ReactElement): Promise<Buffer> {
  const normalized = normalizeReactPdfTree(element);
  return (await renderToBuffer(normalized)) as Buffer;
}
