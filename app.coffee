Twit = require "twit"
mongoose = require "mongoose"
fs = require "fs"
async = require "async"
yaml = require "js-yaml"

schema = require "./db/schema.js"

accounts = yaml.load(fs.readFileSync('./config/account_list.yml','utf-8'))
messages = yaml.load(fs.readFileSync('./config/messages.yml','utf-8'))
steps    = yaml.load(fs.readFileSync('./config/steps.yml','utf-8'))

Account = require "./models/account"
account = new Account(accounts[0])

# 15分間に送信するメッセージの最大数
MAX_NUM_OF_DM = 10

# 処理の繰り返し間隔
INTERVAL = 15 * 60 * 1000 #15分

# データベースの初期設定
for key of schema
  mongoose.model key, schema[key]
Follower = mongoose.model("Follower")
mongoose.connect "mongodb://localhost/twclient"
lastSentDirectMessageID = undefined

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
      Follower.findOne
        follower_id: follower_id
      , (err, follower) ->
        if not err and not follower
          #データベースに存在していない場合
          newFollower = new Follower(
            follower_id: follower_id
            step: steps.finished
          )
          newFollower.save (err) -> a_callback()
        return
      return
    callback null, "done"
], (err, result) ->
  console.log err  if err
  console.log "marked friends as finished: " + result
  return

setInterval (->
  # 送信待ちの段階にあるフォロワーへのDM送信
  mesNum = 0
  async.each [
    steps.dm4_replyed, steps.dm3_replyed
    steps.dm2_replyed, steps.dm1_replyed
    steps.followed
  ], (step, callback) ->
    Follower.find
      step: step
    , (err, followers) ->
      if err
        console.log err
      else
        # 送信するメッセージ
        message = undefined
        DIRECT_MESSAGES.forEach (mes) ->
          if mes["step"] is step
            message = mes["message"]
            return

        followers.forEach (follower) ->
          return  if mesNum > MAX_NUM_OF_DM
          T.post "direct_messages/new",
            user_id: follower.follower_id
            text: message
          , (err, reply) ->
            if err
              console.log err
            else
              console.log "step" + step + " DM done :" + reply
            return

          if follower.step is RP4_CAME or follower.step is RP3_CAME or follower.step is RP2_CAME or follower.step is RP1_CAME or follower.step is FOLLOW_CAME
            follower.step++
            follower.last_sent_at = new Date()
            follower.save (err) ->
              console.log err  if err
              return

          mesNum++
          return

      callback()
      return

    return

  # DMの検出
  param =
    include_entities: false
    skip_status: true
    since_id: "457450918217130000"

  param["since_id"] = lastSentDirectMessageID  if lastSentDirectMessageID
  console.log param["since_id"]
  T.get "direct_messages", param, (err, directMessages) ->
    if err
      console.log err
    else
      if directMessages and directMessages.length > 0
        lastSentDirectMessageID = directMessages[0]["id"]

        # DMを送った人の段階を変更する
        async.each directMessages, (directMessage, callback) ->
          if not directMessage["sender_id"] or not directMessage["id"]
            callback()
          else
            Follower.findOne
              follower_id: directMessage["sender_id"]
            , (err, follower) ->
              if not err and follower
                if follower.step is DM1_SENT or follower.step is DM2_SENT or follower.step is DM3_SENT or follower.step is DM4_SENT
                  if follower.last_sent_at
                    lastDate = follower.last_sent_at
                    createdDate = new Date(directMessage["created_at"])
                    return  if createdDate - lastDate <= 10
                  follower.step++
                  follower.last_sent_at = new Date(directMessage["created_at"])
                  follower.save (err) ->
                    console.log err  if err
                    callback()
                    return

                else
                  callback()
              else
                console.log err  if err
                callback()
              return

          return

      console.log "directMessages :" + JSON.stringify(directMessages)
    return

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
        Follower.findOne
          follower_id: follower_id
        , (err, follower) ->
          if not err and not follower
            #データベースに存在していない場合
            newFollower = new Follower(
              follower_id: follower_id
              step: steps.followed
            )
            newFollower.save (err) -> a_callback()
          return
        return
      callback null, "done"
  ], (err, result) ->
    console.log err  if err
    console.log "searched new friends: " + result
    return

  return
), INTERVAL
