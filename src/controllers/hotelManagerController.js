const HotelManager = require('../services/hotelManager.service');

const sendError = (res, error) => res.status(error.status || 500).json({ code: error.status ? 'VALIDATION_ERROR' : 'HM_ERROR', message: error.status ? error.message : 'Unable to complete the request.' });

const listLocations = async (req, res) => {
  try { return res.json({ data: await HotelManager.listLocations(req.context.empCod) }); } catch (error) { return sendError(res, error); }
};

const createLocation = async (req, res) => {
  try {
    const location = await HotelManager.createLocation(req.context.empCod, req.context.login, req.body);
    return res.status(201).json({ message: 'Location created.', location });
  } catch (error) { return sendError(res, error); }
};

const updateLocation = async (req, res) => {
  try { await HotelManager.updateLocation(req.context.empCod, req.body); return res.json({ message: 'Location updated.' }); } catch (error) { return sendError(res, error); }
};
const removeLocation = async (req, res) => {
  try { await HotelManager.removeLocation(req.context.empCod, req.params.locationId); return res.status(204).send(); } catch (error) { return sendError(res, error); }
};

const listCategories = async (req,res) => { try { return res.json({ data: await HotelManager.listCategories(req.context.empCod) }); } catch(error) { return sendError(res,error); } };
const saveCategory = async (req,res) => { try { await HotelManager.saveCategory(req.context.empCod,req.body); return res.status(req.body.categoryId ? 200 : 201).json({ message: 'Category saved.' }); } catch(error) { return sendError(res,error); } };
const removeCategory = async (req,res) => { try { await HotelManager.removeCategory(req.context.empCod,req.params.categoryId); return res.status(204).send(); } catch(error) { return sendError(res,error); } };
const listAssets=async(req,res)=>{try{return res.json({data:await HotelManager.listAssets(req.context.empCod)})}catch(e){return sendError(res,e)}};const saveAsset=async(req,res)=>{try{await HotelManager.saveAsset(req.context.empCod,req.body);return res.status(req.body.assetId?200:201).json({message:'Asset saved.'})}catch(e){return sendError(res,e)}};const removeAsset=async(req,res)=>{try{await HotelManager.removeAsset(req.context.empCod,req.params.assetId);return res.status(204).send()}catch(e){return sendError(res,e)}};
const listWorkOrders=async(req,res)=>{try{const requested=req.query.hotelEmpCod==='ALL'?null:(req.query.hotelEmpCod||req.context.empCod);return res.json({data:await HotelManager.listWorkOrders(req.context.empCod,req.context.login,requested)})}catch(e){return sendError(res,e)}};const saveWorkOrder=async(req,res)=>{try{const hotel=await HotelManager.resolveHotelAccess(req.context.empCod,req.context.login,req.body?.hotelEmpCod,true);const workOrderId=await HotelManager.saveWorkOrder(hotel,req.context.login,req.body);return res.status(req.body.workOrderId?200:201).json({message:'Work order saved.',workOrderId})}catch(e){return sendError(res,e)}};const removeWorkOrder=async(req,res)=>{try{const hotel=await HotelManager.resolveHotelAccess(req.context.empCod,req.context.login,req.query.hotelEmpCod,true);await HotelManager.removeWorkOrder(hotel,req.params.workOrderId);return res.status(204).send()}catch(e){return sendError(res,e)}};
const saveWorkOrderTasks=async(req,res)=>{try{const hotel=await HotelManager.resolveHotelAccess(req.context.empCod,req.context.login,req.body?.hotelEmpCod,true);await HotelManager.saveWorkOrderTasks(hotel,req.params.workOrderId,req.body?.tasks);return res.json({message:'Tasks updated.'})}catch(e){return sendError(res,e)}};
const transitionWorkOrder=async(req,res)=>{try{const hotel=await HotelManager.resolveHotelAccess(req.context.empCod,req.context.login,req.body?.hotelEmpCod,true);await HotelManager.transitionWorkOrder(hotel,req.context.login,req.params.workOrderId,req.body);return res.json({message:'Work order moved.'})}catch(e){return sendError(res,e)}};
const getDashboard=async(req,res)=>{try{return res.json(await HotelManager.getDashboard(req.context.empCod, String(req.query.assignedToLogin || '').trim() || null))}catch(e){return sendError(res,e)}};
const listHotelUsers=async(req,res)=>{try{return res.json({data:await HotelManager.listHotelUsers(req.context.empCod)})}catch(e){return sendError(res,e)}};
const listAccessibleHotels=async(req,res)=>{try{return res.json({data:await HotelManager.listAccessibleHotels(req.context.empCod,req.context.login)})}catch(e){return sendError(res,e)}};
module.exports = { listLocations, createLocation, updateLocation, removeLocation, listCategories, saveCategory, removeCategory, listAssets, saveAsset, removeAsset, listWorkOrders, saveWorkOrder, removeWorkOrder, saveWorkOrderTasks, transitionWorkOrder, getDashboard, listHotelUsers, listAccessibleHotels };
