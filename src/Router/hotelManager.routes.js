const router = require('express').Router();
const authContext = require('../middleware/authContext');
const { requirePermission } = require('../middleware/securityAuthorization');
const controller = require('../controllers/hotelManagerController');

router.use(authContext);
router.get('/dashboard', requirePermission({ sistema: 40, modulo: 1, programa: 1 }), controller.getDashboard);
router.get('/users', requirePermission({ sistema: 40, modulo: 1, programa: 2 }), controller.listHotelUsers);
router.get('/hotels', requirePermission({ sistema: 40, modulo: 1, programa: 6 }), controller.listAccessibleHotels);
const locationsPermission = requirePermission({ sistema: 40, modulo: 1, programa: 3 });
router.get('/locations', locationsPermission, controller.listLocations);
router.post('/locations', locationsPermission, controller.createLocation);
router.put('/locations/:locationId', locationsPermission, controller.updateLocation);
router.delete('/locations/:locationId', locationsPermission, controller.removeLocation);
const categoriesPermission = requirePermission({ sistema: 40, modulo: 1, programa: 4 });
router.get('/categories', categoriesPermission, controller.listCategories);
router.post('/categories', categoriesPermission, controller.saveCategory);
router.put('/categories/:categoryId', categoriesPermission, (req, res, next) => { req.body = { ...(req.body || {}), categoryId: req.params.categoryId }; next(); }, controller.saveCategory);
router.delete('/categories/:categoryId', categoriesPermission, controller.removeCategory);
const assetsPermission=requirePermission({ sistema:40, modulo:1, programa:5 });
router.get('/assets',assetsPermission,controller.listAssets);router.post('/assets',assetsPermission,controller.saveAsset);router.put('/assets/:assetId',assetsPermission,(req,res,next)=>{req.body={...(req.body||{}),assetId:req.params.assetId};next()},controller.saveAsset);router.delete('/assets/:assetId',assetsPermission,controller.removeAsset);
const ordersPermission=requirePermission({sistema:40,modulo:1,programa:2});router.get('/work-orders',ordersPermission,controller.listWorkOrders);router.post('/work-orders',ordersPermission,controller.saveWorkOrder);router.put('/work-orders/:workOrderId',ordersPermission,(req,res,next)=>{req.body={...(req.body||{}),workOrderId:req.params.workOrderId};next()},controller.saveWorkOrder);router.delete('/work-orders/:workOrderId',ordersPermission,controller.removeWorkOrder);
router.post('/work-orders/:workOrderId/transition',ordersPermission,controller.transitionWorkOrder);
router.put('/work-orders/:workOrderId/tasks',ordersPermission,controller.saveWorkOrderTasks);

module.exports = router;
