const expressAsyncHandler = require('express-async-handler');
const eyongkartInfoModel = require('../models/eyongkartInfoModel');
const { ADMIN_ROLES } = require('../constants/constants');

const createEyongkartInfo = expressAsyncHandler(async (req, res) => {
  // biome-ignore lint/correctness/noConstantCondition: <explanation>
  if (true) {
    res.statusCode = 403;
    throw new Error('You are not authorized to create eyongkartInfo');
  }

  const { companyInfo, contactInfo, socialLinks, copyright, ...rest } =
    req.body;

  if (!companyInfo || !contactInfo || !socialLinks || !copyright) {
    res.statusCode = 400;
    throw new Error(
      'Company Info, Contact Info, Social Media, and Copyright are required'
    );
  }

  const eyongkartInfo = await eyongkartInfoModel.create({
    companyInfo,
    contactInfo,
    socialLinks,
    copyright,
    ...rest,
  });

  res.status(201).json({
    success: true,
    message: 'EyongkartInfo succesfully Added',
    eyongkartInfo,
  });
});

const getEyongkartInfo = expressAsyncHandler(async (req, res) => {
  const eyongkartInfo = await eyongkartInfoModel.find();

  res.status(200).json({
    success: true,
    message: 'EyongkartInfo succesfully fetch',
    eyongkartInfo,
  });
});

const updateEyongkartInfo = expressAsyncHandler(async (req, res) => {
  if (req?.admin?.role !== ADMIN_ROLES.SUPER_ADMIN) {
    res.statusCode = 403;
    throw new Error('You are not authorized to update eyongkartInfo');
  }
  const { id } = req.params;
  const { ...rest } = req.body;
  const eyongkartInfo = await eyongkartInfoModel.findByIdAndUpdate(id, rest, {
    new: true,
  });
  if (!eyongkartInfo) {
    res.statusCode = 404;
    throw new Error('EyongkartInfo not found');
  }
  res.status(200).json({
    success: true,
    message: 'EyongkartInfo succesfully updated',
    eyongkartInfo,
  });
});

const deleteEyongkartInfo = expressAsyncHandler(async (req, res) => {
  // biome-ignore lint/correctness/noConstantCondition: <explanation>
  if (true) {
    res.statusCode = 403;
    throw new Error('You are not authorized to delete eyongkartInfo');
  }
  const { id } = req.params;
  const eyongkartInfo = await eyongkartInfoModel.findByIdAndDelete(id);

  if (!eyongkartInfo) {
    res.statusCode = 404;
    throw new Error('EyongkartInfo not found');
  }

  res.status(200).json({
    success: true,
    message: 'EyongkartInfo succesfully deleted',
    eyongkartInfo,
  });
});

module.exports = {
  createEyongkartInfo,
  getEyongkartInfo,
  updateEyongkartInfo,
  deleteEyongkartInfo,
};
