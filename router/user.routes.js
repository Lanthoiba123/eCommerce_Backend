const express = require('express');
const OTP = require('../models/otpModel');
const {
  createUser,
  loginUser,
  sendOTP,
  generateOTP,
  getTotalUserCount,
  getAllCustomers,
  logoutUser,
  googleLogin,
} = require('../controller/userController');
const authenticateCustomer = require('../middlewares/authenticateCustomer');
const authenticateAdmin = require('../middlewares/authenticateAdmin');

const route = express.Router();

route.post('/register', createUser); //http:localhost:3000/user/register
// admin get all customers
route.get('/getAllCustomers', authenticateAdmin, getAllCustomers);
route.post('/login', loginUser);
route.post('/googlelogin', googleLogin);
route.post('/logout', authenticateCustomer, logoutUser);
// Admin get total users
route.get('/totalUsers', getTotalUserCount);

//otp
route.post('/sendotp', async (req, res) => {
  try {
    console.log(req.body);
    const { email } = req.body;
    const otp = generateOTP();
    await sendOTP(email, otp);
    res.status(200).json({ success: true, message: 'OTP sent successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}); //http:localhost:3000/

route.post('/verifyotp', async (req, res) => {
  try {
    const { email, otp } = req.body;
    const data = await OTP.findOne({ email, otp });
    if (data) {
      res
        .status(200)
        .json({ success: true, message: 'OTP verified successfully' });
    } else {
      res.status(400).json({ success: false, message: 'Invalid OTP' });
    }
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = route;
