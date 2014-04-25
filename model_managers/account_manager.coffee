Twit = require "twit"

class AccountManager
  screen_name: 

  constructor:

  # フレンドリストの取得
  getFriends: (callback) ->
    T.get "friends/ids",
      screen_name: SCREEN_NAME
    , (err, reply) ->
      friends = []
      friends = reply["ids"]  unless err
      callback err, friends
      return

