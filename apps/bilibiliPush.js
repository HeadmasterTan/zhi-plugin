import fs from "fs";
import fetch from "node-fetch";
import { segment } from "oicq";
import common from "../components/common.js";

let nowDynamicPushList = new Map(); // 本次新增的需要推送的列表信息
// let lastDynamicPushList = new Map(); // 上一次新增的需要推送的列表信息，防止重复推送 - 暂时用不上
let PushBilibiliDynamic = {};

// B站动态类型
// const DynamicTypeList = {
//   DYNAMIC_TYPE_AV: { name: "视频动态", type: "DYNAMIC_TYPE_AV" },
//   DYNAMIC_TYPE_DRAW: { name: "图文动态", type: "DYNAMIC_TYPE_DRAW" },
//   DYNAMIC_TYPE_ARTICLE: { name: "专栏动态", type: "DYNAMIC_TYPE_ARTICLE" },
//   DYNAMIC_TYPE_FORWARD: { name: "转发动态", type: "DYNAMIC_TYPE_FORWARD" },
//   DYNAMIC_TYPE_LIVE_RCMD: { name: "直播动态", type: "DYNAMIC_TYPE_LIVE_RCMD" },
// };

const BiliUserInfoApiUrl = "https://api.bilibili.com/x/space/acc/info";
const BiliDynamicApiUrl = "https://api.bilibili.com/x/polymer/web-dynamic/v1/feed/space";

const BiliDrawDynamicLinkUrl = "https://m.bilibili.com/dynamic/"; // 图文动态链接地址

const BiliApiRequestTimeInterval = 2000; // B站动态获取api间隔多久请求一次，以防止被拉黑
const DynamicPicCountLimit = 2; // 推送动态时，限制发送多少张图片
const DynamicContentLenLimit = 50; // 推送动态时，限制字数是多少
const DynamicContentLineLimit = 3; // 推送动态时，限制多少行文本
const DynamicPushTimeInterval = 10 * 60 * 1000 + 30 * 1000; // 允许推送多久以前的动态，本来间隔是10分钟，多加30秒增加容错，但是一定概率会发送两条

// 初始化获取B站推送信息
async function initBiliPushJson() {
  if (fs.existsSync("./data/PushNews/PushBilibiliDynamic.json")) {
    PushBilibiliDynamic = JSON.parse(fs.readFileSync("./data/PushNews/PushBilibiliDynamic.json", "utf8"));
  } else {
    savePushJson();
  }
}

initBiliPushJson();

// 变更公告推送开启/关闭
export async function changeBilibiliPush(e) {
  if (e.isGroup && (!common.isGroupAdmin(e) && !e.isMaster)) {
    e.reply("哒咩，只有管理员和master可以操作哦");
    return true;
  }

  // 推送对象记录
  let pushID = "";
  if (e.isGroup) {
    pushID = e.group_id;
  } else {
    pushID = e.user_id;
  }
  if (!pushID) {
    return true;
  }

  if (e.msg.includes("开启")) {
    let info = PushBilibiliDynamic[pushID];
    if (!info) {
      PushBilibiliDynamic[pushID] = {
        isNewsPush: true,
        isGroup: e.isGroup || false,
        lastPushTime: new Date(),
        startUser: e.user_id,
        biliUserList: [{ uid: "401742377", name: "原神" }], // 默认推送原神B站
      };
    } else {
      PushBilibiliDynamic[pushID].isNewsPush = true;
    }
    savePushJson();
    Bot.logger.mark(`开启B站动态推送:${pushID}`);
    e.reply("B站动态推送开启了哦~\n每间隔10分钟会自动检测一次有没有新动态\n如果有的话会自动发送动态内容到这里的~");
  }

  if (e.msg.includes("关闭")) {
    if (PushBilibiliDynamic[pushID]) {
      PushBilibiliDynamic[pushID].isNewsPush = false;
      savePushJson();
      Bot.logger.mark(`关闭B站动态推送:${pushID}`);
      e.reply("这里的B站动态推送已经关闭了，我再也不会提醒你动态更新了哼");
    } else {
      e.reply("你还妹在这里开启过B站动态推送呢");
    }
  }

  return true;
}

// 新增/删除B站动态推送UID
export async function updateBilibiliPush(e) {
  if (e.isGroup && (!common.isGroupAdmin(e) && !e.isMaster)) {
    e.reply("哒咩，只有管理员和master可以操作哦");
    return true;
  }

  // 推送对象记录
  let pushID = "";
  if (e.isGroup) {
    pushID = e.group_id;
  } else {
    pushID = e.user_id;
  }
  if (!pushID) {
    return true;
  }

  let temp = PushBilibiliDynamic[pushID];

  if (!temp) {
    return e.reply("你还妹在这里开启过B站动态推送呢");
  }

  let msgList = e.msg.split("B站推送");
  const addComms = ["订阅", "添加", "新增", "增加"];
  const delComms = ["删除", "移除", "去除"];

  let uid = msgList[1].trim();
  let operComm = msgList[0];

  // uid或者用户名可不能缺
  if (!uid) {
    e.reply(`UID呢？我那么大个UID呢？\n示例：${operComm}B站推送 401742377`);
    return true;
  }

  let uids = temp.biliUserList.map((item) => item.uid);
  let names = temp.biliUserList.map((item) => item.name);

  // 删除B站推送的时候，可以传UID也可以传用户名
  if (delComms.indexOf(operComm) > -1) {
    let isExist = false;

    if (uids.indexOf(uid) > -1) {
      PushBilibiliDynamic[pushID].biliUserList = temp.biliUserList.filter((item) => item.uid != uid);
      isExist = true;
    }
    if (names.indexOf(uid) > -1) {
      PushBilibiliDynamic[pushID].biliUserList = temp.biliUserList.filter((item) => item.name != uid);
      isExist = true;
    }

    if (!isExist) {
      e.reply("别闹，介个B   站用户你都妹加过");
      return true;
    }

    savePushJson();
    e.reply("删掉咯~后悔了就再加回来吧");

    return true;
  }

  if (isNaN(Number(uid))) {
    e.reply(`${uid} <- 你介可不是UID吧？\n示例：${operComm}B站推送 401742377`);
    return true;
  }

  // 添加只能是 uid 的方式添加
  if (addComms.indexOf(operComm) > -1) {
    if (uids.indexOf(uid) > -1) {
      e.reply("别闹，介UID已经加过了");
      return true;
    }

    let url = `${BiliUserInfoApiUrl}?mid=${uid}&jsonp=jsonp`;
    const response = await fetch(url, { method: "get" });

    if (!response.ok) {
      e.reply("哦噢，出了点问题，可能是本大爷网络不好也可能是B站出了问题呢，等会再试试吧~");
      return true;
    }

    const res = await response.json();

    if (res.code != 0) {
      e.reply("老实说，介UID是不是你自己瞎填的？");
      return true;
    }

    let data = res?.data || null;
    if (!data) {
      e.reply("老实说，介UID是不是你自己瞎填的？");
      return true;
    }

    PushBilibiliDynamic[pushID].biliUserList.push({ uid, name: data.name });
    savePushJson();
    e.reply(`添加成功~\n${data.name}：${uid}`);
  }

  return true;
}

// 返回当前聊天对象推送的B站用户列表
export async function getBilibiliPushUserList(e) {
  // 推送对象记录
  let pushID = "";
  if (e.isGroup) {
    pushID = e.group_id;
  } else {
    pushID = e.user_id;
  }
  if (!pushID) {
    return true;
  }
  if (!PushBilibiliDynamic[pushID]) {
    return e.reply("开启过B站推送才能查哦");
  }

  let push = PushBilibiliDynamic[pushID];
  let info = push.biliUserList
    .map((item) => {
      return `${item.name}：${item.uid}`;
    })
    .join("\n");
  let status = push.isNewsPush ? "开启" : "关闭";

  e.reply(`当前B站推送是【${status}】状态哦\n推送的B站用户有：\n${info}`);

  return true;
}

// 推送定时任务
export async function pushScheduleJob(e = {}) {
  Bot.logger.mark("zhi-plugin == B站动态定时推送");

  if (e.msg && !e.isMaster) {
    e.reply("哒咩，你可不是老娘的master");
    return true;
  }

  // 没有开启B站推送
  if (Object.keys(PushBilibiliDynamic).length === 0) {
    return true;
  }

  nowDynamicPushList = new Map(); // 清空上次的推送列表

  let temp = PushBilibiliDynamic;
  for (let user in temp) {
    temp[user].pushTarget = user; // 保存推送QQ对象
    // 循环每个订阅了推送任务的QQ对象
    if (temp[user].isNewsPush) {
      await pushDynamic(temp[user]);
    }
  }
}

// 动态推送
async function pushDynamic(pushInfo) {
  let users = pushInfo.biliUserList;
  for (let i = 0; i < users.length; i++) {
    let biliUID = users[i].uid;

    // 请求这个B站用户动态之前，先看看刚刚有没有请求过这个B  站用户，有就不需要再请求了
    let lastPushList = nowDynamicPushList.get(biliUID);

    if (lastPushList && lastPushList.length) {
      await sendDynamic(pushInfo, users[i], lastPushList);
      continue;
    }

    let url = `${BiliDynamicApiUrl}?host_mid=${biliUID}`;
    const response = await fetch(url, { method: "get" });

    if (!response.ok) {
      // 请求失败，不记录，跳过，下一个
      await common.sleep(BiliApiRequestTimeInterval);
      continue;
    }

    const res = await response.json();

    if (res.code != 0) {
      // 同样请求失败，不记录，跳过，下一个
      await common.sleep(BiliApiRequestTimeInterval);
      continue;
    }

    let data = res?.data?.items || [];
    if (data.length === 0) {
      // 没有动态，记录一个空数组，跳过，下一个
      await common.sleep(BiliApiRequestTimeInterval);
      nowDynamicPushList.set(biliUID, []);
      continue;
    }

    let nowDate = Date.now();
    let pushList = []; // 满足时间要求的可推送动态列表

    // 获取可以推送的动态列表
    for (let val of data) {
      let author = val?.modules?.module_author || {};
      if (!author?.pub_ts) continue; // 没有推送时间。。。跳过，下一个

      author.pub_ts = author.pub_ts * 1000;
      // 允许推送多早以前的动态，重要，超过了设定时间则不推
      if (nowDate - author.pub_ts > DynamicPushTimeInterval) {
        continue;
      }

      pushList.push(val);
    }

    nowDynamicPushList.set(biliUID, pushList); // 记录本次满足时间要求的可推送动态列表，为空也存，待会再查到就跳过
    if (pushList.length === 0) {
      // 没有可以推送的，记录完就跳过，下一个
      await common.sleep(BiliApiRequestTimeInterval);
      continue;
    }

    await sendDynamic(pushInfo, users[i], pushList);

    await common.sleep(BiliApiRequestTimeInterval);
  }

  return true;
}

// 发送动态内容
async function sendDynamic(info, biliUser, list) {
  let pushID = info.pushTarget;
  Bot.logger.mark(`B站动态推送[${pushID}]`);

  for (let val of list) {
    let msg = buildSendDynamic(biliUser, val);
    if (!msg) {
      Bot.logger.mark(`B站动态推送[${pushID}]，推送失败，动态信息获取失败`);
      continue;
    }

    // console.log("\n=========================================\n");
    // console.log(msg);
    // console.log("\n=========================================\n");

    if (info.isGroup) {
      Bot.pickGroup(pushID)
        .sendMsg(msg)
        .catch((err) => {
          Bot.logger.mark(err);
        });
    } else {
      common.relpyPrivate(pushID, msg);
    }

    await common.sleep(1000); // 休息一下，别一口气发一堆
  }

  return true;
}

// 构建动态消息
function buildSendDynamic(biliUser, dynamic) {
  let desc, msg, pics;
  let title = `B站【${biliUser.name}】动态推送：\n`;

  // 以下对象结构参考米游社接口，接口在顶部定义了
  switch (dynamic.type) {
    case "DYNAMIC_TYPE_AV":
      desc = dynamic?.modules?.module_dynamic?.major?.archive;
      if (!desc) return;

      // 视频动态仅由标题、封面、链接组成
      msg = [title, desc.title, segment.image(desc.cover), resetLinkUrl(desc.jump_url)];

      return msg;
    case "DYNAMIC_TYPE_DRAW":
      desc = dynamic?.modules?.module_dynamic?.desc;
      pics = dynamic?.modules?.module_dynamic?.major?.draw?.items;
      if (!desc && !pics) return;

      if (pics.length > DynamicPicCountLimit) pics.length = DynamicPicCountLimit; // 最多发DynamicPicCountLimit张图，不然要霸屏了

      pics = pics.map((item) => {
        return segment.image(item.src);
      });

      // 图文动态由内容（经过删减避免过长）、图片（最多4张）、链接组成
      msg = [title, dynamicContentLimit(desc.text), ...pics, `${BiliDrawDynamicLinkUrl}${dynamic.id_str}`];

      return msg;
    case "DYNAMIC_TYPE_ARTICLE":
      desc = dynamic?.modules?.module_dynamic?.major?.article;
      if (!desc) return;

      pics = [];
      if (desc.covers && desc.covers.length) {
        pics = desc.covers.map((item) => {
          return segment.image(item);
        });
      }

      // 专栏/文章动态由标题、图片、链接组成
      msg = [title, desc.title, ...pics, resetLinkUrl(desc.jump_url)];

      return msg;
    case "DYNAMIC_TYPE_FORWARD": // 转发的动态不推
      return false;
    case "DYNAMIC_TYPE_LIVE_RCMD":
      desc = dynamic?.modules?.module_dynamic?.major?.live_rcmd?.content;
      if (!desc) return;

      desc = JSON.parse(desc);
      desc = desc?.live_play_info;
      if (!desc) return;

      // 直播动态由封面、链接组成
      msg = [title, `开播啦~要看吗要看吗`, segment.image(desc.cover), resetLinkUrl(desc.link)];

      return msg;
    default:
      Bot.logger.mark(`未处理的B站推送：${dynamic.type}`);
      return false;
  }
}

// 限制动态字数/行数，避免过长影响观感（霸屏）
function dynamicContentLimit(content) {
  content = content.split("\n");
  if (content.length > DynamicContentLineLimit) content.length = DynamicContentLineLimit;

  let contentLen = 0; // 内容总长度
  let outLen = false; // 溢出 flag
  for (let i = 0; i < content.length; i++) {
    let len = DynamicContentLenLimit - contentLen; // 这一段内容允许的最大长度

    if (outLen) {
      // 溢出了，后面的直接删掉
      content.splice(i--, 1);
      continue;
    }
    if (content[i].length > len) {
      content[i] = content[i].substr(0, len);
      content[i] = `${content[i]}...`;
      contentLen = DynamicContentLenLimit;
      outLen = true;
    }
    contentLen += content[i].length;
  }

  return content.join("\n");
}

// B站返回的url有时候多两斜杠，去掉
function resetLinkUrl(url) {
  if (url.indexOf("//") === 0) {
    return url.substr(2);
  }

  return url;
}

// 存储动态推送信息
async function savePushJson() {
  let path = "./data/PushNews/PushBilibiliDynamic.json";
  fs.writeFileSync(path, JSON.stringify(PushBilibiliDynamic, "", "\t"));
}
