import { getTextLengthRatio } from "../utils/text-length";
import { walkNodes } from "./xml-helpers";

// Adjust PPTX text boxes after translation
export function adjustPptxTextBoxes(
  xmlObj: unknown[],
  originalTexts: Map<string, string>,
  translatedTexts: Map<string, string>
): void {
  // Find all shape trees
  walkNodes(xmlObj, "p:sp", (spNode) => {
    const spChildren = (spNode as Record<string, unknown>)["p:sp"];
    if (!Array.isArray(spChildren)) return;

    // Collect all text in this shape
    let shapeOrigText = "";
    let shapeTransText = "";

    walkNodes(spChildren, "a:t", (tNode) => {
      const tChildren = (tNode as Record<string, unknown>)["a:t"];
      if (Array.isArray(tChildren)) {
        for (const child of tChildren) {
          const c = child as Record<string, unknown>;
          if (c["#text"] !== undefined) {
            const orig = String(c["#text"]);
            shapeOrigText += orig;
            // Check if this text was translated
            for (const [key, val] of translatedTexts.entries()) {
              if (originalTexts.get(key) === orig) {
                shapeTransText += val;
                break;
              }
            }
            if (shapeTransText.length === 0) {
              shapeTransText += orig;
            }
          }
        }
      }
    });

    if (shapeOrigText.length === 0 || shapeTransText.length === 0) return;

    const ratio = getTextLengthRatio(shapeOrigText, shapeTransText);
    if (ratio <= 1.1) return; // No adjustment needed

    // Find bodyPr and adjust autofit
    walkNodes(spChildren, "a:bodyPr", (bodyPrNode) => {
      const bodyPrChildren = (bodyPrNode as Record<string, unknown>)["a:bodyPr"];
      if (!Array.isArray(bodyPrChildren)) return;

      let autofitType: "norm" | "spAutoFit" | "none" = "none";

      for (const child of bodyPrChildren) {
        const c = child as Record<string, unknown>;
        if (c["a:normAutofit"] !== undefined) autofitType = "norm";
        if (c["a:spAutoFit"] !== undefined) autofitType = "spAutoFit";
      }

      if (autofitType === "norm") {
        // Set fontScale to shrink text
        for (const child of bodyPrChildren) {
          const c = child as Record<string, unknown>;
          if (c["a:normAutofit"] !== undefined) {
            const scale = Math.max(40000, Math.floor(100000 / ratio));
            if (!c[":@"]) c[":@"] = {};
            (c[":@"] as Record<string, string>)["@_fontScale"] = String(scale);
          }
        }
      } else if (autofitType === "spAutoFit") {
        // Expand the shape height
        adjustShapeHeight(spChildren, ratio);
      } else {
        // noAutofit: reduce font sizes
        reduceFontSizes(spChildren, ratio);
      }
    });
  });
}

function adjustShapeHeight(spChildren: unknown[], ratio: number): void {
  walkNodes(spChildren, "a:ext", (extNode) => {
    const attrs = (extNode as Record<string, unknown>)[":@"] as Record<string, string> | undefined;
    if (attrs && attrs["@_cy"]) {
      const currentHeight = parseInt(attrs["@_cy"], 10);
      if (!isNaN(currentHeight)) {
        attrs["@_cy"] = String(Math.floor(currentHeight * Math.min(ratio, 2.0)));
      }
    }
  });
}

function reduceFontSizes(spChildren: unknown[], ratio: number): void {
  const scaleFactor = Math.max(0.5, 1 / ratio);

  walkNodes(spChildren, "a:rPr", (rPrNode) => {
    const attrs = (rPrNode as Record<string, unknown>)[":@"] as Record<string, string> | undefined;
    if (attrs && attrs["@_sz"]) {
      const currentSize = parseInt(attrs["@_sz"], 10);
      if (!isNaN(currentSize)) {
        attrs["@_sz"] = String(Math.floor(currentSize * scaleFactor));
      }
    }
  });

  // Also check default text properties
  walkNodes(spChildren, "a:defRPr", (defRPrNode) => {
    const attrs = (defRPrNode as Record<string, unknown>)[":@"] as Record<string, string> | undefined;
    if (attrs && attrs["@_sz"]) {
      const currentSize = parseInt(attrs["@_sz"], 10);
      if (!isNaN(currentSize)) {
        attrs["@_sz"] = String(Math.floor(currentSize * scaleFactor));
      }
    }
  });
}
