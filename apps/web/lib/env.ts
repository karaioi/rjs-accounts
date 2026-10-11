/**
 * Read a required environment variable.
 *
 * Values are read from the app's `.env.local` (see `.env.example`). There are no
 * in-code fallbacks: a missing variable is a configuration error, so we fail fast
 * rather than silently connecting to some default host.
 */
export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}
