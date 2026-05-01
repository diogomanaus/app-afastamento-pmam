const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'pmam_scaf_secret_2024';

function authenticate(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token não fornecido' });
  }
  try {
    req.user = jwt.verify(header.split(' ')[1], JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Token inválido ou expirado' });
  }
}

function requireAdmin(req, res, next) {
  if (req.user?.perfil !== 'admin') {
    return res.status(403).json({ error: 'Acesso restrito ao administrador' });
  }
  next();
}

function requireComandante(req, res, next) {
  if (!['admin', 'comandante'].includes(req.user?.perfil)) {
    return res.status(403).json({ error: 'Acesso restrito' });
  }
  next();
}

module.exports = { authenticate, requireAdmin, requireComandante };
