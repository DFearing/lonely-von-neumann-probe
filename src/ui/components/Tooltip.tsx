import { useState, useRef, useCallback, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { FONT_MONO } from "../tokens";

const ARROW_SIZE = 5;

export function Tooltip({
  content,
  children,
  block,
  placement = "above",
}: {
  content: ReactNode;
  children: ReactNode;
  block?: boolean;
  placement?: "above" | "below" | "right";
}) {
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);
  const triggerRef = useRef<HTMLSpanElement>(null);

  const show = useCallback(() => {
    const el = triggerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    if (placement === "right") {
      setPosition({
        top: rect.top + window.scrollY + rect.height / 2,
        left: rect.right + ARROW_SIZE + 2,
      });
    } else if (placement === "below") {
      setPosition({
        top: rect.bottom + window.scrollY + ARROW_SIZE + 2,
        left: rect.left + rect.width / 2,
      });
    } else {
      setPosition({
        top: rect.top + window.scrollY - ARROW_SIZE - 2,
        left: rect.left + rect.width / 2,
      });
    }
  }, [placement]);

  const hide = useCallback(() => {
    setPosition(null);
  }, []);

  const transform =
    placement === "right"
      ? "translate(0, -50%)"
      : placement === "below"
        ? "translate(-50%, 0)"
        : "translate(-50%, -100%)";

  const arrowStyle: React.CSSProperties =
    placement === "right"
      ? {
          top: "50%",
          right: "100%",
          transform: "translateY(-50%)",
          borderTop: `${ARROW_SIZE}px solid transparent`,
          borderBottom: `${ARROW_SIZE}px solid transparent`,
          borderRight: `${ARROW_SIZE}px solid rgba(8,16,30,0.95)`,
        }
      : placement === "below"
        ? {
            left: "50%",
            bottom: "100%",
            transform: "translateX(-50%)",
            borderLeft: `${ARROW_SIZE}px solid transparent`,
            borderRight: `${ARROW_SIZE}px solid transparent`,
            borderBottom: `${ARROW_SIZE}px solid rgba(8,16,30,0.95)`,
          }
        : {
            left: "50%",
            top: "100%",
            transform: "translateX(-50%)",
            borderLeft: `${ARROW_SIZE}px solid transparent`,
            borderRight: `${ARROW_SIZE}px solid transparent`,
            borderTop: `${ARROW_SIZE}px solid rgba(8,16,30,0.95)`,
          };

  return (
    <>
      <span
        ref={triggerRef}
        onMouseEnter={show}
        onMouseLeave={hide}
        style={{ display: block ? "flex" : "inline-flex" }}
      >
        {children}
      </span>
      {position !== null &&
        createPortal(
          <div
            className="tooltip-popup"
            style={{
              position: "absolute",
              top: position.top,
              left: position.left,
              transform,
              background: "rgba(8,16,30,0.95)",
              border: "1px solid rgba(110,200,255,0.15)",
              borderRadius: 4,
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
            <div style={{ position: "absolute", ...arrowStyle }} />
          </div>,
          document.body,
        )}
    </>
  );
}
