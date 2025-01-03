const { default: mongoose } = require('mongoose');
const User = require('../models/user');
const asyncHandler = require('express-async-handler');
const { createAddress } = require('../utils/address.utils');
const Address = require('../models/addressModel');

// const createAddress = async (req, res) => {
//   try {
//     const info = req.body;
//     const address = await addressModel.create({
//       user_id: info.user_id,
//       name: info.name,
//       address: info.address,
//       district: info.district,
//       state: info.state,
//       pincode: info.pincode,
//       phone: info.phone,
//       street: info.street,
//       landmark: info.landmark,
//     });
//     res.status(201).json({
//       success: true,
//       message: "Address succesfully Added",
//       address,
//     });
//   } catch (err) {
//     console.log(err);
//     res.status(500).json({
//       success: false,
//       message: err.message,
//     });
//   }
// };

const addNewAddress = asyncHandler(async (req, res) => {
  const { address, setDefault } = req.body;

  // validate address fields
  if (
    !address.address ||
    !address.district ||
    !address.state ||
    !address.pincode ||
    !address.landmark ||
    !address.street ||
    !address.phone ||
    !address.city ||
    !address.deliveredToWhom
  ) {
    res.statusCode = 400;
    throw new Error('All address fields are required');
  }

  if (!mongoose.isValidObjectId(req.user._id)) {
    res.statusCode = 400;
    throw new Error('Invalid user id');
  }

  const existingUser = await User.findById(req.user._id);
  if (!existingUser) {
    res.statusCode = 400;
    throw new Error('User does not exist');
  }

  // check if there is already an address
  const existingAddress = await Address.findOne({ user_id: req.user._id });

  // if there is no existing address set the  isDefault to true
  const addressResponse = await createAddress({
    user_id: req.user._id,
    deliveredToWhom: address.deliveredToWhom || req.user.userName,
    isDefault: !existingAddress,
    ...address,
  });

  existingUser.address.push(addressResponse._id);
  if (setDefault) {
    existingUser.defaultAddress = addressResponse._id;
  }
  await existingUser.save();
  const { password: _, ...userWithoutPassword } = existingUser.toObject();
  return res.status(201).json({ success: true, data: addressResponse });
});

const getAddressByUserId = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.user._id)) {
    res.statusCode = 400;
    throw new Error('Invalid user id');
  }

  const user = await User.findById(req.user._id)
    .populate('address')
    .populate('defaultAddress');

  if (!user) {
    res.statusCode = 400;
    throw new Error('User does not exist');
  }

  return res.status(200).json({
    success: true,
    data: {
      addresses: user.address,
      defaultAddress: user.defaultAddress,
    },
  });
});

const deleteAddress = asyncHandler(async (req, res) => {
  const { addressId } = req.params;
  if (!mongoose.isValidObjectId(addressId)) {
    res.statusCode = 400;
    throw new Error('Invalid address id');
  }

  // deny if the address is default
  const address = await Address.findById(addressId);
  if (address.isDefault) {
    res.statusCode = 400;
    throw new Error(
      'Cannot delete default address, set another address as default first'
    );
  }

  const deletedAddress = await Address.findByIdAndDelete(addressId);

  if (!address) {
    res.statusCode = 400;
    throw new Error('Address not found');
  }

  return res.status(200).json({ success: true, data: address });
});

const updateAddress = asyncHandler(async (req, res) => {
  const { addressId } = req.params;
  const {
    address,
    district,
    state,
    pincode,
    landmark,
    street,
    deliveredToWhom,
    phone,
  } = req.body;

  if (
    !address ||
    !district ||
    !state ||
    !pincode ||
    !landmark ||
    !street ||
    !deliveredToWhom ||
    !phone
  ) {
    res.statusCode = 400;
    throw new Error('All address fields are required');
  }

  if (!mongoose.isValidObjectId(addressId)) {
    res.statusCode = 400;
    throw new Error('Invalid address id');
  }

  const updatedAddress = await Address.findByIdAndUpdate(
    addressId,
    {
      address,
      district,
      state,
      pincode,
      landmark,
      street,
      deliveredToWhom,
      phone,
    },
    { new: true }
  );

  if (!updatedAddress) {
    res.statusCode = 400;
    throw new Error('Address not found');
  }

  return res.status(200).json({ success: true, data: updatedAddress });
});

const setDefaultAddress = asyncHandler(async (req, res) => {
  const { addressId } = req.params;

  if (!mongoose.isValidObjectId(addressId)) {
    res.statusCode = 400;
    throw new Error('Invalid address id');
  }

  const user = await User.findById(req.user._id);
  if (!user) {
    res.statusCode = 400;
    throw new Error('User not found');
  }

  const address = await Address.findById(addressId);
  if (!address) {
    res.statusCode = 400;
    throw new Error('Address not found');
  }

  // set all other address to false
  const updatedAddress = await Address.updateMany(
    { user_id: req.user._id },
    { isDefault: false }
  );

  if (!updatedAddress) {
    res.statusCode = 400;
    throw new Error('Failed to update address');
  }

  // set the address to default
  address.isDefault = true;
  await address.save();

  return res.status(200).json({ success: true, data: address });
});

const getMyAddress = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.user._id)) {
    res.statusCode = 400;
    throw new Error('Invalid user id');
  }

  const user = await User.findById(req.user._id);
  if (!user) {
    res.statusCode = 400;
    throw new Error('User not found');
  }

  const address =
    (await Address.find({ user_id: req.user._id }).populate('user_id')) || [];

  return res.status(200).json({ success: true, data: address });
});

// const getAddress = async (req, res) => {
//   try {
//     const address = await addressModel.find();
//     res.status(200).json({
//       success: true,
//       message: 'Address succesfully fetch',
//       address,
//     });
//   } catch (err) {
//     console.log(err);
//     res.status(500).json({
//       success: false,
//       message: err.message,
//     });
//   }
// };

// // Update Address
// const updateAddress = async (req, res) => {
//   try {
//     const { id } = req.params;
//     const updates = req.body;

//     const updatedAddress = await addressModel.findByIdAndUpdate(id, updates, {
//       new: true, // Return the updated document
//       runValidators: true, // Validate before updating
//     });

//     if (!updatedAddress) {
//       return res
//         .status(404)
//         .json({ success: false, message: 'Address not found' });
//     }

//     res.status(200).json({
//       success: true,
//       message: 'Address successfully updated',
//       address: updatedAddress,
//     });
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({
//       success: false,
//       message: err.message,
//     });
//   }
// };

// // Delete Address
// const deleteAddress = async (req, res) => {
//   try {
//     const { id } = req.params;

//     // Find and delete the address
//     const address = await addressModel.findByIdAndDelete(id);
//     if (!address) {
//       return res
//         .status(404)
//         .json({ success: false, message: 'Address not found' });
//     }

//     // Remove the address reference from the user's address array
//     await userModel.updateOne(
//       { _id: address.user_id },
//       { $pull: { address: id } }
//     );

//     res.status(200).json({
//       success: true,
//       message: 'Address successfully deleted',
//     });
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({
//       success: false,
//       message: err.message,
//     });
//   }
// };

module.exports = {
  addNewAddress,
  getAddressByUserId,
  deleteAddress,
  updateAddress,
  setDefaultAddress,
  getMyAddress,
};
