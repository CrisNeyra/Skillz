"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type Locale = "es" | "en" | "pt" | "fr" | "it" | "de";

export const LOCALES: { code: Locale; label: string }[] = [
  { code: "es", label: "Español" },
  { code: "en", label: "English (US)" },
  { code: "pt", label: "Português (Brasil)" },
  { code: "fr", label: "Français (France)" },
  { code: "it", label: "Italiano" },
  { code: "de", label: "Deutsch" },
];

export type Dictionary = {
  navLogin: string;
  navRegister: string;
  navProfile: string;
  navCustomize: string;
  navLogout: string;
  navFeed: string;
  navSearch: string;
  navAlerts: string;
  loading: string;
  loadMore: string;
  feedTitle: string;
  feedSubtitle: string;
  feedEmpty: string;
  feedEmptyCta: string;
  feedLoginCta: string;
  feedError: string;
  notifTitle: string;
  notifEmpty: string;
  notifMark: string;
  notifLogin: string;
  notifError: string;
  notifLoading: string;
  searchTitle: string;
  searchPlaceholder: string;
  searchButton: string;
  searchEmpty: string;
  searchLabel: string;
  searchError: string;
  onboardingLogin: string;
  showPassword: string;
  hidePassword: string;
  noComments: string;
  landingTagline: string;
  loginTitle: string;
  loginSubtitle: string;
  loginIdentifier: string;
  loginEmail: string;
  loginPassword: string;
  loginSubmit: string;
  loginPending: string;
  loginNoAccount: string;
  loginRegisterLink: string;
  loginError: string;
  demoBanner: string;
  registerTitle: string;
  registerSubtitle: string;
  registerDisplayName: string;
  registerUsername: string;
  registerEmail: string;
  registerPassword: string;
  registerSubmit: string;
  registerPending: string;
  registerHasAccount: string;
  registerLoginLink: string;
  languages: string;
  aboutMe: string;
  skills: string;
  contacts: string;
  comments: string;
  commentPlaceholder: string;
  commentSubmit: string;
  commentPending: string;
  noBio: string;
  noBioOwner: string;
  noSkills: string;
  noContacts: string;
  noContactsOwner: string;
  formation: string;
  experience: string;
  noFormation: string;
  noExperience: string;
  customizeTitle: string;
  customizeSave: string;
  aiSuggest: string;
  aiAccept: string;
  aiReject: string;
  aiPreview: string;
  aiSuggesting: string;
  homeStrip: string;
  homeCustomize: string;
  homePublic: string;
};

const es: Dictionary = {
  navLogin: "Iniciar sesión",
  navRegister: "Registrarse",
  navProfile: "Mi perfil",
  navCustomize: "Personalizar",
  navLogout: "Salir",
  navFeed: "Feed",
  navSearch: "Buscar",
  navAlerts: "Alertas",
  loading: "Cargando…",
  loadMore: "Cargar más",
  feedTitle: "Feed",
  feedSubtitle: "Actividad de quienes seguís.",
  feedEmpty: "Todavía no hay actividad.",
  feedEmptyCta: "Buscar gente para seguir",
  feedLoginCta: "Iniciá sesión para ver el feed de quienes seguís.",
  feedError: "No se pudo cargar el feed",
  notifTitle: "Notificaciones",
  notifEmpty: "Sin notificaciones todavía. Completá tu perfil y seguí gente para empezar.",
  notifMark: "Marcar leídas",
  notifLogin: "Iniciá sesión para ver tus alertas.",
  notifError: "No se pudieron cargar las notificaciones",
  notifLoading: "Cargando notificaciones…",
  searchTitle: "Buscar talento",
  searchPlaceholder: "Nombre, usuario, headline…",
  searchButton: "Buscar",
  searchEmpty: "No hay resultados para esa búsqueda.",
  searchLabel: "Buscar perfiles",
  searchError: "Error de búsqueda",
  onboardingLogin: "Iniciá sesión para completar el onboarding.",
  showPassword: "Mostrar contraseña",
  hidePassword: "Ocultar contraseña",
  noComments: "Sin comentarios todavía.",
  landingTagline: "Tu lugar para tus Skillz, Oportunidades para quedarse.",
  loginTitle: "Iniciar sesión",
  loginSubtitle: "Entrá con tu email o usuario y contraseña.",
  loginIdentifier: "Email o usuario",
  loginEmail: "Email",
  loginPassword: "Contraseña",
  loginSubmit: "Iniciar sesión",
  loginPending: "Entrando…",
  loginNoAccount: "¿No tenés cuenta?",
  loginRegisterLink: "Registrate",
  loginError: "No se pudo iniciar sesión",
  demoBanner: "Cuenta demo precargada (solo desarrollo).",
  registerTitle: "Registrarse",
  registerSubtitle: "Creá tu cuenta con email, usuario y contraseña.",
  registerDisplayName: "Nombre visible",
  registerUsername: "Usuario",
  registerEmail: "Email",
  registerPassword: "Contraseña (mín. 8, letra y número)",
  registerSubmit: "Crear cuenta",
  registerPending: "Creando…",
  registerHasAccount: "¿Ya tenés cuenta?",
  registerLoginLink: "Iniciar sesión",
  languages: "Idiomas",
  aboutMe: "Sobre mí",
  skills: "Skills",
  contacts: "Contactos",
  comments: "Comentarios / endorsements",
  commentPlaceholder: "Dejá un comentario o endorsement…",
  commentSubmit: "Comentar",
  commentPending: "Enviando…",
  noBio: "Sin bio todavía.",
  noBioOwner: "Contá tu historia desde Personalizar.",
  noSkills: "Sin skills todavía.",
  noContacts: "Sin contactos públicos.",
  noContactsOwner: "Agregá LinkedIn, email, GitHub y X desde Personalizar.",
  formation: "Formación académica",
  experience: "Experiencia personal",
  noFormation: "Sin formación cargada.",
  noExperience: "Sin experiencia cargada.",
  customizeTitle: "Personalizar perfil",
  customizeSave: "Guardar tema",
  aiSuggest: "Sugerir con IA",
  aiAccept: "Aplicar sugerencia",
  aiReject: "Descartar",
  aiPreview: "Vista previa IA",
  aiSuggesting: "Generando…",
  homeStrip: "Tu home",
  homeCustomize: "Personalizar media, flyer y contactos",
  homePublic: "Vista pública",
};

const en: Dictionary = {
  ...es,
  navLogin: "Log in",
  navRegister: "Sign up",
  navProfile: "My profile",
  navCustomize: "Customize",
  navLogout: "Log out",
  navFeed: "Feed",
  navSearch: "Search",
  navAlerts: "Alerts",
  loading: "Loading…",
  loadMore: "Load more",
  feedTitle: "Feed",
  feedSubtitle: "Activity from people you follow.",
  feedEmpty: "No activity yet.",
  feedEmptyCta: "Find people to follow",
  feedLoginCta: "Sign in to see the feed from people you follow.",
  feedError: "Could not load the feed",
  notifTitle: "Notifications",
  notifEmpty: "No notifications yet. Complete your profile and follow people to get started.",
  notifMark: "Mark as read",
  notifLogin: "Sign in to see your alerts.",
  notifError: "Could not load notifications",
  notifLoading: "Loading notifications…",
  searchTitle: "Search talent",
  searchPlaceholder: "Name, username, headline…",
  searchButton: "Search",
  searchEmpty: "No results for that search.",
  searchLabel: "Search profiles",
  searchError: "Search failed",
  onboardingLogin: "Sign in to complete onboarding.",
  showPassword: "Show password",
  hidePassword: "Hide password",
  noComments: "No comments yet.",
  landingTagline: "Your place for your Skillz. Opportunities that stick.",
  loginTitle: "Log in",
  loginSubtitle: "Sign in with your email or username and password.",
  loginIdentifier: "Email or username",
  loginPassword: "Password",
  loginSubmit: "Log in",
  loginPending: "Signing in…",
  loginNoAccount: "Don't have an account?",
  loginRegisterLink: "Sign up",
  loginError: "Could not sign in",
  demoBanner: "Demo account prefilled (development only).",
  registerTitle: "Sign up",
  registerSubtitle: "Create your account with email, username and password.",
  registerDisplayName: "Display name",
  registerUsername: "Username",
  registerEmail: "Email",
  registerPassword: "Password (min. 8, letter and number)",
  registerSubmit: "Create account",
  registerPending: "Creating…",
  registerHasAccount: "Already have an account?",
  registerLoginLink: "Log in",
  languages: "Languages",
  aboutMe: "About me",
  skills: "Skills",
  contacts: "Contacts",
  comments: "Comments / endorsements",
  commentPlaceholder: "Leave a comment or endorsement…",
  commentSubmit: "Comment",
  commentPending: "Sending…",
  noBio: "No bio yet.",
  noBioOwner: "Tell your story from Customize.",
  noSkills: "No skills yet.",
  noContacts: "No public contacts.",
  noContactsOwner: "Add LinkedIn, email, GitHub and X from Customize.",
  formation: "Education",
  experience: "Experience",
  noFormation: "No education listed.",
  noExperience: "No experience listed.",
  customizeTitle: "Customize profile",
  customizeSave: "Save theme",
  aiSuggest: "Suggest with AI",
  aiAccept: "Apply suggestion",
  aiReject: "Discard",
  aiPreview: "AI preview",
  aiSuggesting: "Generating…",
  homeStrip: "Your home",
  homeCustomize: "Customize media, flyer and contacts",
  homePublic: "Public view",
};

const DICTS: Record<Locale, Dictionary> = {
  es,
  en,
  pt: {
    ...en,
    navLogin: "Entrar",
    navRegister: "Cadastrar",
    navProfile: "Meu perfil",
    navCustomize: "Personalizar",
    navLogout: "Sair",
    landingTagline: "Seu lugar para suas Skillz. Oportunidades que ficam.",
    loginTitle: "Entrar",
    loginSubtitle: "Entre com email ou usuário e senha.",
    loginIdentifier: "Email ou usuário",
    loginPassword: "Senha",
    languages: "Idiomas",
    aboutMe: "Sobre mim",
    demoBanner: "Conta demo preenchida (apenas desenvolvimento).",
  },
  fr: {
    ...en,
    navLogin: "Connexion",
    navRegister: "S'inscrire",
    navProfile: "Mon profil",
    navCustomize: "Personnaliser",
    navLogout: "Déconnexion",
    landingTagline: "Votre place pour vos Skillz. Des opportunités qui restent.",
    loginTitle: "Connexion",
    loginSubtitle: "Connectez-vous avec email ou identifiant et mot de passe.",
    loginIdentifier: "Email ou identifiant",
    loginPassword: "Mot de passe",
    languages: "Langues",
    aboutMe: "À propos",
    demoBanner: "Compte démo prérempli (développement uniquement).",
  },
  it: {
    ...en,
    navLogin: "Accedi",
    navRegister: "Registrati",
    navProfile: "Il mio profilo",
    navCustomize: "Personalizza",
    navLogout: "Esci",
    landingTagline: "Il tuo spazio per le Skillz. Opportunità che restano.",
    loginTitle: "Accedi",
    loginSubtitle: "Entra con email o username e password.",
    loginIdentifier: "Email o username",
    languages: "Lingue",
    aboutMe: "Su di me",
    demoBanner: "Account demo precompilato (solo sviluppo).",
  },
  de: {
    ...en,
    navLogin: "Anmelden",
    navRegister: "Registrieren",
    navProfile: "Mein Profil",
    navCustomize: "Anpassen",
    navLogout: "Abmelden",
    landingTagline: "Dein Ort für deine Skillz. Chancen, die bleiben.",
    loginTitle: "Anmelden",
    loginSubtitle: "Melde dich mit E-Mail oder Benutzername und Passwort an.",
    loginIdentifier: "E-Mail oder Benutzername",
    loginPassword: "Passwort",
    languages: "Sprachen",
    aboutMe: "Über mich",
    demoBanner: "Demo-Konto vorausgefüllt (nur Entwicklung).",
  },
};

const STORAGE_KEY = "skillz_locale";
const COOKIE_KEY = "skillz_locale";

type LocaleContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: Dictionary;
};

const LocaleContext = createContext<LocaleContextValue | null>(null);

export function LocaleProvider({
  children,
  initialLocale = "es",
}: {
  children: ReactNode;
  initialLocale?: Locale;
}) {
  const [locale, setLocaleState] = useState<Locale>(
    initialLocale && DICTS[initialLocale] ? initialLocale : "es",
  );

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    localStorage.setItem(STORAGE_KEY, next);
    document.cookie = `${COOKIE_KEY}=${next}; path=/; max-age=31536000; samesite=lax`;
    document.documentElement.lang = next;
  }, []);

  const value = useMemo(
    () => ({
      locale,
      setLocale,
      t: DICTS[locale],
    }),
    [locale, setLocale],
  );

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error("useLocale debe usarse dentro de LocaleProvider");
  return ctx;
}
