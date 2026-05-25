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
  placement?: "above" | "below";
}) {
  const [visible, setVisible] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLSpanElement>(null);

  const show = useCallback(() => {
    const el = triggerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    if (placement === "below") {
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
    setVisible(true);
  }, [placement]);

  const hide = useCallback(() => {
    setVisible(false);
  }, []);

  const isBelow = placement === "below";

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
      {visible &&
        createPortal(
          <div
            className="tooltip-popup"
            style={{
              position: "absolute",
              top: position.top,
              left: position.left,
              transform: isBelow ? "translate(-50%, 0)" : "translate(-50%, -100%)",
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
              animation: "tooltip-fade-in 0.15s ease-out",
            }}
          >
            {content}
            <div
              style={{
                position: "absolute",
                left: "50%",
                ...(isBelow
                  ? {
                      bottom: "100%",
                      transform: "translateX(-50%)",
                      borderLeft: `${ARROW_SIZE}px solid transparent`,
                      borderRight: `${ARROW_SIZE}px solid transparent`,
                      borderBottom: `${ARROW_SIZE}px solid rgba(8,16,30,0.95)`,
                    }
                  : {
                      top: "100%",
                      transform: "translateX(-50%)",
                      borderLeft: `${ARROW_SIZE}px solid transparent`,
                      borderRight: `${ARROW_SIZE}px solid transparent`,
                      borderTop: `${ARROW_SIZE}px solid rgba(8,16,30,0.95)`,
                    }),
              }}
            />
          </div>,
          document.body,
        )}
    </>
  );
}
