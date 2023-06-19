const User = require('../models/userModel');
const Post = require('../models/postModel');
const HelpMe = require('../models/helpMeModel');
const ReportPost = require('../models/reportPostModel');
const { catchAsync } = require('../utils/catchAsync');
const AppError = require(`../utils/appError`);

exports.getAllReportPost = catchAsync(async (req, res, next) => {
  const AllReportPost = await ReportPost.find()
    .sort({ reportedAt: -1 })
    .populate({
      path: 'postId',
      select: '-updatedAt',
    })
    .populate({
      path: 'userId',
      select: 'name email photo',
    });

  if (!AllReportPost) {
    return next(new AppError("Can't find Reports posts", 404));
  }

  res.status(200).json({
    length: AllReportPost.length,
    status: true,
    message: 'AllReportPost return Sucessfully',
    date: AllReportPost,
  });
});

exports.deleteReportPost = catchAsync(async (req, res, next) => {
  
  const deletePost = await Post.findByIdAndDelete(
    req.body.postId
  ); 

  const deleteReportPost = await ReportPost.deleteMany({postId: req.body.postId})
 
  if (!deleteReportPost) {
    return next(new AppError("Can't delete ReportPost", 404));
  }

  if (!deletePost) {
    return next(new AppError("Can't delete Post", 404));
  }

  res.status(200).json({
    status: true,
    message: 'ReportPost deleted Sucessfully',
  });
});

exports.DeleteClient = catchAsync(async (req, res, next) => {
  const deletedClient = await User.findByIdAndDelete(req.body.userId);

  if (!deletedClient) {
    return next(new AppError('Erorr user not found', 404));
  }

  res.status(200).json({
    status: true,
    message: 'Client deleted Sucessfully',
  });
});

exports.getAllHelpMe = catchAsync(async (req, res, next) => {
  const AllHelpMe = await HelpMe.find()
  .sort({ time: -1 })
    .populate({
      path: 'userId',
      select: 'name email photo',
    });

  if (!AllHelpMe) {
    return next(new AppError("Can't find HelpMe ", 404));
  }

  res.status(200).json({
    length: AllHelpMe.length,
    status: true,
    message: 'AllHelpMe return Sucessfully',
    date: AllHelpMe,
  });
});

exports.deleteHelpMe = catchAsync(async (req, res, next) => {

  const deleteHelpMe = await HelpMe.findByIdAndDelete(
    req.body.helpMeId
  );

  if (!deleteHelpMe) {
    return next(new AppError("Can't delete helpMe", 404));
  }

  res.status(200).json({
    status: true,
    message: 'helpMe deleted Sucessfully',
  });
});

exports.paidUsers = catchAsync(async (req, res, next) => {
  const paidUsers = await User.find({$and: [{role: 'worker'},{isPaid: true }]}).select(' name photo job');

  if (!paidUsers) {
    return next(new AppError('Sorry, cannot send paidUser ', 404));
  }

  res.status(200).json({
    length: paidUsers.length,
    status: true,
    message: 'paidUsers send Sucessfully',
    date: paidUsers,
  });
});

exports.unPaidUsers = catchAsync(async (req, res, next) => {
  const unPaidUsers =  await User.find({$and: [{role: 'worker'},{isPaid: false }]}).select(' name photo job');
  
  if (!unPaidUsers) {
    return next(new AppError('Sorry, cannot send unPaidUser', 404));
  }

  res.status(200).json({
    length: unPaidUsers.length,
    status: true,
    message: 'unPaidUsers send Sucessfully',
    data: unPaidUsers,
  });
});
