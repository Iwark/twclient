Twit = require "twit"
mongoose = require "mongoose"
fs = require "fs"
async = require "async"
yaml = require "js-yaml"

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
  (callback) -> account.getFollowerList callback

  # フレンド（相互フォロー）の取得
  (callback) -> account.getFriends callback

  # データベースに存在していなければ作成
  (callback) ->
    async.each account.friends, (follower_id, a_callback) ->
      account.createFollowerIfNotExists follwer_id, steps.finished, a_callback
    callback null, "done"
], (err, result) ->
  console.log err  if err
  console.log "marked friends as finished: " + result

setInterval (->
  # 送信待ちの段階にあるフォロワーへのDM送信
  account.sent_in_interval = 0
  async.each [
    steps.dm4_replyed, steps.dm3_replyed
    steps.dm2_replyed, steps.dm1_replyed
    steps.followed
  ], (step, callback) ->
    # 送信するメッセージ
    message = undefined
    messages.forEach (mes) ->
      if mes["step"] is step
        message = mes["message"]
    account.sendDirectMessages step message callback

  # DMの検出
  async.waterfall [

    # DMの取得
    (callback) -> account.getDirectMessages callback

    # DMを送ってきたフォロワーの段階を１段階上げる
    (callback) -> account.stepUpFollower([steps.dm1_sent, steps.dm2_sent, steps.dm3_sent, steps.dm4_sent], callback)

  ], (err, result) ->
    console.log err  if err
    console.log "checked direct messages: " + result

  # リフォローの検出
  async.waterfall [

    # フォローリストの取得
    (callback) -> account.getFollowList callback

    # フォロワーリストの取得
    (callback) -> account.getFollowerList callback

    # フレンド（相互フォロー）の取得
    (callback) -> account.getFriends callback

    # データベースに存在していなければ作成
    (callback) ->
      async.each account.friends, (follower_id, a_callback) ->
        account.createFollowerIfNotExists follower_id, steps.followed, a_callback
      callback null, "done"
  ], (err, result) ->
    console.log err  if err
    console.log "searched new friends: " + result

), INTERVAL
