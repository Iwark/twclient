var Twit = require('twit');
var mongoose = require('mongoose');
var schema = require('./schema.js');
var async = require('async');

// 使用するTwitterアカウントと、その設定項目
var SCREEN_NAME = 'sayakarzmrumgx'
var T = new Twit({
    consumer_key:         'y9MH162TvhljOcLdlG9m4mkbc'
  , consumer_secret:      'epMyUD0bdPXTnB8YsCEvM287BVr26rrMIDHYMHIMWtMFM3fSIZ'
  , access_token:         '2454429072-z4ieC1hnsjd5JVm5ss2X9Ly8YwJV5Y2BnGYRckD'
  , access_token_secret:  'eiQI8iSkWb2i5Ds2htyQWVJx2Ostw37eb3gq8wWfUfrdD'
});

// ステップ定数（段階）
var FOLLOW_CAME = 1;  // フレンドからのフォローを検知した段階
var DM1_SENT = 2;     // １段階目のDMを送信した状態
var RP1_CAME = 3;     // DMに対する１度目の返信を検知した段階
var DM2_SENT = 4;     // ２段階目のDMを送信した状態
var RP2_CAME = 5;     // DMに対する２度目の返信を検知した段階
var DM3_SENT = 6;     // ３段階目のDMを送信した状態
var RP3_CAME = 7;     // DMに対する３度目の返信を検知した段階
var DM4_SENT = 8;     // ４段階目のDMを送信した状態
var RP4_CAME = 9;     // DMに対する４度目の返信を検知した段階
var DM5_SENT = 10;     // ５段階目のDMを送信した状態

// 15分間に送信するメッセージの最大数
var MAX_NUM_OF_DM = 2;

// ステップごとに送信するDMの内容
var DIRECT_MESSAGES = [
  {
    step: FOLLOW_CAME,
    message: "リフォローありがと♡新しく作りなおしたの(ू•‧̫•ू⑅) 仲良くしてね･ﾟﾟ(p>д<q)ﾟﾟ･"
  },
  {
    step: RP1_CAME,
    message: "返事ありがと꒰ ︠ु௰•꒱ु♡  最近、関西にきたんだ(´∀｀艸)♡  友達少ないから仲良くしてね･ﾟﾟ(p>д<q)ﾟﾟ･  どこらへん住んでるの？( •ॢ◡-ॢ)-♡"
  },
  {
    step: RP2_CAME,
    message: "そうなんだ( •ॢ◡-ॢ)-♡お仕事なにしてるの？(｡≧Д≦｡)    ウチは夜職してるよ(｡>ω<｡) 偏見もってない(*´･д･)?"
  },
  {
    step: RP3_CAME,
    message: "ウチは夜っていっても風俗なんだけどね꒰ ︠ु௰•꒱ु"
  },
  {
    step: RP4_CAME,
    message: ""
  }
];

// 処理の繰り返し間隔
var INTERVAL = 0.5 * 60 * 1000; //15分

// データベースの初期設定
for (var key in schema){
  mongoose.model(key, schema[key]);
}
var Follower = mongoose.model('Follower');
mongoose.connect('mongodb://localhost/twclient');

var lastSentDirectMessageID;

setInterval(function(){

  // 送信待ちの段階にあるフォロワーへのDM送信
  var mesNum = 0;
  async.each([RP4_CAME, RP3_CAME, RP2_CAME, RP1_CAME, FOLLOW_CAME], function(step, callback){
    Follower.find({ step: step }, function(err, followers){
      if(err) console.log(err);
      else{
        // 送信するメッセージ
        var message;
        DIRECT_MESSAGES.forEach(function(mes){
          if(mes["step"] == step){
            message = mes["message"];
            return;
          }
        });
        followers.forEach(function(follower){
          if(mesNum > MAX_NUM_OF_DM) return;
          T.post('direct_messages/new', { user_id:follower.follower_id, text:message }, function(err, reply){
            if(err) console.log(err);
            else console.log("step" + step + " DM done :" + reply);
          });
          follower.step++;
          follower.save(function(err){ if(err) console.log(err); });
          mesNum++;
        });
      }
      callback();
    });
  });

  // DMの検出
  var param = { include_entities: false, skip_status: true, since_id: "457450918217130000" };
  if(lastSentDirectMessageID) param["since_id"] = lastSentDirectMessageID;
  console.log(param["since_id"]);
  T.get('direct_messages', param, function(err, directMessages){
    if(err) console.log(err);
    else{
      if(directMessages && directMessages.length > 0){
        lastSentDirectMessageID = directMessages[0]["id"];
        // DMを送った人の段階を変更する
        async.each(directMessages, function(directMessage, callback){
          if(!directMessage["sender_id"] || !directMessage["id"]) callback();
          else{
            Follower.findOne({ follower_id: directMessage["sender_id"]}, function(err, follower){
              if(!err && follower){
                if(follower.step == DM1_SENT || follower.step == DM2_SENT || follower.step == DM3_SENT || follower.step == DM4_SENT){
                  if(follower.last_sent_at){
                    var lastDate = new Date(follower.last_sent_at);
                    if(directMessage["created_at"] - lastDate <= 10) return;
                  }
                  follower.step++;
                  follower.last_sent_at = directMessage["created_at"];
                  follower.save(function(err){ if(err) console.log(err); callback(); });
                }else callback();
              }else{
                if(err) console.log(err);
                callback();
              }
            });
          }
        });
      }
      console.log("directMessages :" + JSON.stringify(directMessages));
    }
  });

  // リフォローの検出
  async.waterfall([
    // フレンドリストの取得
    function(callback){
      T.get('friends/ids', { screen_name: SCREEN_NAME }, function(err, reply){
        var friends = [];
        if(!err) friends = reply["ids"];
        console.log("got friend_list.");
        callback(err, friends);
      });
    },
    // フレンドリストに存在するフォロワーの取得
    function(friends, callback){
      T.get('followers/ids', { screen_name: SCREEN_NAME },  function (err, reply) {
        var followers = [];
        if(!err) followers = reply["ids"].filter(function(follower_id){
          for(var i=0; i<friends.length; i++){
            if(parseInt(follower_id) == parseInt(friends[i])) return true;
          }
          return false;
        });
        console.log("got follower_list.");
        callback(err, followers);
      });
    },
    // データベースに存在していなければ作成
    function(followers, callback){
      async.each(followers, function(follower_id, a_callback){
        Follower.findOne({ follower_id: follower_id },function(err, follower){
          if(!err && !follower){
            //データベースに存在していない場合
            var newFollower = new Follower({ follower_id: follower_id, step: FOLLOW_CAME });
            newFollower.save(function(err){
              if(err) console.log(err);
              a_callback();
            });
          }
        });
      });
      callback(null, 'done');
    }
  ], function(err,result){
    if(err) console.log(err);
    console.log('series all done. ' + result);
  });

}, INTERVAL);