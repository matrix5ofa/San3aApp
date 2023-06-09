const express = require('express');
const {
  getAllUsers,
  GetUser,
  UpdatedUser,
  deletedMe,
  getAllWorkers,
  AddWorkerUserRate,
  helpMe,
} = require(`${__dirname}/../controllers/userController`);
const authController = require(`${__dirname}/../controllers/authController`);
const router = express.Router();

router.post('/signUp', authController.SignUp);
router.post('/login', authController.login);
router.post('/forgotpassword', authController.forgotPassword);
router.post('/CheckEmailOrPhone', authController.CheckEmailOrPhone);
router.post('/verifyEmailOtp', authController.verifyEmailOtp);
router.post('/verifyPhoneOtp', authController.verifyPhoneOtp);
router.post('/logout', authController.protect, authController.logOut);

router.post(
  '/resetpassword',
  authController.protect,
  authController.resetPassword
);
router.post(
  '/updatePassword',
  authController.protect,
  authController.updatePassword
);
router.post('/updateUser', authController.protect, UpdatedUser);
router.post('/DeleteMe', authController.protect, deletedMe);
router.post('/helpMe', authController.protect, helpMe);
router.post('/rate', AddWorkerUserRate);

router.get('/workers', authController.protect, getAllWorkers);
router.get('/users', authController.protect, getAllUsers);

router.route('/:id').get(GetUser).patch(UpdatedUser);

module.exports = router;
