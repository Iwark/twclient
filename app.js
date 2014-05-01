// Generated by CoffeeScript 1.7.1
(function() {
  var Account, INTERVAL, Twit, account, accounts, async, fs, key, main, messages, mongoose, printLog, schema, steps, yaml;

  Twit = require("twit");

  mongoose = require("mongoose");

  fs = require("fs");

  async = require("async");

  yaml = require("js-yaml");

  require("date-utils");

  printLog = function(content) {
    var date, logData, logFile;
    logFile = fs.readFileSync("./twlog", "utf-8");
    date = new Date();
    date = date.toFormat("MM/DD HH24:MI:SS");
    logData = "[" + date + "] " + content + "\n";
    fs.appendFileSync("./twlog", logData);
    return console.log(logData);
  };

  schema = require("./db/schema.js");

  for (key in schema) {
    mongoose.model(key, schema[key]);
  }

  mongoose.connect("mongodb://localhost/twclient");

  accounts = yaml.load(fs.readFileSync('./config/account_list.yml', 'utf-8'));

  messages = yaml.load(fs.readFileSync('./config/messages.yml', 'utf-8'));

  steps = yaml.load(fs.readFileSync('./config/steps.yml', 'utf-8'));

  Account = require("./models/account");

  account = new Account(accounts[2]);

  INTERVAL = 15 * 60 * 1000;

  async.waterfall([
    function(callback) {
      return account.getFollowList(callback);
    }, function(follow_list, callback) {
      return account.getFollowerList(follow_list, callback);
    }, function(follow_list, follower_list, callback) {
      return account.getFriends(follow_list, follower_list, callback);
    }, function(friends, callback) {
      async.each(friends, function(follower_id, a_callback) {
        return account.createFollowerIfNotExists(follower_id, steps.finished, a_callback);
      });
      return callback(null, "done");
    }
  ], function(err, result) {
    if (err) {
      printLog(err);
    }
    return printLog("marked friends as finished: " + result);
  });

  main = function() {
    account.sent_in_interval = 0;
    async.each([steps.dm4_replyed, steps.dm3_replyed, steps.dm2_replyed, steps.dm1_replyed, steps.followed], function(step, callback) {
      var message;
      message = "";
      messages.forEach(function(mes) {
        if (parseInt(mes["step"]) === parseInt(step)) {
          message = mes["message"];
        }
      });
      account.sendDirectMessages(step, message, callback);
    });
    async.waterfall([
      function(callback) {
        return account.getDirectMessages(callback);
      }, function(direct_messages, callback) {
        return account.stepUpFollower(direct_messages, [steps.dm1_sent, steps.dm2_sent, steps.dm3_sent, steps.dm4_sent], callback);
      }
    ], function(err, result) {
      if (err) {
        printLog(err);
      }
      return printLog("checked direct messages: " + result);
    });
    return async.waterfall([
      function(callback) {
        return account.getFollowList(callback);
      }, function(follow_list, callback) {
        return account.getFollowerList(follow_list, callback);
      }, function(follow_list, follower_list, callback) {
        return account.getFriends(follow_list, follower_list, callback);
      }, function(friends, callback) {
        async.each(friends, function(follower_id, a_callback) {
          return account.createFollowerIfNotExists(follower_id, steps.followed, a_callback);
        });
        return callback(null, "done");
      }
    ], function(err, result) {
      if (err) {
        printLog(err);
      }
      return printLog("searched new friends: " + result);
    });
  };

  main();

  setInterval(main, INTERVAL);

}).call(this);
