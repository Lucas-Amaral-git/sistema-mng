const express = require('express');

const pesoController = require('../controllers/pesoController');


const { requireAuth } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/pesos', requireAuth, pesoController.listar);
router.get('/pesos/ultimo', requireAuth, pesoController.ultimo);

module.exports = router;