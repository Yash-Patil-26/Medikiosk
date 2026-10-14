import jwt from 'jsonwebtoken';
import { getJwtSecret } from '../config/jwt.js';

export function authenticate(req, res, next) {
  const token =
    req.cookies?.token || req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  let secret;

  try {
    secret = getJwtSecret();
  } catch (err) {
    return next(err);
  }

  try {
    req.user = jwt.verify(token, secret);
    return next();
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user?.role)) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    return next();
  };
}
