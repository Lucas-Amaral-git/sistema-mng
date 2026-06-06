const jwt = require('jsonwebtoken');
const { findUserByUsername, verifyPassword } = require('../services/authService');

const JWT_EXPIRES = '7d';

async function login(req, res, next) {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ mensagem: 'username e password sao obrigatorios' });
    }

    const user = await findUserByUsername(username);

    if (!user) {
      return res.status(401).json({ mensagem: 'Credenciais invalidas' });
    }

    const ok = await verifyPassword(password, user.password_hash);

    if (!ok) {
      return res.status(401).json({ mensagem: 'Credenciais invalidas' });
    }

    const token = jwt.sign(
      { sub: user.id, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: JWT_EXPIRES }
    );

    res.json({ token });
  } catch (erro) {
    next(erro);
  }
}

module.exports = { login };