const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { promisify } = require('util');
const client = require('twilio')(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN,
  {
    lazyLoading: true,
  }
);
const User = require('../models/userModel');
const { catchAsync } = require('../utils/catchAsync');
const AppError = require('../utils/appError');

const sendEmail = require('../utils/email');
const uploadImage = require('../utils/uploadImage');
const validator = require('validator');

// const bodyParser=require('body-parser');
// const jsonParser=bodyParser.json();

const signToken = (id) => {
  const token = jwt.sign({ id: id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  }); //sign(payload,secret,options=expires)
  return token;
};

const createSendToken = (user, statusCode, message, res) => {
  const token = signToken(user.id);

  const cookieOption = {
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000
    ), //=> 90 days
    httpOnly: true, // be in http only
  };

  if (process.env.NODE_ENV === 'production') cookieOption.secure = true; // client cann't access it

  res.cookie('jwt', token, cookieOption); // save jwt in cookie

  //Remove password from output
  user.password = undefined;
  //user.token=token;

  res.status(statusCode).json({
    status: true,
    message,
    notError: { statusCode: 200 },
    data: {
      name: user.name,
      photo: user.photo,
      isPaid: user.isPaid,
      role: user.role,
    },
    token,
  });
};

exports.SignUp = catchAsync(async (req, res, next) => {
  if (req?.files?.photo) {
    const file = req.files.photo;

    req.body.photo = await uploadImage(file.tempFilePath);
  }
  if (req?.files?.photo_id) {
    const file = req.files.photo_id;

    req.body.photo_id = await uploadImage(file.tempFilePath);
  }

  const newUser = await User.create(
    req.body //create()  and save() doc
    // {
    // name:req.body.name,
    // email:req.body.email,
    // password:req.body.password,
    // passwordConfirm:req.body.passwordConfirm,
    // passwordChangedAt:req.body.passwordChangedAt,
    // role:req.body.role
    //}
  );

  if (!newUser) {
    return next(new AppError(`Cannot Sign Up`, 404));
  }

  //generate server token
  // const token=jwt.sign({id:newUser._id},process.env.JWT_SECRET,{
  //     expiresIn:process.env.JWT_EXPIRES_IN
  // })  //sign(payload,secret,options=expires)

  //createSendToken(newUser,201,"sign up successfully",res);
  if (req.headers.lang === 'AR') {
    res.status(200).json({
      status: true,
      message: 'تم الاشتراك بنجاح',
      notError: { statusCode: 200 },
    });
  } else {
    res.status(200).json({
      status: true,
      message: 'Sign up Successfully',
      notError: { statusCode: 200 },
    });
  }
  // const token=signToken(newUser._id);

  // res.status(201).json({
  //     status:"success",
  //     token:token,
  //     data:newUser
  // });
});

exports.login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;

  //1) check email && password exist,
  if (!email || !password) {
    return next(new AppError('please provide email & password', 400));
  }
  const validEmail = validator.isEmail(email);
  if (!validEmail) {
    if (req.headers.lang === 'AR') {
      return next(new AppError('صيغة البريد غير صحيحة'));
    }
    return next(new AppError(`Email is n't Valid`));
  }
  //2)check user exists && password is correct
  const user = await User.findOne({ email: email }).select('+password'); // hyzaod el password el m5fee aslan

  //const correct=await user.correctPassword(password,user.password);

  if (
    !user ||
    !(
      (await user.correctPassword(
        password,
        user.password
      )) /** 34an hyrun fe el correct 7ta loo ml2hoo4*/
    )
  ) {
    if (req.headers.lang === 'AR') {
      return next(new AppError('البريد الالكتروني او كلمة المرور غير صحيحة'));
    }
    return next(new AppError('Incorrect email or password', 404));
  }
  //3) if everything ok send token back to the client
  if (req.headers.lang === 'AR') {
    createSendToken(user, 200, 'تم التسجيل الدخول بنجاح', res);
  } else {
    createSendToken(user, 200, 'log in successfully', res);
  }
  // const token=signToken(user._id);

  // res.status(200).json({
  //     status:"success",
  //     token:token
  // })
});

//MIDDLEWARE CHECK IF USER STILL LOGGED IN
exports.protect = catchAsync(async (req, res, next) => {
  //1)Getting token and check it's there
  let token;
  if (req.headers.authorization === 'Bearer null') {
    if (req.headers.lang === 'AR') {
      return next(new AppError('برجاء تسجيل الدخول اولا', 401));
    }
    return next(new AppError("Your're not logged in please log in", 401));
  }
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    if (req.headers.lang === 'AR') {
      return next(new AppError('برجاء تسجيل الدخول اولا', 401));
    }
    return next(new AppError("Your're not logged in please log in", 404)); //401 => is not 'authorized
  }
  //2)Verification token
  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);

  //3)check if user still exist in the route
  const currentUser = await User.findById(decoded.id);
  if (!currentUser) {
    if (req.headers.lang === 'AR') {
      return next(new AppError('لا يوجد مستخدم لهذا التشفير', 401));
    }
    return next(
      new AppError(`user belonging to this token doesn't exist`, 401)
    );
  }
  //4)check if user changed password after the token has issued
  if (currentUser.changesPasswordAfter(decoded.iat)) {
    //iat=> issued at
    if (req.headers.lang === 'AR') {
      return next(
        new AppError('لقد تم تغيير كلمة المرور برجاء تسجيل الدخول', 401)
      );
    }
    return next(
      new AppError(
        'user has changed password recently please log in again',
        401
      )
    );
  }
  //5)check paid time and set it false
  if (currentUser.checkPaidTime(Date.now())) {
    // => valid for 30 days
    await User.findByIdAndUpdate(currentUser.id, { isPaid: false });
  }
  //GRANT ACCESS TO PROTECTED ROUTE
  req.user = currentUser; // pyasse el data le middleware tany
  next();
});

exports.restrictTo = (...roles) => {
  //function feha paramter we 3awz a7oot feha middleware
  //roles ['admin','lead-guide']
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(
        new AppError('You do not have permission to preform this action', 403)
      );
    }
    next();
  };
};

exports.forgotPassword = catchAsync(async (req, res, next) => {
  const user = await User.findOne({ email: req.body.email }).select(
    'email phone'
  );
  if (!user) {
    if (req.headers.lang === 'AR') {
      return next(new AppError('لا يوجد حساب بذلك البريد الالكتروني', 404));
    }
    return next(new AppError('There is no user with email address.', 404));
  }
  if (req.headers.lang === 'AR') {
    res.status(200).json({
      status: true,
      message: 'تمت العملية',
      data: user,
    });
  }
  // createSendToken(user,200,"email founded",res);
  else {
    res.status(200).json({
      status: true,
      message: 'Operation is done',
      data: user,
    });
  }
});

exports.CheckEmailOrPhone = catchAsync(async (req, res, next) => {
  if (req.body.email) {
    const user = await User.findOne({ email: req.body.email });
    if (!user) {
      if (req.headers.lang === 'AR') {
        return next(new AppError('لا يوجد حساب بذلك البريد الالكتروني', 404));
      }
      return next(new AppError("There's no Account with that Email"));
    }
    const OTP = await user.generateOtp();
    await user.save({ validateBeforeSave: false });
    try {
      await sendEmail({
        email: user.email,
        subject: 'Your Password (valid for 10 min)',
        name: user.name,
        otp: OTP,
      });
      if (req.headers.lang === 'AR') {
        res.status(200).json({
          status: true,
          message: 'لقد تم ارسال الكود الخاص بك',
        });
      } else {
        res.status(200).json({
          status: true,
          message: 'Code sent to email!',
        });
      }
    } catch (err) {
      user.passwordOtp = undefined;
      user.passwordOtpExpires = undefined;
      await user.save({ validateBeforeSave: false });

      return next(new AppError(err), 500);
    }
  }
  if (req.body.phone) {
    const user = await User.findOne({ phone: req.body.phone });
    const internationalFormat = `${user.phone}`; // err
    try {
      const otpResponse = await client.verify.v2
        .services(process.env.TWILIO_SERVICE_SID)
        .verifications.create({
          to: internationalFormat,
          channel: 'sms',
        });
      if (req.headers.lang === 'AR') {
        res.status(200).json({
          status: true,
          message: 'لقد تم ارسال الكود الخاص بك',
        });
      } else {
        res.status(200).json({
          status: true,
          message: 'OTP send successfully',
          // otp:otpResponse
        });
      }
    } catch (err) {
      return new AppError(err, 400);
    }
  }
});

exports.verifyEmailOtp = catchAsync(async (req, res, next) => {
  //just email otp
  const cryptoOtp = crypto
    .createHash('sha256')
    .update(req.body.otp)
    .digest('hex');

  const user = await User.findOne({
    passwordOtp: cryptoOtp,
    passwordOtpExpires: { $gt: Date.now() },
  });

  if (!user) {
    if (req.headers.lang === 'AR') {
      return next(new AppError('الكود اما غير صحيحة او غير صالح', 400));
    }

    return next(new AppError('OTP is invalid or has expired', 400));
  }
  const token = signToken(user.id);
  if (req.headers.lang === 'AR') {
    res.status(200).json({
      status: true,
      message: 'يمكنك تغيير كلمة المرور',
      token,
    });
  } else {
    res.status(200).json({
      status: true,
      message: 'OTP is valid You can now reset password',
      token,
    });
  }
});

exports.verifyPhoneOtp = catchAsync(async (req, res, next) => {
  //phone and otp
  const user = await User.findOne({ phone: req.body.phone });
  const otp = req.body.otp;

  const verifiedResponse = await client.verify.v2
    .services(process.env.TWILIO_SERVICE_SID)
    .verificationChecks.create({
      to: user.internationalFormat,
      code: otp,
    });
  if (verifiedResponse.valid === false) {
    if (req.headers.lang === 'AR') {
      res.status(401).json({
        status: false,
        message: 'الكود غير صحيح',
      });
    } else {
      res.status(401).json({
        status: false,
        message: 'invalid otp',
      });
    }
  } else {
    const token = signToken(user.id);
    if (req.headers.lang === 'AR') {
      res.status(200).json({
        status: true,
        message: 'تم التأكيد بنجاح',
        token,
      });
    } else {
      res.status(200).json({
        status: true,
        message: 'OTP is verified Success',
        // verify:verifiedResponse,
        token,
      });
    }
  }
});

exports.resetPassword = catchAsync(async (req, res, next) => {
  // protect handler
  const user = req.user;
  if (!user) {
    if (req.headers.lang === 'AR') {
      return next(new AppError('التشفير غير صحيح', 400));
    }

    return next(new AppError('Token is invalid or has expired', 400));
  }
  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  // user.passwordResetExpires=undefined;
  // user.passwordResetToken=undefined;
  user.passwordOtp = undefined;
  user.passwordOtpExpires = undefined;
  //user.token=undefined;
  await user.save({ validateBeforeSave: false });
  if (req.headers.lang === 'AR') {
    res.clearCookie('jwt');
    res.status(200).json({
      status: true,
      message: 'تم تغير كلمة المرور بنجاح',
    });
  } else {
    res.clearCookie('jwt');
    res.status(200).json({
      status: true,
      message: 'password reset success you can now  try agin to log in',
    });
    //createSendToken(user,200,"password has changed successfully",res);
  }
});

exports.resetPasswordJ = catchAsync(async (req, res, next) => {
  // 1-GET USER BASED ON TOKEN
  const hashedToken = crypto
    .createHash('sha256')
    .update(req.params.token)
    .digest('hex');
  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() },
  });

  //2-if token isn't expires and there's user set new password
  if (!user) {
    return next(new AppError('Token is invalid or has expired', 400));
  }
  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  user.passwordOtp = undefined;
  user.passwordOtpExpires = undefined;
  await user.save({ validateBeforeSave: false });
  //3-
  //4-
  // const token = signToken(user._id);
  // res.status(200).json({
  //   status:'success',
  //   token
  // })
  createSendToken(user, 200, 'password has changed successfully', res);
});

exports.updatePassword = catchAsync(async (req, res, next) => {
  //settings  hy48lha b3d el protect
  // 1) Get user from collection

  const user = await User.findById(req.user.id).select('+password');

  if (!user) {
    return next(new AppError(" there's no user with that token", 404));
  }
  // 2) Check if posted current password is correct
  if (!(await user.correctPassword(req.body.currentPassword, user.password))) {
    if (req.headers.lang === 'AR') {
      return next(new AppError('كلمة المرور الحالية غير صحيحة', 400));
    }
    return next(new AppError("Current password isn't correct", 400));
  }

  // 3) If so, update password
  user.password = req.body.newPassword;
  user.passwordConfirm = req.body.newPasswordConfirm;

  await user.save({ validateBeforeSave: false });
  // 4) Log user in, send JWT
  if (req.headers.lang === 'AR') {
    createSendToken(
      user,
      200,
      'تم تغيير كلمة المرور بنجاح برجاء تسجيل دخول مرة اخرى',
      res
    );
  } else {
    createSendToken(
      user,
      200,
      'password has changed successfully, please log in again',
      res
    );
  }
});

exports.forgotPasswordJ = catchAsync(async (req, res, next) => {
  // 1) Get user based on POSTed email

  const user = await User.findOne({ email: req.body.email });
  if (!user) {
    return next(new AppError('There is no user with email address.', 404));
  }

  // 2) Generate the random reset token
  const resetToken = user.createPasswordRestToken();
  const OTP = await user.generateOtp();
  await user.save({ validateBeforeSave: false });

  // 3) Send it to user's email
  const resetURL = `${req.protocol}://${req.get(
    'host'
  )}/api/v1/users/resetPassword/${resetToken}`;

  const message = `Forgot your password? Submit a PATCH request with your new password and passwordConfirm to: 
  ${resetURL}.
  \nIf you didn't forget your password, please ignore this email!, and the OTP IS ${OTP}`;

  try {
    await sendEmail({
      email: user.email,
      subject: 'Your password reset token (valid for 10 min)',
      message,
      name: user.name,
      otp: OTP,
    });

    res.status(200).json({
      status: 'success',
      message: 'Token sent to email!',
      token: resetToken,
    });
  } catch (err) {
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save({ validateBeforeSave: false });

    return next(new AppError(err), 500);
  }
});

exports.logOut = catchAsync(async (req, res, next) => {
  res.clearCookie('jwt');
  req.headers.authorization = undefined;
  if (req.headers.lang === 'AR') {
    res.status(200).json({
      status: true,
      message: 'تم تسجيل الخروج',
      // token:undefined
    });
  } else {
    res.status(200).json({
      status: true,
      message: 'You log out Successfully',
      // token:undefined
    });
  }
});
