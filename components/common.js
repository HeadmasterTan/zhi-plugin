import fs from "fs";

const _path = process.cwd();

let packageJson = JSON.parse(fs.readFileSync("package.json", "utf8"));
const yunzaiVersion = packageJson.version;
export const isV3 = yunzaiVersion[0] === "3";

let config;
if (isV3) {
  const YAML = await import("yaml");

  let configUrl = `${_path}/config/config`;
  let qq = YAML.parse(fs.readFileSync(`${configUrl}/qq.yaml`, "utf8"));
  let other = YAML.parse(fs.readFileSync(`${configUrl}//other.yaml`, "utf8"));
  let group = YAML.parse(fs.readFileSync(`${configUrl}//group.yaml`, "utf8"));

  config = { qq, other, group, masterQQ: other.masterQQ, account: qq };
} else {
  config = BotConfig;
}

export const botConfig = config;

/**
 * 发送私聊消息，非好友以临时聊天发送
 * @param user_id qq号
 * @param msg 消息
 * @param isStranger 是否给陌生人发消息,默认false
 */
async function relpyPrivate(user_id, msg, isStranger = false) {
  user_id = parseInt(user_id);

  let friend = Bot.fl.get(user_id);
  if (friend) {
    Bot.logger.mark(`发送好友消息[${friend.nickname}](${user_id})`);
    Bot.pickUser(user_id)
      .sendMsg(msg)
      .catch((err) => {
        Bot.logger.mark(err);
      });
    redis.incr(`Yunzai:sendMsgNum:${botConfig.account.qq}`);
    return;
  } else {
    //是否给陌生人发消息
    if (!isStranger) {
      return;
    }
    let key = `Yunzai:group_id:${user_id}`;
    let group_id = await redis.get(key);

    if (!group_id) {
      for (let group of Bot.gl) {
        group[0] = parseInt(group[0]);
        let MemberInfo = await Bot.getGroupMemberInfo(group[0], user_id).catch(
          (err) => {}
        );
        if (MemberInfo) {
          group_id = group[0];
          redis.set(key, group_id.toString(), { EX: 1209600 });
          break;
        }
      }
    } else {
      group_id = parseInt(group_id);
    }

    if (group_id) {
      Bot.logger.mark(`发送临时消息[${group_id}]（${user_id}）`);

      let res = await Bot.pickMember(group_id, user_id)
        .sendMsg(msg)
        .catch((err) => {
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
 * 消息合并工具函数
 * @param {Array} messages 需要合并的消息列表，必填
 * @param {Boolean} isGroup 是否发送到群，必填，false时为发送到个人
 * @param {String} title 标题
 */
async function replyMake(messages, isGroup, title) {
  let nickname = Bot.nickname;

  // 组装消息
  let msgList = [];
  messages.forEach((msg) => {
    msgList.push({
      message: msg, // 合并消息中的每一个单项消息
      nickname: nickname, // 机器人名字
      user_id: Bot.uin, // 机器人的QQ号
    });
  });

  let forwardMsg = await Bot.makeForwardMsg(msgList, !isGroup);

  if (title) {
    // 处理合并消息在点开前看到的描述
    forwardMsg.data = forwardMsg.data
      .replace(/\n/g, "")
      .replace(/<title color="#777777" size="26">(.+?)<\/title>/g, "___")
      .replace(/___+/, `<title color="#777777" size="26">${title}</title>`);
  }

  return forwardMsg;
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
  let dayEnd =
    new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      "23",
      "59",
      "59"
    ).getTime() / 1000;

  return dayEnd - parseInt(now.getTime() / 1000);
}

/**
 * 是不是狗管理或者狗群主
 * @param {*} e oicq的消息对象
 */
function isGroupAdmin(e = {}) {
  let isAdmin = e?.sender?.role === "admin";
  let isOwner = e?.sender?.role === "owner";

  return isAdmin || isOwner;
}

/**
 * 根据给到的数据，返回一个 1 - 60 的整数或者false
 */
function getRightTimeInterval(num) {
  num = Number(num);
  if (isNaN(num)) return false;

  if (num > 60) return 60;
  if (num <= 0) return 1;

  return num;
}

export default {
  relpyPrivate,
  replyMake,
  sleep,
  getDayEnd,
  isGroupAdmin,
  getRightTimeInterval,
};
