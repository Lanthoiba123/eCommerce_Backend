const express = require('express');
const {
  createEyongkartInfo,
  getEyongkartInfo,
  updateEyongkartInfo,
  deleteEyongkartInfo,
} = require('../controller/eyongkartInfo.controller');
const authenticateAdmin = require('../middlewares/authenticateAdmin');
const Route = express.Router();

Route.post('/create', authenticateAdmin, createEyongkartInfo);
Route.get('/get', getEyongkartInfo);
Route.put('/update/:id', authenticateAdmin, updateEyongkartInfo);
Route.delete('/delete/:id', authenticateAdmin, deleteEyongkartInfo);

module.exports = Route;
