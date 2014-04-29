mongoose = require("mongoose")
Schema = mongoose.Schema

FollowerSchema = new Schema(
  follower_id:
    type: Number
    default: 0

  screen_name:
    type: String
    default: ""

  step:
    type: Number
    default: 0

  last_sent_at:
    type: Date

  messages:
    type: Array
    default: []
)
module.exports = Follower: FollowerSchema