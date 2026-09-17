// Verify the existing application token on the backend before spending an AI key.
export function requireUser({ backendUrl, fetchImpl = fetch }) {
  return async (req, res, next) => {
    const authorization = req.headers.authorization || '';
    if (!/^Bearer \S+$/.test(authorization) || authorization.length > 8192) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    try {
      const response = await fetchImpl(`${backendUrl}/api/v1/users/profile`, {
        headers: { Authorization: authorization },
        signal: AbortSignal.timeout(5000),
        redirect: 'error',
      });
      if (!response.ok) {
        return res.status(response.status === 401 || response.status === 403 ? 401 : 503)
          .json({ error: 'Unable to authorize request' });
      }
      return next();
    } catch {
      return res.status(503).json({ error: 'Authentication service unavailable' });
    }
  };
}
