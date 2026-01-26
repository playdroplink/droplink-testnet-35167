/**
 * Verified Users Configuration
 * List of usernames that receive automatic verified badge status
 */

export const VERIFIED_USERNAMES = [
  'wain2020',
  'wainfoundation',
] as const;

/**
 * Check if a username should have verified badge
 * @param username - The username to check (case-insensitive)
 * @returns boolean indicating if user should be verified
 */
export const isVerifiedUser = (username?: string | null): boolean => {
  if (!username) return false;
  const normalizedUsername = username.toLowerCase().trim();
  return VERIFIED_USERNAMES.includes(normalizedUsername as any);
};
