export type ManoServiceCategory =
  | "limpieza"
  | "plomeria"
  | "electricidad"
  | "manitas"
  | "pintura"
  | "jardineria"
  | "mudanzas"
  | "aire";

export type ManoRequestStatus =
  | "abierta"
  | "con_ofertas"
  | "asignada"
  | "en_progreso"
  | "completada"
  | "cancelada";

export type ManoQuoteStatus = "pendiente" | "aceptada" | "rechazada" | "expirada";

export type ManoProvider = {
  id: string;
  name: string;
  phone: string;
  whatsapp?: string;
  email?: string;
  categories: ManoServiceCategory[];
  colonias: string[];
  bio: string;
  yearsExperience: number;
  rating: number;
  reviewCount: number;
  jobsCompleted: number;
  verified: boolean;
  photoUrl?: string;
  createdAt: string;
};

export type ManoServiceRequest = {
  id: string;
  category: ManoServiceCategory;
  title: string;
  description: string;
  colonia: string;
  addressHint?: string;
  budgetMin?: number;
  budgetMax?: number;
  urgency: "hoy" | "esta_semana" | "flexible";
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  status: ManoRequestStatus;
  preferredDate?: string;
  createdAt: string;
  updatedAt: string;
  assignedProviderId?: string;
};

export type ManoQuote = {
  id: string;
  requestId: string;
  providerId: string;
  amountMxn: number;
  message: string;
  estimatedHours?: number;
  status: ManoQuoteStatus;
  createdAt: string;
};

export type ManoReview = {
  id: string;
  requestId: string;
  providerId: string;
  rating: number;
  comment: string;
  customerName: string;
  createdAt: string;
};

export type ManoStore = {
  providers: ManoProvider[];
  requests: ManoServiceRequest[];
  quotes: ManoQuote[];
  reviews: ManoReview[];
};
