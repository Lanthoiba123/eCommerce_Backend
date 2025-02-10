const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const OTP = require('../models/otpModel.js');

const User = require('../models/user.js');
const { createAddress } = require('../utils/address.utils.js');
const { default: mongoose } = require('mongoose');
const userModel = require('../models/user.js');
const asyncHandler = require('express-async-handler');
const validator = require('validator');
const Address = require('../models/addressModel.js');
const {
  ADMIN_ROLES,
  COOKIE,
  JWT_CONFIG,
} = require('../constants/constants.js');
const { OAuth2Client } = require('google-auth-library');

// bcrypt.genSalt(10,(err,salt)=>{
//   if (!err){
//     bcrypt.hash(user.password, s  async(err,hpass)=>{

//     })
//   }
// })
// const createUser = async (req, res) => {
//   try {
//     const { role, userName, email, password } = req.body;
//     const userExist = await User.findOne({ email });
//     console.log(userExist);

//     if (userExist) return res.json("User Exist");
//     const genSalt = await bcrypt.genSalt(10);
//     const hash = await bcrypt.hash(password, genSalt);
//     const data = {
//       role,
//       userName,
//       email,
//       password: hash,
//     };
//     const createData = await User.create(data);
//     console.log(createData);
//     return res.status(201).json({ success: true, data: createData });
//   } catch (err) {
//     return res.status(500).json({ success: err.message, stack: err.stack });
//   }
// };

// Function to generate OTP
function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000); // Generate a 6-digit OTP
}

// Function to send OTP via email
async function sendOTP(email, otp) {
  // Create a Nodemailer transporter
  await OTP.create({ email, otp });
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: 'lanthoibaecommerce@gmail.com', // Your Gmail email address
      pass: 'fwxo jnvx wkvu lzev', // Your Gmail password
    },
  });

  // Send OTP email
  const info = await transporter.sendMail({
    from: '"Lanthoiba" <lanthoibaecommerce@gmail.com>', // Sender address
    to: email, // List of receivers
    subject: 'OTP for Account Verification',
    text: `Your OTP for account verification is: ${otp}`,
  });

  console.log('Message sent: %s', info.messageId);
}

// const createUser = async (req, res) => {
//   try {
//     const { role, userName, email, password } = req.body;
//     const userExist = await User.findOne({ email });

//     if (userExist) return res.json("User Exist");

//     // const otp = generateOTP(); // Generate OTP
//     // // Store the OTP and its expiration time in your database

//     // // Send OTP to the user's email
//     // await sendOTP(email, otp);

//     const genSalt = await bcrypt.genSalt(10);
//     const hash = await bcrypt.hash(password, genSalt);
//     const data = {
//       role,
//       userName,
//       email,
//       password: hash,
//     };
//     const createData = await User.create(data);

//     return res
//       .status(201)
//       .json({ success: true, message: "Create a new User", data: createData });
//   } catch (err) {
//     return res
//       .status(500)
//       .json({ success: false, message: err.message, stack: err.stack });
//   }
// };

const createUser = asyncHandler(async (req, res) => {
  const { userName, email, password, phone } = req.body;

  // LIST ALL COMMON STATUS CODE IN EXPRESS
  // 200: OK
  // 201: Created
  // 204: No Content
  // 400: Bad Request
  // 401: Unauthorized
  // 403: Forbidden
  // 404: Not Found
  // 500: Internal Server Error

  // validate all the fields
  if (!userName || !email || !password || !phone) {
    res.statusCode = 400;
    throw new Error('All fields are required');
  }

  // validate email
  if (!validator.isEmail(email)) {
    res.statusCode = 400;
    throw new Error('Invalid email');
  }

  // password validation
  if (!validator.isStrongPassword(password)) {
    res.statusCode = 400;
    throw new Error(
      'Password must be at least 8 characters long, 1 uppercase, 1 lowercase, 1 number, 1 special character'
    );
  }

  // check if phone number is valid
  if (!validator.isMobilePhone(phone)) {
    res.statusCode = 400;
    throw new Error('Invalid phone number');
  }

  // check if user already exists with email
  const emailExists = await User.findOne({ email });
  if (emailExists) {
    res.statusCode = 400;
    throw new Error('User with this email already exists');
  }

  // check if user already exists with phone
  const phoneExists = await User.findOne({ phone });
  if (phoneExists) {
    res.statusCode = 400;
    throw new Error('User with this phone number already exists');
  }

  const genSalt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, genSalt);
  const userData = {
    userName,
    email,
    password: hashedPassword,
    phone,
  };

  const newUser = await User.create(userData);
  const { password: _, ...userWithoutPassword } = newUser.toObject();

  return res.status(201).json({
    success: true,
    message: 'User created successfully',
    user: userWithoutPassword,
    // address: addressResponse || null,
  });
});

// const getAddressByUserId = async (req, res) => {
//   try {
//     const { _id } = req.body;
//     const addressResponse = await User.findById(
//       new mongoose.Types.ObjectId(_id)
//     ).populate("address");
//     if (!addressResponse) {
//       return res.status(400).json({ message: "User does not exist" });
//     }
//     return res.status(201).json({ success: true, data: addressResponse });
//   } catch (err) {
//     return res.status(500).json({ success: err.message, stack: err.stack });
//   }
// };

const loginUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    res.statusCode = 400;
    throw new Error('All fields are required');
  }

  // validating email
  if (!validator.isEmail(email)) {
    res.statusCode = 400;
    throw new Error('Invalid email');
  }

  const userExist = await User.findOne({ email });
  if (!userExist) {
    res.statusCode = 400;
    throw new Error('No account found with this email. Please sign up first.');
  }

  const isPasswordCorrect = await bcrypt.compare(password, userExist.password);
  if (!isPasswordCorrect) {
    res.statusCode = 400;
    throw new Error('Incorrect password');
  }
  const { password: _, ...userWithoutPassword } = userExist.toObject();

  const token = jwt.sign(userWithoutPassword, JWT_CONFIG.CUSTOMER.JWT_SECRET, {
    expiresIn: JWT_CONFIG.CUSTOMER.JWT_EXPIRES_IN,
  });

  res.cookie(COOKIE.CUSTOMER.COOKIE_NAME, token, {
    httpOnly: COOKIE.CUSTOMER.HTTP_ONLY, // prevent client side js from accessing the cookie and prevent XSS attacks
    secure: COOKIE.CUSTOMER.SECURE, // only send cookie over https
    sameSite: COOKIE.CUSTOMER.SAME_SITE, // allow cookie to be sent to different domains
    maxAge: COOKIE.CUSTOMER.MAX_AGE,
  });

  return res.json({
    message: 'Login Successful',
    user: userWithoutPassword,
  });
});

const googleLogin = asyncHandler(async (req, res) => {
  const { token } = req.body;

  if (!token) {
    res.statusCode = 400;
    throw new Error('Token is required');
  }

  const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

  const ticket = await client.verifyIdToken({
    idToken: token,
    audience: process.env.GOOGLE_CLIENT_ID,
  });

  const { email, name, sub: googleId, picture } = ticket.getPayload();
  let user = await User.findOne({ $or: [{ email }, { googleId }] });

  console.log(ticket.getPayload());

  if (!user) {
    user = await User.create({
      userName: name,
      email,
      googleId,
      picture,
      phone: '0000000000',
    });
  }

  const { password: _, ...userWithoutPassword } = user.toObject();

  const jwtToken = jwt.sign(
    userWithoutPassword,
    JWT_CONFIG.CUSTOMER.JWT_SECRET,
    {
      expiresIn: JWT_CONFIG.CUSTOMER.JWT_EXPIRES_IN,
    }
  );

  res.cookie(COOKIE.CUSTOMER.COOKIE_NAME, jwtToken, {
    httpOnly: COOKIE.CUSTOMER.HTTP_ONLY,
    secure: COOKIE.CUSTOMER.SECURE,
    sameSite: COOKIE.CUSTOMER.SAME_SITE,
    maxAge: COOKIE.CUSTOMER.MAX_AGE,
  });

  return res.json({
    message: 'Login Successful',
    user: userWithoutPassword,
  });
});

const logoutUser = asyncHandler(async (req, res) => {
  res.cookie(COOKIE.CUSTOMER.COOKIE_NAME, '', {
    httpOnly: COOKIE.CUSTOMER.HTTP_ONLY,
    secure: COOKIE.CUSTOMER.SECURE,
    sameSite: COOKIE.CUSTOMER.SAME_SITE,
    expires: new Date(0),
    maxAge: 0,
  });

  return res.status(200).json({ success: true, message: 'Logout Successful' });
});

const getAllCustomers = asyncHandler(async (req, res) => {
  if (ADMIN_ROLES.SUPER_ADMIN !== req?.admin?.role) {
    res.statusCode = 403;
    throw new Error('You are not authorized to access this route');
  }

  const data = await User.find()
    .select('-password')
    .populate('address')
    .populate({
      path: 'cart.product',
      populate: {
        path: 'variants',
      },
    });

  return res.status(200).json({ success: 'Get all the Data', data: data });
});

//for calculating the number of user
const getTotalUserCount = asyncHandler(async (req, res) => {
  try {
    const totalUsers = await userModel.countDocuments();
    res.status(200).json({
      success: true,
      message: 'Total user count fetched successfully',
      total: totalUsers,
    });
  } catch (err) {
    console.error('Error occurred while fetching total user count:', err);
    res.status(500).json({
      success: false,
      message: 'Error occurred while fetching total user count',
      error: err.message,
    });
  }
});

const deleteCustomer = asyncHandler(async (req, res) => {
  const { customerId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(customerId)) {
    res.statusCode = 400;
    throw new Error('Invalid customer ID');
  }

  const deletedCustomer = await User.findByIdAndDelete(customerId);

  if (!deletedCustomer) {
    res.statusCode = 404;
    throw new Error('Customer not found');
  }

  return res.status(200).json({
    success: true,
    message: 'Customer deleted successfully',
    data: deletedCustomer,
  });
});

const getCustomerById = asyncHandler(async (req, res) => {
  const { customerId } = req.params;

  const customer = await User.findById(customerId).select('-password');

  if (!customer) {
    res.statusCode = 404;
    throw new Error('Customer not found');
  }

  return res.status(200).json({
    success: true,
    message: 'Customer fetched successfully',
    data: customer,
  });
});

const updateCustomer = asyncHandler(async (req, res) => {
  const { customerId } = req.params;
  const { userName, email, phone, password } = req.body;

  if (!mongoose.Types.ObjectId.isValid(customerId)) {
    res.statusCode = 400;
    throw new Error('Invalid customer ID');
  }

  const customerToUpdate = await User.findById(customerId);

  if (!customerToUpdate) {
    res.statusCode = 404;
    throw new Error('Customer not found');
  }

  customerToUpdate.userName = userName;
  customerToUpdate.email = email;
  customerToUpdate.phone = phone;

  if (password) {
    const genSalt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, genSalt);
    customerToUpdate.password = hashedPassword;
  }

  const updatedCustomer = await customerToUpdate.save();

  if (!updatedCustomer) {
    res.statusCode = 404;
    throw new Error('Customer not found');
  }

  return res.status(200).json({
    success: true,
    message: 'Customer updated successfully',
    data: updatedCustomer,
  });
});

module.exports = {
  createUser,
  getAllCustomers,
  loginUser,
  sendOTP,
  generateOTP,
  getTotalUserCount,
  logoutUser,
  googleLogin,
  deleteCustomer,
  getCustomerById,
  updateCustomer,
};
