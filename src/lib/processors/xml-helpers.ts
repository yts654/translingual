import { XMLParser, XMLBuilder } from "fast-xml-parser";

const parserOptions = {
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  preserveOrder: true,
  cdataPropName: "__cdata",
  commentPropName: "__comment",
  trimValues: false,
  parseTagValue: false,
  processEntities: false,
  htmlEntities: false,
};

const builderOptions = {
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  preserveOrder: true,
  cdataPropName: "__cdata",
  commentPropName: "__comment",
  format: false,
  suppressEmptyNode: false,
  processEntities: false,
  htmlEntities: false,
};

export function parseXml(xml: string): unknown[] {
  const parser = new XMLParser(parserOptions);
  return parser.parse(xml);
}

export function buildXml(obj: unknown[]): string {
  const builder = new XMLBuilder(builderOptions);
  let result: string = builder.build(obj);
  // Preserve XML declaration if present in original
  if (!result.startsWith("<?xml")) {
    result = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n' + result;
  }
  return result;
}

// Deep-walk an ordered-mode tree and call `visitor` on each node matching `tagName`
export function walkNodes(
  nodes: unknown[],
  tagName: string,
  visitor: (node: Record<string, unknown>, parent: unknown[], index: number) => void
): void {
  if (!Array.isArray(nodes)) return;
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i] as Record<string, unknown>;
    if (node[tagName] !== undefined) {
      visitor(node, nodes, i);
    }
    // Recurse into all child arrays
    for (const key of Object.keys(node)) {
      if (key.startsWith("@_") || key.startsWith(":@") || key === "#text") continue;
      const children = node[key];
      if (Array.isArray(children)) {
        walkNodes(children, tagName, visitor);
      }
    }
  }
}

// Extract text content from ordered-mode nodes
export function getTextContent(nodes: unknown[]): string {
  if (!Array.isArray(nodes)) return "";
  let text = "";
  for (const node of nodes) {
    const n = node as Record<string, unknown>;
    if (n["#text"] !== undefined) {
      text += String(n["#text"]);
    }
    for (const key of Object.keys(n)) {
      if (key.startsWith("@_") || key.startsWith(":@") || key === "#text") continue;
      const children = n[key];
      if (Array.isArray(children)) {
        text += getTextContent(children);
      }
    }
  }
  return text;
}
