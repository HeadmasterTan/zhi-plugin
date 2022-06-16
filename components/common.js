

/**
 * 发送私聊消息，非好友以临时聊天发送
 * @param user_id qq号
 * @param msg 消息
 * @param isStranger 是否给陌生人发消息,默认false
 */
async function relpyPrivate(user_id, msg ,isStranger = false) {
  user_id = parseInt(user_id);

  let friend = Bot.fl.get(user_id);
  if (friend) {
    Bot.logger.mark(`发送好友消息[${friend.nickname}](${user_id})`);
    Bot.pickUser(user_id).sendMsg(msg).catch((err) => {
      Bot.logger.mark(err);
    });
    redis.incr(`Yunzai:sendMsgNum:${BotConfig.account.qq}`);
    return;
  }
  else {
    //是否给陌生人发消息
    if(!isStranger){
      return;
    }
    let key = `Yunzai:group_id:${user_id}`;
    let group_id = await redis.get(key);

    if (!group_id) {
      for (let group of Bot.gl) {
        group[0] = parseInt(group[0])
        let MemberInfo = await Bot.getGroupMemberInfo(group[0], user_id).catch((err)=>{});
        if (MemberInfo) {
          group_id = group[0];
          redis.set(key, group_id.toString(), { EX: 1209600 });
          break;
        }
      }
    } else {
      group_id = parseInt(group_id)
    }

    if (group_id) {

      Bot.logger.mark(`发送临时消息[${group_id}]（${user_id}）`);

      let res = await Bot.pickMember(group_id, user_id).sendMsg(msg).catch((err) => {
        Bot.logger.mark(err);
      });

      if (res) {
        redis.expire(key, 86400 * 15);
      } else {
        return;
      }

      redis.incr(`Yunzai:sendMsgNum:${BotConfig.account.qq}`);
    } else {
      Bot.logger.mark(`发送临时消息失败：[${user_id}]`);
    }
  }

}

/**
 * 休眠函数
 * @param ms 毫秒
 */
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * 获取现在时间到今天23:59:59秒的秒数
 */
function getDayEnd() {
  let now = new Date();
  let dayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), "23", "59", "59").getTime() / 1000;

  return dayEnd - parseInt(now.getTime() / 1000);
}


export default { relpyPrivate, sleep, getDayEnd };
