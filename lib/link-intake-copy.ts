import { afterHoursVoiceIntro } from "./after-hours-intake";
import { resolveShopDisplayName } from "./shop-display-name";
import { smsLinkIntakeBody } from "./sms-templates";

export function channelChoiceVoicePrompt(shopName: string, afterHours = false): string {
  const shop = resolveShopDisplayName(shopName);
  if (afterHours) {
    return (
      `Hi — thank you for calling ${shop}. ` +
      afterHoursVoiceIntro(shop) +
      ` Press 1 and we'll text you a quick link to report the loss — about a minute. ` +
      `Press 2 to tell us what's going on right on this call. We're here to help.`
    );
  }
  return (
    `Hi — thanks for calling ${shop}. ` +
    `Press 1 and we'll text you a quick link to report what's going on. ` +
    `Press 2 to walk us through it on this call. Whatever's easier — we've got you.`
  );
}

export function channelChoiceGatherHint(): string {
  return "Press 1 for the text link, or press 2 to talk with us right here.";
}

export function smsLinkIntakeMessage(shopName: string, url: string): string {
  return smsLinkIntakeBody(shopName, url);
}

/** Customer-facing portal & link intake — US restoration tone. */
export const linkIntakePageCopy = {
  formTitle: "Tell us what's going on",
  formStepLabel: "Step 1 of 2 — Your details",
  formTrustBanner: "About 1 minute · We'll text you updates on this request only",
  formNextSteps:
    "Next: pick an arrival window if one's open, then we'll confirm by text.",
  formDescription:
    "You're in the right place. A few quick details help us send the right crew.",
  nameLabel: "Your name",
  namePlaceholder: "Sarah Mitchell",
  addressLabel: "Property address",
  addressPlaceholder: "Start typing — street number, city, or ZIP",
  addressHintSearch:
    "Start typing — your address should pop right up. Street number, street name, city, or ZIP all work.",
  addressHintManual:
    "Type your full US property address — we'll make sure the right crew is dispatched.",
  addressLoading: "Looking up addresses…",
  addressSearchReady: "Keep typing — matches show up as you go. Tap one to confirm!",
  addressSearchError:
    "Search is slow right now — keep typing or switch to Type it in.",
  addressSearchRetry: "Try again",
  addressTabSearch: "Find my address",
  addressTabManual: "Type it in",
  addressUnitLabel: "Apt / unit / gate code (optional)",
  addressUnitPlaceholder: "Apt 4B, Unit 12, gate 1234…",
  addressConfirmedLabel: "Address confirmed",
  addressPickRequired:
    "Pick your address from the list, or switch to Type it in and fill in street, city, state, and ZIP.",
  addressManualStreet: "Street address",
  addressManualCity: "City",
  addressManualState: "ST",
  addressManualZip: "ZIP code",
  addressManualApply: "Confirm address",
  addressManualIncomplete: "Fill in street, city, state, and ZIP.",
  addressManualInvalid: "That doesn't look like a full US address yet — check city, state, and ZIP.",
  issueLabel: "What's going on?",
  issuePlaceholder:
    "Basement flooding from burst pipe\nWater through ceiling\nSmoke smell after fire\nMold in bathroom\nSewage backup",
  insuranceSectionLabel: "Insurance (optional)",
  insuranceSectionHint: "Helps our crew and your adjuster — skip if you don't have it yet.",
  insuranceSectionToggle: "Add insurance details",
  insuranceCarrierLabel: "Insurance company",
  insuranceCarrierPlaceholder: "State Farm, Allstate…",
  insuranceClaimLabel: "Claim number",
  insuranceClaimPlaceholder: "If you already filed",
  waterSourceLabel: "Water source",
  waterSourcePlaceholder: "Burst pipe, appliance leak, roof…",
  activeLossLabel: "Damage is still spreading / active right now",
  photoLabel: "Photo of the damage",
  photoOptional: "Optional — helps our crew prepare",
  photoHint: "A quick photo helps our crew bring the right equipment.",
  photoButton: "Add a photo",
  photoChange: "Change photo",
  urgencyLabel: "How urgent is this?",
  slotStepTitle: "Step 2 of 2 — Pick a time",
  slotStepDescription:
    "Choose the soonest window that works. Emergencies get the earliest crew available.",
  slotCalendarHint: (intervalMin: number, _bufferMin: number, capacity: number) => {
    const hours = Math.floor(intervalMin / 60);
    const mins = intervalMin % 60;
    const spacing =
      mins > 0
        ? `${hours > 0 ? `${hours} hr ` : ""}${mins} min blocks`
        : `${hours}-hour arrival windows`;
    const base = `Times show ${spacing} — crew arrival windows.`;
    const team =
      capacity > 1
        ? " More than one crew may be available — pick what works best."
        : "";
    return `${base}${team}`.trim();
  },
  slotDayLabel: (weekday: string) => `${weekday} — open windows`,
  slotUnavailable: "Full",
  slotPast: "Too soon",
  slotCalendarLegend:
    "Strikethrough windows are full. Gray means that time passed or is too soon. Your info stays private.",
  slotStepBack: "Go back",
  slotStepConfirm: "Confirm this window",
  slotStepLoading: "Loading open windows…",
  slotStepEmpty:
    "No open windows right now — submit your request and we'll call you to coordinate arrival.",
  slotStepSkip: "Skip — just send my request",
  submit: "Continue — pick arrival time",
  submitNoSlots: "Send my request",
  smsConsentLabel:
    "Required — text me about THIS request only (updates, crew ETA, arrival). Msg & data rates may apply. Reply STOP anytime.",
  smsMarketingConsentLabel:
    "Optional — also send offers, maintenance reminders, and review requests by text. Msg & data rates may apply. Reply STOP anytime.",
  smsConsentRequired: "Check the required box so we can text you about your request.",
  privacyNoticePrefix: "By submitting you agree to our",
  privacyLinkLabel: "Privacy Policy",
  termsLinkLabel: "Terms",
  validateNameRequired: "What's your name? We'd love to know who we're helping today.",
  validateIssueRequired:
    "Tell us a little about what's going on — even one sentence helps us send the right tech!",
  selectVisitTime: "Pick an arrival window and we'll take it from there.",
  networkError: "Connection issue — please try again.",
  slotLoadFailed: "Couldn't load open windows — please try again.",
  submitting: "Sending your request…",
  eta: "~1 min",
  successTitle: "You're all set",
  successBody:
    "We have your details. We'll text you soon with confirmation. Tap Edit if anything changes.",
  requestNumberLabel: "Request #",
  submissionTitle: "Your loss report",
  submissionSummaryTitle: "Quick summary",
  portalGateTitle: "Find your request",
  portalGateDescription: "Enter the name and phone number you used — we'll pull up your request.",
  portalPhoneLabel: "Mobile number",
  portalPhonePlaceholder: "(512) 555-0100",
  portalLookup: "Show my request",
  portalLooking: "Looking…",
  portalLookupFailed: "We couldn't find a match — double-check your name and number.",
  portalBackToLookup: "Try again",
  portalEditTitle: "Update your details",
  portalEdit: "Edit",
  portalSave: "Save changes",
  portalSaving: "Saving…",
  portalUpdateSuccessBody: "Got it — your updates are in. Our team will follow up if needed.",
  portalSubmittedAt: "Submitted",
  loadingSubmission: "Loading your request…",
  loadSubmissionFailed: "Couldn't load this link. Try again or call the company directly.",
  expiredTitle: "This link expired",
  expiredBody: "This link isn't active anymore. Call the company and we'll get you taken care of.",
  unavailableTitle: "One moment…",
  unavailableBody:
    "We couldn't load your link right now. Wait a few seconds and tap the text message link again. Still stuck? Call the company and we'll help.",
  serviceInactiveTitle: "This link is temporarily unavailable",
  serviceInactiveBody:
    "Please call the business directly — their answering service isn't active right now.",
  correctionViewTitle: "Review your request",
  correctionViewHint: "Make sure everything looks good — tap Edit if anything needs a change.",
  correctionEditTitle: "Edit your request",
  correctionDoneTitle: "Update sent",
  correctionDoneBody: "The company got your changes and will follow up during business hours.",
  correctionExpired: "This link expired or isn't valid anymore.",
  bookingPortalTitle: "Your service request",
  bookingStatusLabel: "Status",
  bookingTimeLabel: "Arrival window",
  bookingTimeHint: "Our crew will aim for this window. We'll text you to confirm.",
  bookingChangeTime: "Change arrival window",
  bookingEditDetails: "Update address or loss details",
  bookingCancel: "Cancel request",
  bookingRescheduleHint: "Pick a new open window below.",
  bookingConfirmTime: "Confirm new window",
  bookingCancelConfirmTitle: "Cancel this request?",
  bookingCancelConfirmBody: "We'll let the company know. You can always call back if you still need help.",
  bookingCancelConfirmButton: "Yes, cancel my request",
  portalBackToView: "Back",
  portalLandingTitle: "Report a loss",
  portalLandingBody:
    "Open the link from your text message to submit details or check your request status.",
} as const;

/** Widen the `as const` literal string types to plain `string` so a
 *  translated pack can be assigned, while keeping the function-valued keys. */
type WidenStrings<T> = { [K in keyof T]: T[K] extends string ? string : T[K] };
export type LinkIntakeCopy = WidenStrings<typeof linkIntakePageCopy>;

/** Spanish (es-US) customer-facing intake copy — same shape as the English pack.
 *  Shown only when the customer's browser is Spanish (or they pick Español), so
 *  language is never mismatched. */
export const linkIntakePageCopyEs: LinkIntakeCopy = {
  formTitle: "Cuéntenos qué pasa",
  formStepLabel: "Paso 1 de 2 — Sus datos",
  formTrustBanner: "Un minuto · Le avisamos por texto solo sobre esta solicitud",
  formNextSteps:
    "Siguiente: elija horario de llegada si hay disponibilidad; luego confirmamos por texto.",
  formDescription:
    "Está en el lugar correcto. Unos datos rápidos nos ayudan a enviar al equipo adecuado.",
  nameLabel: "Su nombre",
  namePlaceholder: "Sara Martínez",
  addressLabel: "Dirección de la propiedad",
  addressPlaceholder: "Empiece a escribir — número, ciudad o código postal",
  addressHintSearch:
    "Empiece a escribir — su dirección aparecerá. Número, calle, ciudad o código postal funcionan.",
  addressHintManual:
    "Escriba su dirección completa en EE. UU. — así enviamos al equipo correcto.",
  addressLoading: "Buscando direcciones…",
  addressSearchReady: "Siga escribiendo — las coincidencias aparecen. ¡Toque una para confirmar!",
  addressSearchError: "La búsqueda está lenta — siga escribiendo o use Escribirla.",
  addressSearchRetry: "Intentar de nuevo",
  addressTabSearch: "Buscar mi dirección",
  addressTabManual: "Escribirla",
  addressUnitLabel: "Apto / unidad / código de puerta (opcional)",
  addressUnitPlaceholder: "Apto 4B, Unidad 12, puerta 1234…",
  addressConfirmedLabel: "Dirección confirmada",
  addressPickRequired:
    "Elija su dirección de la lista, o use Escribirla y complete calle, ciudad, estado y código postal.",
  addressManualStreet: "Dirección (calle y número)",
  addressManualCity: "Ciudad",
  addressManualState: "Est.",
  addressManualZip: "Código postal",
  addressManualApply: "Confirmar dirección",
  addressManualIncomplete: "Complete calle, ciudad, estado y código postal.",
  addressManualInvalid: "Aún no parece una dirección completa — revise ciudad, estado y código postal.",
  issueLabel: "¿Qué está pasando?",
  issuePlaceholder:
    "Inundación en el sótano por tubería rota\nAgua filtrándose por el techo\nOlor a humo tras un incendio\nMoho en el baño\nRetorno de aguas negras",
  insuranceSectionLabel: "Seguro (opcional)",
  insuranceSectionHint: "Ayuda a nuestro equipo y a su ajustador — omítalo si aún no lo tiene.",
  insuranceSectionToggle: "Agregar datos del seguro",
  insuranceCarrierLabel: "Compañía de seguro",
  insuranceCarrierPlaceholder: "State Farm, Allstate…",
  insuranceClaimLabel: "Número de reclamo",
  insuranceClaimPlaceholder: "Si ya lo presentó",
  waterSourceLabel: "Origen del agua",
  waterSourcePlaceholder: "Tubería rota, fuga de electrodoméstico, techo…",
  activeLossLabel: "El daño sigue extendiéndose / activo ahora mismo",
  photoLabel: "Foto del daño",
  photoOptional: "Opcional — ayuda a preparar al equipo",
  photoHint: "Una foto rápida ayuda al equipo a llevar el equipo adecuado.",
  photoButton: "Agregar una foto",
  photoChange: "Cambiar foto",
  urgencyLabel: "¿Qué tan urgente es?",
  slotStepTitle: "Paso 2 de 2 — Elija horario",
  slotStepDescription:
    "Elija el horario más pronto que le sirva — en emergencias priorizamos el equipo disponible más cercano.",
  slotCalendarHint: (intervalMin: number, _bufferMin: number, capacity: number) => {
    const hours = Math.floor(intervalMin / 60);
    const mins = intervalMin % 60;
    const spacing =
      mins > 0
        ? `bloques de ${hours > 0 ? `${hours} h ` : ""}${mins} min`
        : `ventanas de llegada de ${hours} hora${hours === 1 ? "" : "s"}`;
    const base = `Los horarios muestran ${spacing} — ventanas de llegada del equipo.`;
    const team =
      capacity > 1 ? " Puede haber más de un equipo disponible — elija el que mejor le sirva." : "";
    return `${base}${team}`.trim();
  },
  slotDayLabel: (weekday: string) => `${weekday} — horarios disponibles`,
  slotUnavailable: "Lleno",
  slotPast: "Muy pronto",
  slotCalendarLegend:
    "Los horarios tachados están llenos. Gris significa que ya pasó o es demasiado pronto. Su información es privada.",
  slotStepBack: "Volver",
  slotStepConfirm: "Confirmar este horario",
  slotStepLoading: "Cargando horarios disponibles…",
  slotStepEmpty:
    "No hay horarios disponibles ahora — envíe su solicitud y le llamaremos para coordinar la llegada.",
  slotStepSkip: "Omitir — solo enviar mi solicitud",
  submit: "Siguiente — elegir horario de llegada",
  submitNoSlots: "Enviar mi solicitud",
  smsConsentLabel:
    "Obligatorio — envíenme mensajes solo sobre ESTA solicitud (actualizaciones, hora de llegada). Pueden aplicar tarifas. Responda STOP en cualquier momento.",
  smsMarketingConsentLabel:
    "Opcional — también envíen ofertas, recordatorios de mantenimiento y solicitudes de reseña por mensaje. Pueden aplicar tarifas. Responda STOP.",
  smsConsentRequired: "Marque la casilla obligatoria para poder enviarle mensajes sobre su solicitud.",
  privacyNoticePrefix: "Al enviar, acepta nuestra",
  privacyLinkLabel: "Política de privacidad",
  termsLinkLabel: "Términos",
  validateNameRequired: "¿Cuál es su nombre? Nos encantaría saber a quién ayudamos hoy.",
  validateIssueRequired:
    "Cuéntenos un poco lo que ocurre — incluso una frase nos ayuda a enviar al técnico correcto.",
  selectVisitTime: "Elija un horario de llegada y nosotros nos encargamos del resto.",
  networkError: "Problema de conexión — intente de nuevo.",
  slotLoadFailed: "No se pudieron cargar los horarios — intente de nuevo.",
  submitting: "Enviando su solicitud…",
  eta: "~1 min",
  successTitle: "¡Todo listo!",
  successBody:
    "Gracias — tenemos sus datos. Confirmaremos la llegada por mensaje pronto. Toque Editar si algo debe cambiar.",
  requestNumberLabel: "Solicitud #",
  submissionTitle: "Su reporte de daño",
  submissionSummaryTitle: "Resumen rápido",
  portalGateTitle: "Encuentre su solicitud",
  portalGateDescription: "Ingrese el nombre y teléfono que usó — buscaremos su solicitud.",
  portalPhoneLabel: "Número de celular",
  portalPhonePlaceholder: "(512) 555-0100",
  portalLookup: "Ver mi solicitud",
  portalLooking: "Buscando…",
  portalLookupFailed: "No encontramos coincidencia — verifique su nombre y número.",
  portalBackToLookup: "Intentar de nuevo",
  portalEditTitle: "Actualice sus datos",
  portalEdit: "Editar",
  portalSave: "Guardar cambios",
  portalSaving: "Guardando…",
  portalUpdateSuccessBody: "Listo — recibimos sus cambios. Nuestro equipo dará seguimiento si es necesario.",
  portalSubmittedAt: "Enviado",
  loadingSubmission: "Cargando su solicitud…",
  loadSubmissionFailed: "No se pudo cargar este enlace. Intente de nuevo o llame a la empresa directamente.",
  expiredTitle: "Este enlace expiró",
  expiredBody: "Este enlace ya no está activo. Llame a la empresa y le ayudaremos.",
  unavailableTitle: "Un momento…",
  unavailableBody:
    "No pudimos cargar su enlace ahora. Espere unos segundos y vuelva a tocar el enlace del mensaje. ¿Sigue sin funcionar? Llame a la empresa.",
  serviceInactiveTitle: "Este enlace no está disponible temporalmente",
  serviceInactiveBody:
    "Llame directamente a la empresa — su servicio de contestación no está activo en este momento.",
  correctionViewTitle: "Revise su solicitud",
  correctionViewHint: "Verifique que todo esté bien — toque Editar si algo debe cambiar.",
  correctionEditTitle: "Edite su solicitud",
  correctionDoneTitle: "Cambios enviados",
  correctionDoneBody: "La empresa recibió sus cambios y dará seguimiento en horario laboral.",
  correctionExpired: "Este enlace expiró o ya no es válido.",
  bookingPortalTitle: "Su solicitud de servicio",
  bookingStatusLabel: "Estado",
  bookingTimeLabel: "Horario de llegada",
  bookingTimeHint: "Nuestro equipo procurará este horario. Le enviaremos un mensaje para confirmar.",
  bookingChangeTime: "Cambiar horario de llegada",
  bookingEditDetails: "Actualizar dirección o detalles del daño",
  bookingCancel: "Cancelar solicitud",
  bookingRescheduleHint: "Elija un nuevo horario disponible abajo.",
  bookingConfirmTime: "Confirmar nuevo horario",
  bookingCancelConfirmTitle: "¿Cancelar esta solicitud?",
  bookingCancelConfirmBody: "Avisaremos a la empresa. Puede volver a llamar si aún necesita ayuda.",
  bookingCancelConfirmButton: "Sí, cancelar mi solicitud",
  portalBackToView: "Volver",
  portalLandingTitle: "Reportar un daño",
  portalLandingBody:
    "Abra el enlace de su mensaje de texto para enviar detalles o revisar el estado de su solicitud.",
};

/** Pick the customer-facing intake copy for a locale. Unknown → English. */
export function getLinkIntakeCopy(locale?: string | null): LinkIntakeCopy {
  return locale?.toLowerCase().startsWith("es") ? linkIntakePageCopyEs : linkIntakePageCopy;
}
