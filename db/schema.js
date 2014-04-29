// Generated by CoffeeScript 1.7.1
(function() {
  var FollowerSchema, Schema, mongoose;

  mongoose = require("mongoose");

  Schema = mongoose.Schema;

  FollowerSchema = new Schema({
    follower_id: {
      type: Number,
      "default": 0
    },
    step: {
      type: Number,
      "default": 0
    },
    last_sent_at: {
      type: Date
    }
  });

  module.exports = {
    Follower: FollowerSchema
  };

}).call(this);
