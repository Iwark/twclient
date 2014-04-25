Twit = require "twit"

class Account

  constructor: (account) ->
    @T = new Twit account
    @screen_name = account.name
    @follow_list = []
    @follower_list = []
    @friends = []
    return

  # フレンドリストの取得
  getFollowList: (next) ->
    @T.get "friends/ids",
      screen_name: @screen_name
    , (err, reply) ->
      @follow_list = reply["ids"]  unless err
      next err
      return

  # フォロワーリストの取得
  getFollowerList: (next) ->
    T.get "followers/ids",
      screen_name: @screen_name
    , (err, reply) ->
      unless err
        @follower_list = reply["ids"]
      next err
      return

  # フレンド（相互フォロー）の取得
  getFriends: (next) ->
    @friends = @follower_list.filter (follower_id) ->
      i = 0
      while i < @follower_list.length
        return true  if parseInt(follower_id) is parseInt(@friend_list[i])
        i++
      false
    next null
    return

module.exports = AccountManager