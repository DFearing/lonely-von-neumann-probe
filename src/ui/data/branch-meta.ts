import {
  faAtom, faBolt, faIndustry, faMicrochip, faRocket, faSatellite, faTowerBroadcast,
} from "@fortawesome/free-solid-svg-icons";
import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";

export const BRANCH_META: Record<string, { label: string; color: string; icon: IconDefinition }> = {
  mining_efficiency: { label: "Mining · Output", color: "#4fc7b8", icon: faAtom },
  mining_types: { label: "Mining · Structures", color: "#3eafa2", icon: faAtom },
  energy_production: { label: "Energy · Output", color: "#5d8aff", icon: faBolt },
  energy_types: { label: "Energy · Structures", color: "#4a72dd", icon: faBolt },
  manufacturing_efficiency: { label: "Printing · Output", color: "#6cb8e8", icon: faIndustry },
  manufacturing_types: { label: "Printing · Structures", color: "#58a0cc", icon: faIndustry },
  station_efficiency: { label: "Stations · Output", color: "#8a85f0", icon: faSatellite },
  station_types: { label: "Stations · Structures", color: "#726cd0", icon: faSatellite },
  probe_propulsion: { label: "Probes · Propulsion", color: "#9674e0", icon: faRocket },
  probe_reactors: { label: "Probes · Reactor", color: "#8060c8", icon: faAtom },
  computing_speed: { label: "Computing · Efficiency", color: "#d488ec", icon: faMicrochip },
  computing_architecture: { label: "Computing · Architecture", color: "#b870cc", icon: faMicrochip },
  communication: { label: "Communication · Range", color: "#ee8cb8", icon: faTowerBroadcast },
  communication_speed: { label: "Communication · Speed", color: "#d078a2", icon: faTowerBroadcast },
};
