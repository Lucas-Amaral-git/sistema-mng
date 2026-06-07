const express = require('express');

const alimentacaoController = require('../controllers/alimentacaoController');


const { requireAuth } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/alimentacoes', requireAuth, alimentacaoController.listar);
router.get('/alimentacoes/ultima', requireAuth, alimentacaoController.ultima);

module.exports = router;
