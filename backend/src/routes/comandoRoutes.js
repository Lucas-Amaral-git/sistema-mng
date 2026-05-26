const express = require('express');

const comandoController = require('../controllers/comandoController');


const { requireAuth } = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/comandos', requireAuth, comandoController.enviar);

module.exports = router;