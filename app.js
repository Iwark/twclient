// https://github.com/ttexel/twit

var Twit = require('twit')

var T = new Twit({
    consumer_key:         '9w8aeT46ZRDWOZkLJVw1A'
  , consumer_secret:      'deuO72B43ubDWMVje5mDPXfebLTCFtzWz0upykSXx4'
  , access_token:         '768942398-LUJFcyWaDo48R17OEsRNJXgrkVnnxMA100xjNH8i'
  , access_token_secret:  'ewu1XPZzyXDNDwez8sSNHFdYYnkvugmNq6ZxwNDTBcmia'
})

var mongoose = require('mongoose');
var schema = require('./schema.js');
for (var key in schema){
  mongoose.model(key, schema[key]);
}
var Follower = mongoose.model('Follower');
mongoose.connect('mongodb://localhost/twclient');

//
//  tweet 'hello world!'
// //
// T.post('statuses/update', { status: 'hello world!' }, function(err, reply) {
//   //  ...
// })

// //
// //  search twitter for all tweets containing the word 'banana' since Nov. 11, 2011
// //
// T.get('search/tweets', { q: 'banana since:2011-11-11', count: 100 }, function(err, reply) {
//   //  ...
// })

// //
// //  get the list of user id's that follow @tolga_tezel
// //

// フォロワーチェック
T.get('followers/ids', { screen_name: 'rzmrumgxx' },  function (err, reply) {
  if(!err){
    reply["ids"].forEach(function(follower_id){
      Follower.findOne({ follower_id: follower_id },function(err, f){
        if(err) console.log(err);
        else{
          if(f){
            //既にデータベースに存在する場合
          }else{
            var follower = new Follower({
              follower_id: follower_id,
              step: 1
            });
            follower.save(function(err){
              if(err) console.log(err);
              else{
                T.post('direct_messages/new', { user_id:follower_id, text:'こんにちは！' }, function(err, reply){
                  console.log(err);
                  console.log(reply);
                });
              }
            });
          }
        }
      });
    });
  }
  console.log(err);
  console.log(reply);
});

// //
// //  retweet a tweet with id '343360866131001345'
// //
// T.post('statuses/retweet/:id', { id: '343360866131001345' }, function (err, reply) {
//   //  ...
// })

// //
// //  destroy a tweet with id '343360866131001345'
// //
// T.post('statuses/destroy/:id', { id: '343360866131001345' }, function (err, reply) {
//   //  ...
// })

// //
// // get `funny` twitter users
// //
// T.get('users/suggestions/:slug', { slug: 'funny' }, function (err, reply) {
//   //  ...
// })

// //
// //  stream a sample of public statuses
// //
// var stream = T.stream('statuses/sample')

// stream.on('tweet', function (tweet) {
//   console.log(tweet)
// })

// //
// //  filter the twitter public stream by the word 'mango'.
// //
// var stream = T.stream('statuses/filter', { track: 'mango' })

// stream.on('tweet', function (tweet) {
//   console.log(tweet)
// })

// //
// // filter the public stream by the latitude/longitude bounded box of San Francisco
// //
// var sanFrancisco = [ '-122.75', '36.8', '-121.75', '37.8' ]

// var stream = T.stream('statuses/filter', { locations: sanFrancisco })

// stream.on('tweet', function (tweet) {
//   console.log(tweet)
// })

// //
// // filter the public stream by english tweets containing `#apple`
// //
// var stream = T.stream('statuses/filter', { track: '#apple', language: 'en' })

// stream.on('tweet', function (tweet) {
//   console.log(tweet)
// })
