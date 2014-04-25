Twit = require "twit"

class AccountManager

  constructor: (account) ->
    @screen_name = account.name
    @T = new Twit account

  # フレンドリストの取得
  getFriends: (callback) ->
    T.get "friends/ids",
      screen_name: SCREEN_NAME
    , (err, reply) ->
      friends = []
      friends = reply["ids"]  unless err
      callback err, friends
      return

module.exports = AccountManager