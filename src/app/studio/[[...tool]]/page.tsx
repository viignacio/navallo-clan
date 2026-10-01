"use client";

import React, { useEffect } from "react";
import { NextStudio } from "next-sanity/studio";
import config from "../../../../sanity.config";

export default function StudioPage() {
  useEffect(() => {
    // 1. Suppress unhandled SyntaxError thrown by third-party Chrome extensions (e.g. Capture)
    const handleError = (e: ErrorEvent) => {
      if (
        e.message?.includes("is not a valid selector") ||
        e.filename?.includes("chrome-extension://")
      ) {
        e.preventDefault();
        e.stopImmediatePropagation();
      }
    };
    window.addEventListener("error", handleError, true);

    // 2. Proactively sanitize any element whose ID contains unescaped quotes before extension listeners inspect it
    const sanitize = (node: Element) => {
      if (node.id && node.id.includes('"')) {
        node.id = node.id.replace(/"/g, "");
      }
      node.querySelectorAll?.('[id*=\'"\']').forEach((el) => {
        el.id = el.id.replace(/"/g, "");
      });
    };

    const onCapture = (e: Event) => {
      if (e.target instanceof Element) {
        sanitize(e.target);
      }
    };

    window.addEventListener("focusin", onCapture, true);
    window.addEventListener("pointerdown", onCapture, true);
    window.addEventListener("click", onCapture, true);

    const observer = new MutationObserver((mutations) => {
      for (const m of mutations) {
        if (m.type === "childList") {
          m.addedNodes.forEach((n) => {
            if (n instanceof Element) sanitize(n);
          });
        } else if (m.type === "attributes" && m.target instanceof Element) {
          sanitize(m.target);
        }
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["id"],
    });

    return () => {
      window.removeEventListener("error", handleError, true);
      window.removeEventListener("focusin", onCapture, true);
      window.removeEventListener("pointerdown", onCapture, true);
      window.removeEventListener("click", onCapture, true);
      observer.disconnect();
    };
  }, []);

  return <NextStudio config={config} />;
}
