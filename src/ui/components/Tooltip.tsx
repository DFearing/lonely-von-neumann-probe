import { useState, useRef, useCallback, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { FONT_MONO } from "../tokens";

export function Tooltip({
  content,
  children,
}: {
  content: ReactNode;
  children: ReactNode;
}) {
  const [visible, setVisible] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLSpanElement>(null);

  const show = useCallback(() => {
    const el = triggerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setPosition({
      top: rect.top + window.scrollY - 6,
      left: rect.left + rect.width / 2,
    });
    setVisible(true);
  }, []);

  const hide = useCallback(() => {
    setVisible(false);
  }, []);

  return (
    <>
      <span
        ref={triggerRef}
        onMouseEnter={show}
        onMouseLeave={hide}
        style={{ display: "inline" }}
      >
        {children}
      </span>
      {visible &&
        createPortal(
          <div
            style={{
              position: "absolute",
              top: position.top,
              left: position.left,
              transform: "translate(-50%, -100%)",
              background: "rgba(8,16,30,0.95)",
              border: "1px solid rgba(110,200,255,0.15)",
              fontFamily: FONT_MONO,
              fontSize: 12,
              color: "#d6e8f5",
              padding: "6px 10px",
              pointerEvents: "none",
              zIndex: 9999,
              whiteSpace: "nowrap",
            }}
          >
            {content}
          </div>,
          document.body,
        )}
    </>
  );
}
