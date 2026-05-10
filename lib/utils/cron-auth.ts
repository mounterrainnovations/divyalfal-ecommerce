export function isValidCronRequest(request: Request): boolean {
  const expectedSecret = process.env.CRON_SECRET;

  if (!expectedSecret) {
    return true;
  }

  const authHeader = request.headers.get('authorization');
  if (authHeader === `Bearer ${expectedSecret}`) {
    return true;
  }

  const { searchParams } = new URL(request.url);
  return searchParams.get('secret') === expectedSecret;
}
