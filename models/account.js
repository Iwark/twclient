// Generated by CoffeeScript 1.7.1
(function() {
  var Account, Follower, MAX_NUM_OF_DM, Twit, async, mongoose;

  Twit = require("twit");

  mongoose = require("mongoose");

  async = require("async");

  Follower = mongoose.model("Follower");

  MAX_NUM_OF_DM = 10;

  Account = (function() {
    function Account(account) {
      this.T = new Twit(account);
      this.screen_name = account.screen_name;
      this.follow_list = [];
      this.follower_list = [];
      this.friends = [];
      this.last_sent_dm_id = "457450918217130000";
      this.direct_messages = [];
      this.sent_in_interval = 0;
    }

    Account.prototype.getFollowList = function(next) {
      return this.T.get("friends/ids", {
        screen_name: this.screen_name
      }, function(err, reply) {
        if (!err) {
          this.follow_list = reply["ids"];
        }
        return next(err, this.follow_list);
      });
    };

    Account.prototype.getFollowerList = function(follow_list, next) {
      return this.T.get("followers/ids", {
        screen_name: this.screen_name
      }, function(err, reply) {
        if (!err) {
          this.follower_list = reply["ids"];
        }
        return next(err, follow_list, this.follower_list);
      });
    };

    Account.prototype.getFriends = function(follow_list, follower_list, next) {
      this.friends = follower_list.filter(function(follower_id) {
        var i;
        i = 0;
        while (i < follow_list.length) {
          if (parseInt(follower_id) === parseInt(follow_list[i])) {
            return true;
          }
          i++;
        }
        return false;
      });
      console.log("friends: " + this.friends);
      next(null, this.friends);
    };

    Account.prototype.createFollowerIfNotExists = function(follower_id, step, next) {
      Follower.findOne({
        follower_id: follower_id
      }, function(err, follower) {
        var newFollower;
        if (!err && !follower) {
          newFollower = new Follower({
            follower_id: follower_id,
            step: step
          });
          return newFollower.save(function(err) {
            return next();
          });
        } else {
          return next();
        }
      });
    };

    Account.prototype.getDirectMessages = function(next) {
      var param;
      param = {
        include_entities: false,
        skip_status: true,
        since_id: this.last_sent_dm_id
      };
      this.T.get("direct_messages", param, function(err, directMessages) {
        if (!err && directMessages && directMessages.length > 0) {
          this.last_sent_dm_id = directMessages[0]["id"];
          this.direct_messages = directMessages;
          return next(null, this.direct_messages);
        }
      });
    };

    Account.prototype.stepUpFollower = function(direct_messages, steps, next) {
      async.each(direct_messages, function(directMessage, callback) {
        return Follower.findOne({
          follower_id: directMessage["sender_id"]
        }, function(err, follower) {
          var createdDate, hit, lastDate, step;
          if (!err && follower) {
            hit = false;
            for (step in steps) {
              if (follower.step === step) {
                hit = true;
                if (follower.last_sent_at) {
                  lastDate = follower.last_sent_at;
                  createdDate = new Date(directMessage["created_at"]);
                  if (createdDate - lastDate <= 3) {
                    callback();
                  }
                }
                follower.step++;
                follower.screen_name = directMessage["sender_screen_name"];
                follower.messages.push(directMessage["text"]);
                follower.last_sent_at = new Date(directMessage["created_at"]);
                follower.save(function(err) {
                  if (err) {
                    console.log(err);
                  }
                  return callback();
                });
                break;
              }
            }
            if (!hit) {
              return callback();
            }
          } else {
            if (err) {
              console.log(err);
            }
            return callback();
          }
        });
      });
      next(null, "done");
    };

    Account.prototype.sendDirectMessages = function(step, message, next) {
      return Follower.find({
        step: step
      }, function(err, followers) {
        if (!err && followers && followers.length > 0) {
          return followers.forEach(function(follower) {
            if (this.sent_in_interval < MAX_NUM_OF_DM) {
              this.sent_in_interval++;
              return this.T.post("direct_messages/new", {
                user_id: follower.follower_id,
                text: message
              }, function(err, reply) {
                if (!err && reply) {
                  console.log("step" + step + " DM done :" + reply);
                  follower.step++;
                  follower.last_sent_at = new Date();
                  return follower.save(function(err) {
                    if (err) {
                      console.log(err);
                    }
                    return next();
                  });
                } else {
                  return next();
                }
              });
            } else {
              return next();
            }
          });
        } else {
          return next();
        }
      });
    };

    return Account;

  })();

  module.exports = Account;

}).call(this);
