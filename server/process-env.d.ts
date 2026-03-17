declare namespace NodeJS {
  interface ProcessEnv {
    FRONTEND_URL?: string;
    PUBLIC_APP_URL?: string;
    PUBLIC_SERVER_URL?: string;
    MAGUS_PUBLIC_APP_URL?: string;
    MAGUS_PUBLIC_API_URL?: string;
  }
}
