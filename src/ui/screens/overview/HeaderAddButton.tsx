import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlus } from "@fortawesome/free-solid-svg-icons";
import { FONT_MONO } from "../../tokens";
import { soundManager } from "../../../audio/sound-manager";

export function HeaderAddButton({
  onClick,
}: {
  accent?: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={() => { soundManager.playUI("ui_click"); onClick(); }}
      onMouseEnter={() => soundManager.playUI("ui_hover")}
      style={{
        width: 22,
        height: 22,
        background: "rgba(110,200,255,0.06)",
        border: "1px solid rgba(110,200,255,0.30)",
        color: "#9ab4cf",
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
      <FontAwesomeIcon icon={faPlus} style={{ fontSize: 10 }} />
    </button>
  );
}
