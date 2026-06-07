const express = require('express');
const cors = require('cors');

const alimentacaoRoutes = require('./routes/alimentacaoRoutes');
const comandoRoutes = require('./routes/comandoRoutes');
const authRoutes = require('./routes/authRoutes');
const dispositivoRoutes = require('./routes/dispositivoRoutes');

const app = express();

app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.use(authRoutes);
app.use(alimentacaoRoutes);
app.use(comandoRoutes);
app.use(dispositivoRoutes);

app.use((req, res) => {
  res.status(404).json({ mensagem: 'Rota nao encontrada' });
});

module.exports = app;