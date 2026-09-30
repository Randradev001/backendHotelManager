const router = require("express").Router();

const maestrosRouter = require("./maestros.routes")
const seguridadRouter = require('./seguridad.routes')
const hotelManagerRouter = require('./hotelManager.routes')

router.use('/maestros',maestrosRouter)
router.use('/seguridad', seguridadRouter)
router.use('/hotel-manager', hotelManagerRouter)

// test para confirmar que este router está montado
router.get('/test', (req, res) => res.send('Router raíz OK'));



module.exports = router
