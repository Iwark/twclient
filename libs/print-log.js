(function() {
  var fs, printLog;

  require("date-utils");

  fs = require("fs");

  printLog = function(content) {
    var date, logData, logFile;
    logFile = fs.readFileSync("./twlog", "utf-8");
    date = new Date();
    date = date.toFormat("MM/DD HH24:MI:SS");
    logData = "[" + date + "] " + content + "\n";
    fs.appendFileSync("./twlog", logData);
    return console.log(logData);
  };

  module.exports = {
    info: function(content) {
      printLog(content);
    },
    warn: function(content) {
      content = "<span style='color: #f4be00;'>" + content + "</span>";
      printLog(content);
    },
    error: function(content) {
      content = "<span style='color: #db1921;'>" + content + "</span>";
      printLog(content);
    }
  };

}).call(this);
