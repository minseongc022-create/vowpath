/** Colonias populares del área metropolitana de Guadalajara (MVP). */
export const MANO_COLONIAS = [
  "Chapalita",
  "Providencia",
  "Americana",
  "Lafayette",
  "Jardines del Bosque",
  "Monraz",
  "Vallarta Norte",
  "Vallarta Sur",
  "Zapopan Centro",
  "Tlaquepaque Centro",
  "Santa Tere",
  "Oblatos",
  "Miramar",
  "Country Club",
  "Ciudad del Sol",
  "La Calma",
  "Colinas de San Javier",
  "Bugambilias",
  "Las Águilas",
  "Centro Histórico",
] as const;

export type ManoColonia = (typeof MANO_COLONIAS)[number];
