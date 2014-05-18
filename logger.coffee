nodemailer = require "nodemailer"
fs = require "fs"

# 処理の繰り返し間隔
INTERVAL = 60 * 60 * 1000 #60分

now = new Date()
title = "TWclient Sever Log."

main = () ->

    smtpTransport = nodemailer.createTransport "SMTP",
        service: "Gmail"
        auth:
            user: "iwark02@gmail.com"
            pass: "kouhei7y"

    logFile = fs.readFileSync('./twlog','utf-8')

    mailOptions =
        from: "twclient <iwark02@gmail.com>"
        to: "iwark02@gmail.com, rzmrumgxx@gmail.com"
        subject: title
        text: logFile.toString()

    smtpTransport.sendMail mailOptions, (error, response) ->
        if(error)
            console.log(error)
        else
            console.log("Message sent: " + response.message);
            fs.writeFileSync('./twlog','')
        smtpTransport.close()
    return

# 初回待つのをやめる。
main()

# ループ開始
setInterval main, INTERVAL