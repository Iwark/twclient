Twit = require "twit"
mongoose = require "mongoose"
fs = require "fs"
async = require "async"
yaml = require "js-yaml"
require "date-utils"

printLog = (content) ->
  logFile = fs.readFileSync "./twlog", "utf-8"
  date = new Date()
  date = date.toFormat("MM/DD HH24:MI:SS")
  logData = "[" + date + "] " + content + "\n"
  fs.appendFileSync "./twlog", logData
  console.log logData

schema = require "./db/schema.js"

# データベースの初期設定
for key of schema
  mongoose.model key, schema[key]
mongoose.connect "mongodb://localhost/twclient"

accounts = yaml.load(fs.readFileSync('./config/account_list.yml','utf-8'))
messages = yaml.load(fs.readFileSync('./config/messages.yml','utf-8'))
steps = yaml.load(fs.readFileSync('./config/steps.yml','utf-8'))

Account = require "./models/account"
account = new Account(accounts[2])

# 処理の繰り返し間隔
INTERVAL = 15 * 60 * 1000 #15分

# サーバー起動時、フレンド全員のステップを99（終了状態）にしておく。
# リフォローの検出
async.waterfall [

  # フォローリストの取得
  (callback) -> account.getFollowList callback

  # フォロワーリストの取得
  (follow_list, callback) -> account.getFollowerList follow_list, callback

  # フレンド（相互フォロー）の取得
  (follow_list, follower_list, callback) -> account.getFriends follow_list, follower_list, callback

  # データベースに存在していなければ作成
  (friends, callback) ->
    async.each friends, (follower_id, a_callback) ->
      account.createFollowerIfNotExists follower_id, steps.finished, a_callback
    callback null, "done"
], (err, result) ->
  printLog err  if err

#メインの繰り返し処理
main = () ->
  # 送信待ちの段階にあるフォロワーへのDM送信
  account.sent_in_interval = 0
  async.each [
    steps.dm4_replyed, steps.dm3_replyed
    steps.dm2_replyed, steps.dm1_replyed
    steps.followed
  ], (step, callback) ->
    # 送信するメッセージ
    message = ""
    messages.forEach (mes) ->
      if parseInt(mes["step"]) is parseInt(step)
        message = mes["message"]
        return
    account.sendDirectMessages step, message, callback
    return

  # DMの検出
  async.waterfall [

    # DMの取得
    (callback) -> account.getDirectMessages callback

    # DMを送ってきたフォロワーの段階を１段階上げる
    (direct_messages, callback) -> account.stepUpFollower(direct_messages, [steps.dm1_sent, steps.dm2_sent, steps.dm3_sent, steps.dm4_sent], callback)

  ], (err, result) ->
    printLog err  if err

  # リフォローの検出
  async.waterfall [

    # フォローリストの取得
    (callback) -> account.getFollowList callback

    # フォロワーリストの取得
    (follow_list, callback) -> account.getFollowerList follow_list, callback

    # フレンド（相互フォロー）の取得
    (follow_list, follower_list, callback) -> account.getFriends follow_list, follower_list, callback

    # データベースに存在していなければ作成
    (friends, callback) ->
      async.each friends, (follower_id, a_callback) ->
        account.createFollowerIfNotExists follower_id, steps.followed, a_callback
      callback null, "done"
  ], (err, result) ->
    printLog err  if err

# 初回15分待つのをやめる。
main()

# ループ開始
setInterval main, INTERVAL
