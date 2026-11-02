export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig();
  const rawApiBase = config.public.apiBase || 'http://localhost:4000/api/v1';
  const apiBase = rawApiBase.endsWith('/api/v1') ? rawApiBase : `${rawApiBase}/api/v1`;

  try {
    const res = await fetch(`${apiBase}/health/reset-data`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    if (!res.ok) {
      throw createError({
        statusCode: res.status,
        statusMessage: 'Failed to reset test data from backend API',
      });
    }
    const data = await res.json();
    return data;
  } catch (err: any) {
    throw createError({
      statusCode: 500,
      statusMessage: err.message || 'Error communicating with API backend',
    });
  }
});
