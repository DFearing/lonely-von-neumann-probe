import { FONT_MONO } from "../../tokens";

export function HeaderAddButton({
  accent,
  onClick,
}: {
  accent: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        width: 22,
        height: 22,
        background: `${accent}10`,
        border: `1px solid ${accent}60`,
        color: accent,
        fontFamily: FONT_MONO,
        fontSize: 14,
        lineHeight: 1,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
        borderRadius: 2,
        padding: 0,
      }}
    >
      +
    </button>
  );
}
