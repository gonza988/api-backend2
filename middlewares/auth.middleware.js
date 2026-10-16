
import { verifyToken } from '../utils/jwt.js';

/**
 * Autenticación opcional: si hay cookie válida setea req.user,
 * si no, sigue como request anónimo (no responde 401).
 * Se usa en rutas públicas que muestran más datos a usuarios logueados.
 */
export const auth = (req, res, next) => {
  try {
    const token = req.cookies?.currentUser;
    if (token) req.user = verifyToken(token);
  } catch (error) {
    // token inválido/expirado: se trata como anónimo
  }
  next();
};