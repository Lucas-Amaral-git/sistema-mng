const express = require('express');
const dispositivoController = require('../controllers/dispositivoController');
const { requireAuth } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/dispositivo', requireAuth, dispositivoController.obterDispositivo);
router.post('/dispositivo/regenerar-token', requireAuth, dispositivoController.regenerarToken);

module.exports = router;
