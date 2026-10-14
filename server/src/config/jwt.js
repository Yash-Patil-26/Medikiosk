const PLACEHOLDER_PATTERN = /change_this_secret|replace_with|your_secret|your_jwt_secret|changeme/i;

export function getJwtSecret() {
  const secret = process.env.JWT_SECRET;

  if (
    typeof secret !== "string" ||
    secret.trim().length < 32 ||
    PLACEHOLDER_PATTERN.test(secret)
  ) {
    throw new Error(
      "Invalid JWT_SECRET configuration. Set a non-placeholder secret of at least 32 characters."
    );
  }

  return secret;
}

export function assertJwtSecretConfigured() {
  getJwtSecret();
}
