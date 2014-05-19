(function() {
  var Account, INTERVAL, Twit, account, accounts, async, fs, key, log, main, messages, mongoose, schema, steps, yaml;

  Twit = require("twit");

  mongoose = require("mongoose");

  fs = require("fs");

  async = require("async");

  yaml = require("js-yaml");

  require("date-utils");

  log = require("../libs/print-log.js");

  schema = require("./db/schema.js");

  for (key in schema) {
    mongoose.model(key, schema[key]);
  }

  mongoose.connect("mongodb://localhost/twclient");

  accounts = yaml.load(fs.readFileSync('./config/account_list.yml', 'utf-8'));

  messages = yaml.load(fs.readFileSync('./config/messages.yml', 'utf-8'));

  steps = yaml.load(fs.readFileSync('./config/steps.yml', 'utf-8'));

  Account = require("./models/account");

  account = new Account(accounts[3]);

  INTERVAL = 15 * 60 * 1000;

  async.waterfall([
    function(callback) {
      return account.getFollowList(callback);
    }, function(follow_list, callback) {
      return account.getFollowerList(follow_list, callback);
    }, function(follow_list, follower_list, callback) {
      return account.getFriends(follow_list, follower_list, callback);
    }, function(friends, callback) {
      return async.each(friends, function(follower_id, a_callback) {
        return account.createFollowerIfNotExists(follower_id, steps.finished, a_callback);
      }, function(err) {
        return callback(null, "done");
      });
    }
  ], function(err, result) {
    if (err) {
      log.warn("Step99 Error: " + err);
    }
  });

  main = function() {
    account.sent_in_interval = 0;
    return async.each([steps.dm3_replyed, steps.dm2_replyed, steps.dm1_replyed, steps.followed], function(step, callback) {
      var message;
      message = "";
      messages.forEach(function(mes) {
        if (parseInt(mes["step"]) === parseInt(step)) {
          message = mes["message"];
        }
      });
      account.sendDirectMessages(step, message, callback);
    }, function(err) {
      async.waterfall([
        function(callback) {
          account.getDirectMessages(callback);
        }, function(direct_messages, callback) {
          account.stepUpFollower(direct_messages, [steps.dm1_sent, steps.dm2_sent, steps.dm3_sent], callback);
        }
      ], function(err, result) {
        if (err) {
          log.warn("DMFind Error: " + err);
        }
      });
      return async.waterfall([
        function(callback) {
          return account.getFollowList(callback);
        }, function(follow_list, callback) {
          return account.getFollowerList(follow_list, callback);
        }, function(follow_list, follower_list, callback) {
          return account.getFriends(follow_list, follower_list, callback);
        }, function(friends, callback) {
          return async.each(friends, function(follower_id, a_callback) {
            return account.createFollowerIfNotExists(follower_id, steps.followed, a_callback);
          }, function(err) {
            return callback(err, "done");
          });
        }
      ], function(err, result) {
        if (err) {
          return log.warn("RefollowFind Error: " + err);
        }
      });
    });
  };

  main();

  setInterval(main, INTERVAL);

}).call(this);
