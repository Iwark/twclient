// Generated by CoffeeScript 1.7.1
(function() {
  var INTERVAL, fs, main, nodemailer, now, title;

  nodemailer = require("nodemailer");

  fs = require("fs");

  INTERVAL = 60 * 60 * 1000;

  now = new Date();

  title = "TWclient Sever Log.";

  main = function() {
    var logFile, mailOptions, smtpTransport;
    smtpTransport = nodemailer.createTransport("SMTP", {
      service: "Gmail",
      auth: {
        user: "iwark02@gmail.com",
        pass: "kouhei7y"
      }
    });
    logFile = fs.readFileSync('./twlog', 'utf-8');
    mailOptions = {
      from: "twclient <iwark02@gmail.com>",
      to: "iwark02@gmail.com, rzmrumgxx@gmail.com",
      subject: title,
      text: logFile.toString()
    };
    smtpTransport.sendMail(mailOptions, function(error, response) {
      if (error) {
        console.log(error);
      } else {
        console.log("Message sent: " + response.message);
        fs.writeFileSync('./twlog', '');
      }
      return smtpTransport.close();
    });
  };

  main();

  setInterval(main, INTERVAL);

}).call(this);
