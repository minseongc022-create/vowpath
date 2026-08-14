import type { ManoServiceCategory } from "./types";

export type ManoCategoryMeta = {
  id: ManoServiceCategory;
  name: string;
  nameShort: string;
  description: string;
  icon: string;
  avgPriceMxn: string;
  popular: boolean;
};

export const MANO_CATEGORIES: ManoCategoryMeta[] = [
  {
    id: "limpieza",
    name: "Limpieza del hogar",
    nameShort: "Limpieza",
    description: "Limpieza profunda, mantenimiento y sanitización.",
    icon: "✨",
    avgPriceMxn: "$350–$800",
    popular: true,
  },
  {
    id: "plomeria",
    name: "Plomería",
    nameShort: "Plomería",
    description: "Fugas, tinacos, calentadores e instalaciones.",
    icon: "🔧",
    avgPriceMxn: "$400–$1,200",
    popular: true,
  },
  {
    id: "electricidad",
    name: "Electricidad",
    nameShort: "Electricidad",
    description: "Contactos, iluminación, apagadores y cableado.",
    icon: "⚡",
    avgPriceMxn: "$350–$1,500",
    popular: true,
  },
  {
    id: "manitas",
    name: "Manitas / Reparaciones",
    nameShort: "Manitas",
    description: "Muebles, puertas, persianas y arreglos generales.",
    icon: "🛠️",
    avgPriceMxn: "$300–$900",
    popular: true,
  },
  {
    id: "pintura",
    name: "Pintura",
    nameShort: "Pintura",
    description: "Interiores, exteriores y acabados.",
    icon: "🎨",
    avgPriceMxn: "$800–$3,500",
    popular: false,
  },
  {
    id: "jardineria",
    name: "Jardinería",
    nameShort: "Jardinería",
    description: "Podas, mantenimiento y diseño de jardines.",
    icon: "🌿",
    avgPriceMxn: "$400–$1,200",
    popular: false,
  },
  {
    id: "mudanzas",
    name: "Mudanzas",
    nameShort: "Mudanzas",
    description: "Traslados locales dentro del área metropolitana.",
    icon: "📦",
    avgPriceMxn: "$1,200–$4,000",
    popular: false,
  },
  {
    id: "aire",
    name: "Aire acondicionado",
    nameShort: "A/C",
    description: "Instalación, mantenimiento y recarga de gas.",
    icon: "❄️",
    avgPriceMxn: "$500–$2,000",
    popular: true,
  },
];

export function getCategory(id: ManoServiceCategory): ManoCategoryMeta {
  const cat = MANO_CATEGORIES.find((c) => c.id === id);
  if (!cat) throw new Error(`Unknown category: ${id}`);
  return cat;
}

export function isManoServiceCategory(value: string): value is ManoServiceCategory {
  return MANO_CATEGORIES.some((c) => c.id === value);
}
