Twit = require "twit"
mongoose = require "mongoose"
async = require "async"
fs = require "fs"
require "date-utils"
Follower = mongoose.model("Follower")

# 15分間に送信するメッセージの最大数
MAX_NUM_OF_DM = 10

log = require "../libs/print-log.js"

class Account
  # 初期化処理
  constructor: (account) ->
    @T = new Twit account
    @screen_name = account.screen_name
    @follow_list = []
    @follower_list = []
    @friends = []
    @direct_messages = []
    @sent_in_interval = 0

  # フレンドリストの取得
  getFollowList: (next) ->
    @T.get "friends/ids",
      screen_name: @screen_name
    , (err, reply) ->
      @follow_list = reply["ids"]  unless err
      next err, @follow_list
      return
    return

  # フォロワーリストの取得
  getFollowerList: (follow_list, next) ->
    @T.get "followers/ids",
      screen_name: @screen_name
    , (err, reply) ->
      unless err
        @follower_list = reply["ids"]
      next err, follow_list, @follower_list
      return
    return

  # フレンド（相互フォロー）の取得
  getFriends: (follow_list, follower_list, next) ->
    @friends = follower_list.filter (follower_id) ->
      i = 0
      while i < follow_list.length
        return true  if parseInt(follower_id) is parseInt(follow_list[i])
        i++
      false
    next null, @friends
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
        newFollower.save (err) -> 
          log.info "found new Friend :" + follower_id
          log.info "StepUp: (" + newFollower.follower_id + ") " + (newFollower.step-1) + " -> " + newFollower.step
          next()
          return
      else 
        next()
        return
    return

  # DMの取得
  getDirectMessages: (next) ->
    self = this
    async.each [1..3], (page, callback) ->
      param =
        include_entities: false
        skip_status: true
        page: page
      self.T.get "direct_messages", param, (err, directMessages) ->
        if !err && directMessages && directMessages.length > 0
          self.direct_messages = self.direct_messages.concat(directMessages);
          callback()
        return
      return
    , (err) ->
      next err, self.direct_messages
      return
    return

  # 指定した段階に変更する
  stepChangeFollower: (follower_id, step) ->
    Follower.findOne
      follower_id: follower_id
    , (err, follower) ->
      if err
        log.error "FollowerFind Error: " + err
      else
        pre_step = follower.step
        follower.step = step
        follower.save (err) ->
          log.warn "StepChange Error: " + err if err
          log.info "StepChange: " + follower.screen_name + "(" + follower.follower_id + ")" + " step changed: " + (pre_step) + " -> " + follower.step
          return
      return
    return

  # 該当するフォロワーの段階を１段階上げる
  stepUpFollower: (direct_messages, steps, next) ->
    async.each direct_messages, (directMessage, callback) ->
      Follower.findOne
        follower_id: directMessage["sender_id"]
      , (err, follower) ->
        if !err && follower
          hit = false
          for step in steps
            if parseInt(follower.step) is parseInt(step)
              lastDate = follower.last_sent_at
              createdDate = new Date(directMessage["created_at"])
              unless (lastDate && createdDate - lastDate <= 3)
                hit = true
                follower.step++
                follower.screen_name = directMessage["sender_screen_name"]
                follower.messages.push(directMessage["text"]) if directMessage["text"]
                follower.last_sent_at = new Date(directMessage["created_at"])
                follower.save (err) ->
                  log.warn "FollowerSave Error: " + err if err
                  log.info "New Message: " + follower.screen_name + "(" + follower.follower_id + ") : " + directMessage["text"] if directMessage["text"]
                  log.info "StepUp: " + follower.screen_name + "(" + follower.follower_id + ") " + (follower.step-1) + " -> " + follower.step
                  callback()
                  return
                break
          if !hit
            callback()
            return
        else
          if err
            log.warn "FollowerFind Error: " + err
          else
            log.warn "Follower NotFound: " + directMessage["sender_screen_name"] + " (" + directMessage["sender_id"] + ")"
          callback()
          return
    , (err) ->
      next err, "done"
      return
    return

  # DMの送信
  sendDirectMessages: (step, message, next) ->
    self = this
    stop = false
    Follower.find
      step: step
    , (err, followers) ->
      if !err && followers && followers.length > 0
        async.each followers, (follower, callback) ->
          if stop
            callback()
            return
          if self.sent_in_interval < MAX_NUM_OF_DM
            self.sent_in_interval++
            self.T.post "direct_messages/new",
              user_id: follower.follower_id
              text: message
            , (err, reply) ->
              if !err && reply
                follower.step++
                follower.screen_name = reply["recipient_screen_name"]
                follower.last_sent_at = new Date()
                follower.save (err) ->
                  log.warn "FollowerSave Error: "  if err
                  log.info "DMSent" + step + ": " + reply["recipient_screen_name"] + "(" + reply["recipient_id"] + ")"
                  log.info "StepUp: " + follower.screen_name + "(" + follower.follower_id + ") " + (follower.step-1) + " -> " + follower.step
                  callback()
                  return
              else 
                log.error "Send Error: " + err
                unfollowing_test = /who are not following/i.test(err)
                rightnow_test = /send direct messages to this user right now./i.test(err)
                self.stepChangeFollower(follower.follower_id, 99) if unfollowing_test || rightnow_test
                # self.createFriendShip(follower.follower_id) if unfollowing_test
                suspended_test = /suspended/i.test(err)
                exceeded_test = /lot to say/i.test(err)
                stop = true if suspended_test || exceeded_test
                callback()
                return
          else 
            log.warn "exceeded the limit of sent_in_interval :" + self.sent_in_interval
            stop = true
            callback()
          return
        , (err) ->
          next()
          return
      else
        next()
      return

  # sendFollow
  createFriendShip: (follower_id) ->
    @T.post "friendships/create",
      user_id: follower_id
    , (err, reply) ->
      if err
        log.error "an error occuerd while creating friendship: " + err
      else
        log.info "created new friend ship: " + reply["name"] + "(" + reply["id_str"] + ")"
      return
    return
module.exports = Account
