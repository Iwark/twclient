var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var FollowerSchema = new Schema({
  follower_id: {type:Number, default: 0},
  step: {type:Number, default: 0},
  last_sent_at: {type:Date}
});

module.exports = {
  Follower: FollowerSchema
};