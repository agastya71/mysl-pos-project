/**
 * Centralized environment variable configuration and validation
 *
 * All required environment variables are validated at startup.
 * The application will fail fast with clear error messages if required variables are missing.
 */

/**
 * Require an environment variable to be set
 * Throws an error if the variable is not defined
 */
function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Required environment variable ${name} is not set. ` +
      `Please set it in your .env file or environment.`
    );
  }
  return value;
}

/**
 * Get an optional environment variable with a default fallback
 */
function optionalEnv(name: string, defaultValue: string): string {
  return process.env[name] || defaultValue;
}

/**
 * Centralized configuration object
 * All environment variables are accessed through this object
 */
export const env = {
  // Application
  NODE_ENV: optionalEnv('NODE_ENV', 'development'),
  PORT: parseInt(optionalEnv('PORT', '3000'), 10),

  // JWT - REQUIRED, no fallbacks for security
  JWT_ACCESS_SECRET: requireEnv('JWT_ACCESS_SECRET'),
  JWT_REFRESH_SECRET: requireEnv('JWT_REFRESH_SECRET'),
  JWT_ACCESS_EXPIRY: optionalEnv('JWT_ACCESS_EXPIRY', '15m'),
  JWT_REFRESH_EXPIRY: optionalEnv('JWT_REFRESH_EXPIRY', '7d'),
};
