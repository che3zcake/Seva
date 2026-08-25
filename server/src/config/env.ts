import 'dotenv/config';

function optional(name: string): string | undefined {
  const value = process.env[name]?.trim();
  return value ? value : undefined;
}

export const env = {
  PORT: Number(process.env.PORT ?? 4000),
  CLIENT_URL: process.env.CLIENT_URL ?? 'http://localhost:5173',
  /** Absent is a supported configuration, not a failure. */
  OPENAI_API_KEY: optional('OPENAI_API_KEY'),
  OPENAI_MODEL: process.env.OPENAI_MODEL ?? 'gpt-4o-mini',
  NODE_ENV: process.env.NODE_ENV ?? 'development',
} as const;
