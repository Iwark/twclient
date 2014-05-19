(function() {
  var Account, Follower, MAX_NUM_OF_DM, Twit, async, fs, mongoose, printLog;

  Twit = require("twit");

  mongoose = require("mongoose");

  async = require("async");

  fs = require("fs");

  require("date-utils");

  Follower = mongoose.model("Follower");

  MAX_NUM_OF_DM = 10;

  printLog = function(content) {
    var date, logData, logFile;
    logFile = fs.readFileSync("./twlog", "utf-8");
    date = new Date();
    date = date.toFormat("MM/DD HH24:MI:SS");
    logData = "[" + date + "] " + content + "\n";
    fs.appendFileSync("./twlog", logData);
    return console.log(logData);
  };

  Account = (function() {
    function Account(account) {
      this.T = new Twit(account);
      this.screen_name = account.screen_name;
      this.follow_list = [];
      this.follower_list = [];
      this.friends = [];
      this.direct_messages = [];
      this.sent_in_interval = 0;
    }

    Account.prototype.getFollowList = function(next) {
      this.T.get("friends/ids", {
        screen_name: this.screen_name
      }, function(err, reply) {
        if (!err) {
          this.follow_list = reply["ids"];
        }
        next(err, this.follow_list);
      });
    };

    Account.prototype.getFollowerList = function(follow_list, next) {
      this.T.get("followers/ids", {
        screen_name: this.screen_name
      }, function(err, reply) {
        if (!err) {
          this.follower_list = reply["ids"];
        }
        next(err, follow_list, this.follower_list);
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
            printLog("found new Friend :" + follower_id);
            printLog("follower " + newFollower.follower_id + " step up: " + (newFollower.step - 1) + " -> " + newFollower.step);
            next();
          });
        } else {
          next();
        }
      });
    };

    Account.prototype.getDirectMessages = function(next) {
      var self;
      self = this;
      async.each([1, 2, 3], function(page, callback) {
        var param;
        param = {
          include_entities: false,
          skip_status: true,
          page: page
        };
        self.T.get("direct_messages", param, function(err, directMessages) {
          if (!err && directMessages && directMessages.length > 0) {
            self.direct_messages = self.direct_messages.concat(directMessages);
            callback();
          }
        });
      }, function(err) {
        next(err, self.direct_messages);
      });
    };

    Account.prototype.stepUpFollower = function(direct_messages, steps, next) {
      async.each(direct_messages, function(directMessage, callback) {
        return Follower.findOne({
          follower_id: directMessage["sender_id"]
        }, function(err, follower) {
          var createdDate, hit, lastDate, step, _i, _len;
          if (!err && follower) {
            hit = false;
            for (_i = 0, _len = steps.length; _i < _len; _i++) {
              step = steps[_i];
              if (parseInt(follower.step) === parseInt(step)) {
                lastDate = follower.last_sent_at;
                createdDate = new Date(directMessage["created_at"]);
                if (!(lastDate && createdDate - lastDate <= 3)) {
                  hit = true;
                  follower.step++;
                  follower.screen_name = directMessage["sender_screen_name"];
                  if (directMessage["text"]) {
                    follower.messages.push(directMessage["text"]);
                  }
                  follower.last_sent_at = new Date(directMessage["created_at"]);
                  follower.save(function(err) {
                    if (err) {
                      printLog(err);
                    }
                    if (directMessage["text"]) {
                      printLog("got new message from " + follower.screen_name + "(" + follower.follower_id + ") : " + directMessage["text"]);
                    }
                    printLog("follower " + follower.screen_name + "(" + follower.follower_id + ")" + " step up: " + (follower.step - 1) + " -> " + follower.step);
                    callback();
                  });
                  break;
                }
              }
            }
            if (!hit) {
              callback();
            }
          } else {
            if (err) {
              printLog("err: " + err);
            } else {
              printLog("not found the follower: " + directMessage["sender_screen_name"] + " (" + directMessage["sender_id"] + ")");
            }
            callback();
          }
        });
      }, function(err) {
        next(err, "done");
      });
    };

    Account.prototype.sendDirectMessages = function(step, message, next) {
      var self, stop;
      self = this;
      stop = false;
      return Follower.find({
        step: step
      }, function(err, followers) {
        if (!err && followers && followers.length > 0) {
          async.each(followers, function(follower, callback) {
            if (stop) {
              callback();
              return;
            }
            if (self.sent_in_interval < MAX_NUM_OF_DM) {
              self.sent_in_interval++;
              self.T.post("direct_messages/new", {
                user_id: follower.follower_id,
                text: message
              }, function(err, reply) {
                var exceeded_test, suspended_test, unfollowing_test;
                if (!err && reply) {
                  follower.step++;
                  follower.screen_name = reply["recipient_screen_name"];
                  follower.last_sent_at = new Date();
                  return follower.save(function(err) {
                    if (err) {
                      printLog(err);
                    }
                    printLog("step" + step + " DM sent to " + reply["recipient_screen_name"] + "(" + reply["recipient_id"] + ")");
                    printLog("follower " + follower.screen_name + "(" + follower.follower_id + ")" + " step up: " + (follower.step - 1) + " -> " + follower.step);
                    callback();
                  });
                } else {
                  printLog("an error occuerd while sending direct message: " + err);
                  unfollowing_test = /who are not following/i.test(err);
                  suspended_test = /suspended/i.test(err);
                  exceeded_test = /lot to say/i.test(err);
                  if (suspended_test || exceeded_test) {
                    stop = true;
                  }
                  callback();
                }
              });
            } else {
              printLog("exceeded the limit of sent_in_interval :" + self.sent_in_interval);
              stop = true;
              callback();
            }
          }, function(err) {
            next();
          });
        } else {
          next();
        }
      });
    };

    Account.prototype.createFriendShip = function(follower_id) {
      this.T.post("friendships/create", {
        user_id: follower_id
      }, function(err, reply) {
        if (err) {
          printLog("an error occuerd while creating friendship: " + err);
        } else {
          printLog("created new friend ship: " + reply["name"] + "(" + reply["id_str"] + ")");
        }
      });
    };

    return Account;

  })();

  module.exports = Account;

}).call(this);
