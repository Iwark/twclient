module.exports.stepCodes =
  FOLLOW_CAME : 1  # フレンドからのフォローを検知した段階
  DM1_SENT    : 2  # １段階目のDMを送信した状態
  RP1_CAME    : 3  # DMに対する１度目の返信を検知した段階
  DM2_SENT    : 4  # ２段階目のDMを送信した状態
  RP2_CAME    : 5  # DMに対する２度目の返信を検知した段階
  DM3_SENT    : 6  # ３段階目のDMを送信した状態
  RP3_CAME    : 7  # DMに対する３度目の返信を検知した段階
  DM4_SENT    : 8  # ４段階目のDMを送信した状態
  RP4_CAME    : 9  # DMに対する４度目の返信を検知した段階
  DM5_SENT    : 10 # ５段階目のDMを送信した状態
  ALREADY     : 99 # 最初からフレンド状態