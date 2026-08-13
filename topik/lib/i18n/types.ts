export type TopikLocale = "vi" | "en" | "zh" | "id" | "th" | "ja";

export const TOPIK_LOCALES: { code: TopikLocale; label: string; native: string }[] = [
  { code: "vi", label: "Vietnamese", native: "Tiếng Việt" },
  { code: "en", label: "English", native: "English" },
  { code: "zh", label: "Chinese", native: "中文" },
  { code: "id", label: "Indonesian", native: "Bahasa Indonesia" },
  { code: "th", label: "Thai", native: "ภาษาไทย" },
  { code: "ja", label: "Japanese", native: "日本語" },
];

export type TopikStrings = {
  nav: {
    home: string;
    stats: string;
    studyHub: string;
    league: string;
    premium: string;
    review: string;
    main: string;
  };
  home: {
    hi: string;
    streakDays: string;
    dailyGoal: string;
    todayVocab: string;
    todayMode: string;
    learningInfo: string;
    measureNow: string;
    vocabTop: string;
    shop: string;
    challenges: string;
    dictionary: string;
    myWordbook: string;
  };
  modes: {
    vocab: string;
    conversation: string;
    grammar: string;
    expression: string;
    listening: string;
    settings: string;
    vocabShort: string;
    conversationShort: string;
    grammarShort: string;
    expressionShort: string;
    listeningShort: string;
  };
  studyHub: {
    title: string;
    modeSection: string;
    dailyGoalItems: string;
    favorites: string;
    mySentences: string;
    myWrongNotes: string;
    learnedVocab: string;
    myWordbook: string;
    aiQa: string;
    wordDict: string;
    grammarDict: string;
    other: string;
    pronunciation: string;
  };
  quiz: {
    level: string;
    newTag: string;
    confirm: string;
    seeAnswer: string;
    listenAgain: string;
    keyboardMode: string;
    showLength: string;
    correct: string;
    wrong: string;
    next: string;
    finish: string;
    tapWords: string;
    typeAnswer: string;
    placeholder: string;
  };
  conversation: {
    title: string;
    difficulty: string;
    special: string;
    workplace: string;
    daily: string;
    topik: string;
  };
  league: { title: string; comingSoon: string };
  premium: { title: string; comingSoon: string };
  common: {
    loading: string;
    back: string;
    settings: string;
    edit: string;
    days: string;
  };
};
