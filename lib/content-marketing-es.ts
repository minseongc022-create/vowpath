import { SITE } from "./constants";
import { TRIAL_DAYS } from "./billing-cohort";
import { getCheckoutCta } from "./marketing-constants";

const CHECKOUT_CTA = getCheckoutCta();

export const heroEs = {
  badge: "El camino hacia la eficiencia",
  headline: "No pierdas otro trabajo de emergencia.",
  headlineAccent: "Contesta. Despacha. Documenta — las 24 horas.",
  brandLine:
    "Mantén tu línea principal. Cuando entra una llamada y tu cuadrilla está en un trabajo, Effiroad contesta, captura los datos y despacha a tu equipo de guardia — mientras el cliente sigue en línea.",
  subhead:
    "Teléfono con IA 24/7, enlace SMS, triage de emergencias, textos a tu cuadrilla, analítica del taller y Effiroad AI — hecho para empresas independientes de servicios en el hogar.",
  trustLine: "Talleres de 1–15 técnicos · Sin CRM obligatorio",
  primaryCta: CHECKOUT_CTA,
  secondaryCta: "Ver cómo funciona",
  secondaryCtaHref: "/#how-it-works",
  heroBadges: [
    "Contesta tu línea 24/7",
    "Despacha trabajos claros",
    "Texto a tu cuadrilla",
    "Activo en ~10 minutos",
  ] as const,
  heroSubhead: "Servicio de contestación con IA para empresas de servicios en el hogar",
  trialNote: `Prueba gratis — ${TRIAL_DAYS} días por nuestra cuenta →`,
};

export const navEs = {
  features: "Funciones",
  howItWorks: "Cómo funciona",
  pricing: "Precios",
  why: "Por qué Effiroad",
  product: "Funciones",
  about: "Por qué Effiroad",
  scheduling: "Despacho",
  getStarted: "Empezar",
};

export const footerEs = {
  privacy: "Privacidad",
  terms: "Términos",
  refund: "Reembolsos",
  contact: "Contacto",
  tagline: "Teléfono con IA, despacho y asistente operativo para empresas de restauración.",
  brandMeaning: "Llamada perdida → intake con IA → despacho → reclamo capturado. Sin CRM obligatorio.",
  subline: "Agua · fuego · moho en EE. UU. · Mismo número de empresa · Sin CRM obligatorio",
};

export const howItWorksEs = {
  id: "how-it-works",
  title: "Activo esta noche en ~10 minutos",
  subtitle: "Pago → celular para alertas → reglas de desvío → llamada de prueba → pérdida en tu panel.",
  steps: [
    {
      step: "01",
      title: "Tu celular para alertas",
      description: "Los textos informativos y de excepción van a este número. El correo es respaldo.",
    },
    {
      step: "02",
      title: "Cuándo contesta Effiroad",
      description: "Fuera de horario, tormenta o sin respuesta — tus horas, tus reglas.",
    },
    {
      step: "03",
      title: "Desvía la línea principal",
      description: "El cliente marca el mismo número de siempre. Ocupado / sin respuesta → Effiroad.",
    },
    {
      step: "04",
      title: "Llamada de prueba + panel",
      description: "Una llamada de prueba. Agua estándar se despacha sola; fuego o duda espera tu 1 / 2.",
    },
  ],
};

export const approvalLoopEs = {
  id: "approval-loop",
  label: "Despacho inteligente",
  title: "Despacha las pérdidas claras. Te avisa cuando hace falta un humano.",
  summary:
    "La IA genérica solo deja mensaje. Effiroad despacha trabajos de agua estándar con datos completos — pero retiene fuego, Cat-3 y direcciones dudosas para tu 1 / 2 antes de mover a alguien.",
  tags: ["Agua estándar = auto-despacho", "Fuego / Cat-3 → 1 / 2", "Dudoso → 1 / 2", "Responde 9 para deshacer"] as const,
  smsExample: {
    customer: "Sarah Mitchell",
    issue: "Inundación en sótano",
    window: "Esta noche · guardia",
    approveLabel: "Pérdida estándar = auto-despachada",
    declineLabel: "Fuego / Cat-3 / dudoso = Responde 1 · 2",
  },
  nodes: [
    { id: "customer", title: "Cliente reporta pérdida", caption: "Dirección + tipo" },
    { id: "effiroad", title: "Effiroad", caption: "Despachos estándar" },
    { id: "owner", title: "Tu celular", caption: "Pérdida grande / duda → 1 / 2" },
    { id: "customer-out", title: "Cuadrilla en camino", caption: "SMS + Job Card" },
  ] as const,
  edges: [
    "Triage de restauración + intake",
    "Agua clara se despacha rápido",
    "Fuego, moho o datos flojos → tu texto",
  ] as const,
};

export const socialProofEs = {
  title: "Hecho para empresas de restauración independientes — activo en minutos",
  items: [
    { stat: "~10 min", label: "puesta en marcha típica" },
    { stat: "24/7", label: "intake de emergencias" },
    { stat: "3 capas", label: "teléfono · analítica · IA" },
    { stat: "$8,000+", label: "una llamada salvada paga el año" },
  ],
  badges: ["Agua · fuego · moho en EE. UU.", "Mismo número de empresa", "Sin CRM obligatorio"],
  testimonials: [] as Array<{
    quote: string;
    name: string;
    detail: string;
    label?: string;
  }>,
};

export const pricingEs = {
  title: "Una pérdida de agua a las 2 AM paga todo el año",
  subtitle: "Ilimitado para noches pesadas y temporada de tormentas. Flex cuando hay menos volumen.",
  compare: [
    { label: "Teléfono con IA + enlace SMS", amount: "Incluido" },
    { label: "Analítica + Effiroad AI", amount: "Incluido" },
    { label: "SMS al dueño (info + excepciones)", amount: "Incluido" },
    { label: "CRM / Jobber", amount: "Opcional", highlight: true },
  ],
  plans: [
    {
      id: "unlimited" as const,
      name: "Unlimited",
      badge: "Más popular",
      description: "Noches pesadas y temporada de tormentas. Tarifa fija.",
      price: SITE.monthlyPrice,
      period: "/mes",
      usageLine: "Sin cargo por despacho",
      features: [
        "Ventanas de desvío ilimitadas",
        "Auto-despacho + texto a cuadrilla",
        "SMS inteligente al dueño",
        "Conexión CRM opcional",
      ],
      recommended: true,
      cta: `${CHECKOUT_CTA} — Unlimited`,
    },
    {
      id: "flex" as const,
      name: "Flex",
      badge: "Menor volumen",
      description: "Pagas por despacho confirmado. Meses tranquilos cuestan menos.",
      price: SITE.flexBasePrice,
      period: "/mes",
      usageLine: `+ ${SITE.flexPerBooking} por despacho aprobado`,
      features: [
        "Mismo flujo de intake y despacho",
        "Horas de desvío personalizadas",
        "Solo por despacho confirmado",
        "Conexión CRM opcional",
      ],
      recommended: false,
      cta: `${CHECKOUT_CTA} — Flex`,
    },
  ],
  tip: `¿Confirmas 9+ despachos al mes? Unlimited (${SITE.monthlyPrice}) suele convenir más.`,
  footnote: "Sin cargo por spam, números equivocados o trabajos que canceles.",
  guarantees: [
    "Garantía de devolución 30 días",
    "Cancela cuando quieras — sin contrato",
    "Sin costo de instalación",
  ] as const,
};

export const ctaEs = {
  eyebrow: "Tu línea. Tu despacho. Tu asistente.",
  title: "Desvía esta noche. Despierta con pérdidas capturadas.",
  subtitle:
    "Intake con IA 24/7, despacho a cuadrilla y Effiroad AI — una suscripción para dueños que pierden llamadas en el trabajo.",
  button: CHECKOUT_CTA,
};

export const faqEs = {
  title: "Preguntas de dueños",
  items: [
    {
      q: "¿Cambio mi número de teléfono?",
      a: "No. El mismo número en Google y en tus camionetas. Desvías las llamadas sin respuesta por detrás.",
    },
    {
      q: "¿En qué se diferencia de un servicio de contestación?",
      a: "Los contestadores solo toman mensajes. Effiroad captura tipo de pérdida y dirección, despacha agua estándar y te manda 1 / 2 en fuego, Cat-3 o casos dudosos.",
    },
    {
      q: "¿Reemplaza Jobber o Xactimate?",
      a: "No. Effiroad es la capa de llamadas perdidas e intake. Tus herramientas de estimación y CRM siguen. Jobber es opcional.",
    },
    {
      q: "¿Y si la IA se equivoca?",
      a: "¿Dirección o tipo de pérdida poco claro? El despacho espera tu 1 / 2. ¿Ya se despachó? Responde 2 para cancelar o 9 para deshacer. Ajusta reglas en configuración cuando quieras.",
    },
    {
      q: "¿Reserva el trabajo o solo deja mensaje?",
      a: "Lo reserva. En una pérdida de agua estándar clara, Effiroad captura el intake, despacha tu cuadrilla y confirma al cliente — sin devolverte una llamada. Solo espera tu 1 / 2 en fuego, Cat-3, comercial o lo que no pudo verificar.",
    },
    {
      q: "¿Por qué IA y no una persona contestando?",
      a: "Una persona contesta en el tercer timbre, en una buena noche — la IA contesta en el primero, todas las noches, igual de calmada en la décima llamada de tormenta que en la primera. No confunde la dirección a las 3 AM y aplica tus reglas igual cada vez. Tú sigues decidiendo lo importante por texto.",
    },
    {
      q: "¿Es solo un contestador con IA?",
      a: "No. Tienes intake de emergencias, textos a cuadrilla, analítica de llamadas perdidas y Effiroad AI para preguntar qué pasó y cambiar reglas desde el celular.",
    },
    {
      q: "¿Quién contesta de día?",
      a: "Tú — igual que hoy. Effiroad solo toma las llamadas desviadas cuando no contestas o fuera de horario.",
    },
    {
      q: "¿Puede avisar a mi cuadrilla cuando se confirma?",
      a: "Sí — round-robin opcional al confirmar: un técnico a la vez, responde 1=acepto 2=paso. Agrega números en configuración.",
    },
    {
      q: "¿Captura datos de seguro?",
      a: "El intake guarda aseguradora, número de reclamo si lo dan y detalles de la pérdida — listo para tu Job Card y seguimiento con el ajustador.",
    },
    {
      q: "¿Qué tan rápido se activa?",
      a: "Unos 10 minutos: contacto, horas de guardia, desvío, llamada de prueba.",
    },
    {
      q: "¿Para quién es?",
      a: "Restauración independiente en EE. UU. — agua, fuego, moho — talleres de 1 a 15 técnicos que pierden llamadas de emergencia fuera de horario o en el trabajo.",
    },
    {
      q: "¿Qué pasa en tormenta con diez llamadas a la vez?",
      a: "Effiroad atiende llamadas simultáneas — cada cliente pasa intake por separado. Recibes un SMS por pérdida confirmada, no diez textos a las 2 AM. Agua estándar se despacha sola; lo que necesita tu criterio espera tu 1 / 2.",
    },
    {
      q: "¿Hay forma de probar sin riesgo?",
      a: `Sí. Prueba gratis de ${TRIAL_DAYS} días — teléfono, SMS y despacho incluidos, sin tarjeta. Cada plan pagado incluye garantía de 30 días. Cancela cuando quieras — sin contratos.`,
    },
    {
      q: "¿Graban las llamadas? ¿Quién puede escucharlas?",
      a: "Las llamadas se graban por calidad y cumplimiento — útil para documentación con ajustadores. Solo tú y tu equipo acceden desde el panel. Nunca se venden ni comparten.",
    },
  ],
};

export const demoSummaryEs = {
  title: "Lo que acabas de ver — en español claro",
  subtitle:
    "Hecho para talleres independientes de agua, fuego, moho y HVAC — no para centros de llamadas de franquicias.",
  steps: [
    {
      title: "El mismo número",
      body: "Mantén tu línea de Google y camionetas. Desvía sin respuesta a Effiroad — el cliente nunca ve un número nuevo.",
    },
    {
      title: "Voz o enlace SMS",
      body: "El cliente habla con la IA por teléfono o pulsa 2 para un formulario SMS de un minuto. Nombre, dirección y tipo de pérdida — por cualquier vía.",
    },
    {
      title: "Tú sigues al mando",
      body: "Agua clara / sin calefacción puede avisar a tu cuadrilla. Fuego, moho, olor a gas o cualquier duda — tú apruebas por texto primero.",
    },
    {
      title: "Activo en ~10 minutos",
      body: "Regístrate, pon horas de guardia, desvía tu línea, haz una llamada de prueba. Jobber es opcional.",
    },
  ],
};

export const numberChoiceEs = {
  title: "Tu número o el nuestro — igual, sin llamadas perdidas",
  subtitle:
    "Elige lo que ya usas. La red de seguridad es la misma: si se escapa una llamada, la IA la atrapa.",
  footer:
    "Pierdes una llamada y la IA te respalda. Sin respuesta, línea ocupada, fuera de horario o tres teléfonos sonando — el cliente sigue siendo atendido, sus datos quedan capturados y el lead llega a tu panel.",
  options: [
    {
      id: "keep",
      badge: "Opción A",
      title: "Mantén tu propio número",
      description:
        "El cliente marca el mismo número de tus camionetas y Google. Si estás ocupado o nadie contesta en ~20 segundos, la llamada se desvía a Effiroad — tú sigues tomando las llamadas en vivo.",
      points: [
        "Nada cambia para tus clientes",
        "Configuración de un toque con tu carrier, o VoIP / Google Voice",
        "Solo las llamadas sin respuesta van a nosotros",
      ],
    },
    {
      id: "ours",
      badge: "Opción B",
      title: "Usa el número que te damos",
      description:
        "Publica el número dedicado de Effiroad — sin códigos de carrier. En horario de respuesta la IA contesta; fuera de horario suena tu celular para que tomes la llamada. Sin horas = cobertura 24/7.",
      points: [
        "Cero configuración de desvío — solo usa nuestro número",
        "En horario laboral suena directo a ti",
        "Actívalo con un clic",
      ],
    },
  ],
};
