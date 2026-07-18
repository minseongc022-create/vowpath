/** Central rate limits for conversational / LLM features (abuse prevention). */

export const SITE_ASSISTANT_HOURLY_LIMIT = 30;
export const SITE_ASSISTANT_BURST_LIMIT = 5;
export const SITE_ASSISTANT_BURST_WINDOW_SEC = 60;
export const SITE_ASSISTANT_HOURLY_WINDOW_SEC = 3600;
export const SITE_ASSISTANT_MAX_QUESTION_CHARS = 400;

export const SHOP_AI_DAILY_LIMIT = 120;
export const SHOP_AI_HOURLY_BURST_LIMIT = 25;
export const SHOP_AI_DAILY_WINDOW_SEC = 86_400;
export const SHOP_AI_HOURLY_WINDOW_SEC = 3600;
export const SHOP_AI_MAX_QUERY_CHARS = 800;

export const JOB_CARD_HOURLY_LIMIT = 20;
export const JOB_CARD_HOURLY_WINDOW_SEC = 3600;

export const WIDGET_MESSAGE_HOURLY_LIMIT = 10;
export const WIDGET_TENANT_HOURLY_LIMIT = 40;
export const WIDGET_HOURLY_WINDOW_SEC = 3600;

export const FORWARDING_AI_BURST_LIMIT = 10;
export const FORWARDING_AI_BURST_WINDOW_SEC = 3600;

export const INTAKE_SUBMIT_PER_TOKEN_LIMIT = 5;
export const INTAKE_SUBMIT_WINDOW_SEC = 600;

export const AI_MAX_HISTORY_TURN_CHARS = 2000;
export const AI_MAX_HISTORY_TURNS = 8;
