Twit = require "twit"
mongoose = require "mongoose"
async = require "async"
Follower = mongoose.model("Follower")

# 15分間に送信するメッセージの最大数
MAX_NUM_OF_DM = 10

class Account

  # 初期化処理
  constructor: (account) ->
    @T = new Twit account
    @screen_name = account.screen_name
    @follow_list = []
    @follower_list = []
    @friends = []
    @last_sent_dm_id = "457450918217130000"
    @direct_messages = []
    @sent_in_interval = 0
    return

  # フレンドリストの取得
  getFollowList: (next) ->
    @T.get "friends/ids",
      screen_name: @screen_name
    , (err, reply) ->
      @follow_list = reply["ids"]  unless err
      console.log "follow_list: " + @follow_list
      next err

  # フォロワーリストの取得
  getFollowerList: (next) ->
    @T.get "followers/ids",
      screen_name: @screen_name
    , (err, reply) ->
      unless err
        @follower_list = reply["ids"]
      console.log "follower_list: " + @follower_list
      next err

  # フレンド（相互フォロー）の取得
  getFriends: (next) ->
    @friends = @follower_list.filter (follower_id) ->
      i = 0
      while i < @follow_list.length
        return true  if parseInt(follower_id) is parseInt(@follow_list[i])
        i++
      false
    console.log "friends: " + @friends
    next null
    return

  # フォロワーをDBに新規作成
  createFollowerIfNotExists: (follower_id, step, next) ->
    Follower.findOne
      follower_id: follower_id
    , (err, follower) ->
      if !err && !follower
        #データベースに存在していない場合
        newFollower = new Follower(
          follower_id: follower_id
          step: step
        )
        newFollower.save (err) -> next()
      else next()
    return

  # DMの取得
  getDirectMessages: (next) ->
    param =
      include_entities: false
      skip_status: true
      since_id: @last_sent_dm_id
    @T.get "direct_messages", param, (err, directMessages) ->
      if !err && directMessages && directMessages.length > 0
        @last_sent_dm_id = directMessages[0]["id"]
        @direct_messages = directMessages;
        next()
    return

  # 該当するフォロワーの段階を１段階上げる
  stepUpFollower: (steps, next) ->
    async.each @direct_messages, (directMessage, callback) ->
      Follower.findOne
        follower_id: directMessage["sender_id"]
      , (err, follower) ->
        if !err && follower
          hit = false
          for step of steps
            if follower.step is step
              hit = true
              if follower.last_sent_at
                lastDate = follower.last_sent_at
                createdDate = new Date(directMessage["created_at"])
                callback() if createdDate - lastDate <= 3
              follower.step++
              follower.screen_name = directMessage["sender_screen_name"]
              follower.messages.push(directMessage["text"])
              follower.last_sent_at = new Date(directMessage["created_at"])
              follower.save (err) ->
                console.log err  if err
                callback()
              break
          callback() if !hit
        else
          console.log err  if err
          callback()
    next null, "done"
    return

  # DMの送信
  sendDirectMessages: (step, message, next) ->
    Follower.find
      step: step
    , (err, followers) ->
      if !err && followers && followers.length > 0
        followers.forEach (follower) ->
          if @sent_in_interval < MAX_NUM_OF_DM
            @sent_in_interval++
            @T.post "direct_messages/new",
              user_id: follower.follower_id
              text: message
            , (err, reply) ->
              if !err && reply
                console.log "step" + step + " DM done :" + reply
                follower.step++
                follower.last_sent_at = new Date()
                follower.save (err) ->
                  console.log err  if err
                  next()
              else next()
          else next()
      else next()
module.exports = Account