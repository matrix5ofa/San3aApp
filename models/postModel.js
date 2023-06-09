const mongoose = require('mongoose');
const validator = require('validator');
const TimeHandle = require('./../utils/TimeHandling');
const postSchema = mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.ObjectId, //population data
      ref: 'User',
      required: [true, 'create post must has user to post'],
    },
    description: {
      type: String,
    },

    image:[String],
    Activity:{
        type:Boolean,
        default:true

    },
    job: {
      type: String,
    },
    SavedById: [String],
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// postSchema.virtual('Date').get(function(){
//    let date=this._id.getTimestamp();
//    date=date.toString();
//   return date.substring(4,15);
// });

postSchema.virtual('Date').get(function () {
  return TimeHandle(this._id.getTimestamp());
  // let now =  Date.now();
  // let date=this._id.getTimestamp();
  // let diffMs = (now - date); // milliseconds between now & Christmas
  // let diffMins = Math.floor(diffMs/60000); // minutes
  // let diffHrs = Math.floor(diffMins/60); // hours
  // let diffDays = Math.floor(diffHrs / 24); // days

  // if(diffDays>=1){
  //     let date=this._id.getTimestamp();
  //     date=date.toString();
  //    return date.substring(4,15);
  // }
  //   else if(diffMins>=0&&diffMins<=59){
  //    return `${diffMins}m`;
  //    }
  //    else if(diffHrs>=1&&diffHrs<=23){
  //     return `${diffHrs}h`
  //    }
});

// postSchema.virtual('Time').get(function(){
//     let date=this._id.getTimestamp();
//     date=date.toString();
//    return date.substring(16,21);
//  });
postSchema.pre(/^find/, function (next) {
  //populting by ref

  this.find({ Activity: { $ne: false } })
    .populate({
      path: 'user',
      select: 'name role photo ',
    })
    .select('-Activity')
    .select('-__v')
    .select('-SavedById');
  next();
});

const Post = mongoose.model('Post', postSchema);

module.exports = Post;
