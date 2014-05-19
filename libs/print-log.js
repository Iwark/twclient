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
      content = "<div>" + content + "</div>";
      printLog(content);
    },
    warn: function(content) {
      content = "<div style='color: #f4be00;'>" + content + "</div>";
      printLog(content);
    },
    error: function(content) {
      content = "<div style='color: #db1921;'>" + content + "</div>";
      printLog(content);
    }
  };

}).call(this);
