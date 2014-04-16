var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var UserSchema = new Schema({
  name: {type:String, default: '新入り' },
  trolley_id: Schema.ObjectId,
  device_id: String,
  facebook: String,
  x: {type:Number, default: 0},
  y: {type:Number, default: 0},
  z: {type:Number, default: 0},
  corrects: [Number],                                   //カテゴリごとの正答数
  wrongs: [Number],                                     //カテゴリごとの誤答数
  money: {type:Number, default: 3000}
});
var TrolleySchema = new Schema({
  category: {type: Number, default:0 },          //カテゴリー
  current_num: {type: Number, default:0},         //今何問目？
  users: [{type: Schema.ObjectId, unique: true}], //乗っているユーザー
  updated_at: {type: Number, default:Date.now()}, //問題更新時刻
  current_time: {type: Number, default:Date.now()},
  quiz: {                                         //クイズ
    index: {type: Number, default: 0},              //問題ID
    category: {type: Number, default: 0},           //カテゴリー
    contents: {type: String, default: ''},          //問題の内容
    correct_answer: {type: String, default: ''},    //正答
    wrong_answer: {type:String, default: ''}        //誤答
  },
  correct_way: {type: Number, default:0},         //正解ルート 左:1 右:2                                     
  history: [Number],                                //クイズ出題履歴（quiz.index）
  corrects: {type: Number, default:0},            //その問題の正答数
  wrongs: {type:Number, default:0},               //その問題の誤答数
  state: {type:Number, default:1}                 //状態(2: コンティニュー待ち)
});

module.exports = {
  User: UserSchema,
  Trolley: TrolleySchema
};