import fs from "fs";
import fetch from "node-fetch";
import { segment } from "oicq";
import common from "../components/common.js";
import { botConfig } from "../components/common.js"

const _path = process.cwd();

if (!fs.existsSync(`${_path}/data/PushNews/`)) {
  fs.mkdirSync(`${_path}/data/PushNews/`);
}

let dynamicPushHistory = []; // 历史推送，仅记录推送的消息ID，不记录本体对象，用来防止重复推送的
let nowDynamicPushList = new Map(); // 本次新增的需要推送的列表信息

let BilibiliPushConfig = {}; // 推送配置
let PushBilibiliDynamic = {}; // 推送对象列表

// B站动态类型
// const DynamicTypeList = {
//   DYNAMIC_TYPE_AV: { name: "视频动态", type: "DYNAMIC_TYPE_AV" },
//   DYNAMIC_TYPE_WORD: { name: "文字动态", type: "DYNAMIC_TYPE_WORD" },
//   DYNAMIC_TYPE_DRAW: { name: "图文动态", type: "DYNAMIC_TYPE_DRAW" },
//   DYNAMIC_TYPE_ARTICLE: { name: "专栏动态", type: "DYNAMIC_TYPE_ARTICLE" },
//   DYNAMIC_TYPE_FORWARD: { name: "转发动态", type: "DYNAMIC_TYPE_FORWARD" },
//   DYNAMIC_TYPE_LIVE_RCMD: { name: "直播动态", type: "DYNAMIC_TYPE_LIVE_RCMD" },
// };

const BiliDynamicApiUrl = "https://api.bilibili.com/x/polymer/web-dynamic/v1/feed/space";
// const BiliUserInfoApiUrl = "https://api.bilibili.com/x/space/acc/info"; // 用户信息接口加了Cookie校验，废弃了
const BiliDrawDynamicLinkUrl = "https://m.bilibili.com/dynamic/"; // 图文动态链接地址

const BiliReqHeaders = {
  'cookie': 'buvid3=39F176E2-F26B-B44F-D799-00E96DBC76C135058infoc; b_nut=1685714035; b_lsid=DD9E610C2_1887C62E35C; _uuid=85F3F279-EF8B-A17E-55BA-25CB1F53736B35554infoc; buvid_fp=883044596d94501e8c58bde015cc747d; buvid4=B2BAA4E9-6CFF-2441-B117-C4187B44DB5C36267-023060221-PFJkqvvsrkqub01LLGiv7Q%3D%3D',
  'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
  'accept-encoding': 'gzip, deflate, br',
  'accept-language': 'zh-CN,zh;q=0.9',
  'cache-control': 'max-age=0',
  'sec-ch-ua': '"Microsoft Edge";v="113", "Chromium";v="113", "Not-A.Brand";v="24"',
  'sec-ch-ua-mobile': '?0',
  'sec-ch-ua-platform': "Windows",
  'sec-fetch-dest': 'document',
  'sec-fetch-mode': 'navigate',
  'sec-fetch-site': 'none',
  'sec-fetch-user': '?1',
  'upgrade-insecure-requests': '1',
  'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/113.0.0.0 Safari/537.36 Edg/113.0.1774.50',
}

const BotHaveARest = 500; // 机器人每次发送间隔时间，腹泻式发送会不会不太妥？休息一下吧
const BiliApiRequestTimeInterval = 2000; // B站动态获取api间隔多久请求一次，别太快防止被拉黑

const DynamicPicCountLimit = 2; // 推送动态时，限制发送多少张图片
const DynamicContentLenLimit = 50; // 推送文字和图文动态时，限制字数是多少
const DynamicContentLineLimit = 3; // 推送文字和图文动态时，限制多少行文本

let nowPushDate = Date.now(); // 设置当前推送的开始时间
let pushTimeInterval = 10; // 推送间隔时间，单位：分钟

// 延长过期时间的定义
let DynamicPushTimeInterval = 60 * 60 * 1000; // 过期时间，单位：小时，默认一小时，范围[1,24]

// 初始化获取B站推送信息
async function initBiliPushJson() {
  if (fs.existsSync(_path + "/data/PushNews/PushBilibiliDynamic.json")) {
    PushBilibiliDynamic = JSON.parse(fs.readFileSync(_path + "/data/PushNews/PushBilibiliDynamic.json", "utf8"));
  } else {
    savePushJson();
  }

  if (fs.existsSync(_path + "/data/PushNews/BilibiliPushConfig.json")) {
    BilibiliPushConfig = JSON.parse(fs.readFileSync(_path + "/data/PushNews/BilibiliPushConfig.json", "utf8"));

    // 如果设置了过期时间
    let faultTime = Number(BilibiliPushConfig.dynamicPushFaultTime);
    let temp = DynamicPushTimeInterval;
    if (!isNaN(faultTime)) {
      temp = common.getRightTimeInterval(faultTime);
      temp = temp < 1 ? 1 : temp; // 兼容旧设置
      temp = temp > 24 ? 24 : temp; // 兼容旧设置
      temp = temp * 60 * 60 * 1000;
    }
    DynamicPushTimeInterval = temp; // 允许推送多久以前的动态

    // 如果设置了间隔时间
    let timeInter = Number(BilibiliPushConfig.dynamicPushTimeInterval);
    if (!isNaN(timeInter)) {
      pushTimeInterval = common.getRightTimeInterval(timeInter);
    }

  } else {
    BilibiliPushConfig = {
      allowPrivate: true,
    };
    saveConfigJson();
  }
}

initBiliPushJson(); // 初始化

// (开启|关闭)B站推送
export async function changeBilibiliPush(e) {
  // 是否允许使用这个功能
  if (!isAllowPushFunc(e)) {
    return false;
  }

  if (e.isGroup && !common.isGroupAdmin(e) && !e.isMaster) {
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
        isNewsPush: true, // 是否开启了推送
        allowPush: true, // 是否允许推送，不允许的话开启了推送也没用呢
        adminPerm: true, // 默认群聊时，仅管理员拥有权限，此状态为false时，连狗管理都没有权限，但是定时任务会推动态
        isGroup: e.isGroup || false,
        biliUserList: [{ uid: "401742377", name: "原神" }], // 默认推送原神B站
        pushTarget: pushID,
        pushTargetName: e.isGroup ? e.group_name : e.sender?.nickname,
      };
    } else {
      PushBilibiliDynamic[pushID].isNewsPush = true;
    }
    savePushJson();
    Bot.logger.mark(`开启B站动态推送:${pushID}`);
    e.reply(`B站动态推送开启了哦~\n每间隔${pushTimeInterval}分钟会自动检测一次有没有新动态\n如果有的话会自动发送动态内容到这里的~`);
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

// (开启|关闭|允许|禁止)群B站推送
export async function changeGroupBilibiliPush(e) {
  if (!e.isMaster) {
    return false;
  }

  let commands = e.msg.split("群B站推送");
  let command = commands[0];
  let groupID = commands[1].trim();

  if (!groupID) {
    e.reply(`群ID呢？我那么大个群ID呢？\n示例：${command}群B站推送 248635791`);
    return true;
  }
  if (isNaN(Number(groupID))) {
    e.reply(`${groupID} <- 你介可不是群ID吧？\n示例：${command}群B站推送 248635791`);
    return true;
  }

  let group = Bot.gl.get(Number(groupID));
  if (!group) {
    e.reply("我不在这个群里哦");
    return true;
  }
  // 没有开启过的话，那就给初始化一个
  if (!PushBilibiliDynamic[groupID]) {
    PushBilibiliDynamic[groupID] = {
      isNewsPush: true,
      allowPush: true,
      adminPerm: true,
      isGroup: true,
      biliUserList: [{ uid: "401742377", name: "原神" }], // 默认推送原神B站
      pushTarget: groupID,
      pushTargetName: group.group_name,
    };
  }

  switch (command) {
    case "开启":
    case "#开启":
      PushBilibiliDynamic[groupID].isNewsPush = true;
      break;
    case "关闭":
    case "#关闭":
      PushBilibiliDynamic[groupID].isNewsPush = false;
      break;
    case "允许":
    case "#允许":
      PushBilibiliDynamic[groupID].allowPush = true;
      break;
    case "禁止":
    case "#禁止":
      PushBilibiliDynamic[groupID].allowPush = false;
      break;
  }

  savePushJson();
  e.reply(`【${group.group_name}】设置${command}推送成功~`);

  return true;
}

// (允许|禁止)B站私聊推送
export async function changeBiliPushPrivatePermission(e) {
  if (!e.isMaster) {
    return false;
  }

  if (e.msg.indexOf("允许") > -1) {
    BilibiliPushConfig.allowPrivate = true;
  }
  if (e.msg.indexOf("禁止") > -1) {
    BilibiliPushConfig.allowPrivate = false;
  }

  e.reply("设置成功！");
  return true;
}

// (开启|关闭)B站推送群权限
export async function bilibiliPushPermission(e) {
  if (!e.isMaster) {
    return false;
  }

  let commands = e.msg.split("B站推送群权限");
  let command = commands[0];
  let groupID = commands[1].trim();
  let commAllList = ["all", "全部", "所有"];

  if (!groupID) {
    e.reply("群ID是必须的哦");
    return true;
  }

  if (commAllList.indexOf(groupID) > -1) {
    for (let key in PushBilibiliDynamic) {
      if (PushBilibiliDynamic[key].isGroup) {
        PushBilibiliDynamic[key].adminPerm = command === "开启";
      }
    }

    await savePushJson();
    e.reply(`好了，全${command}了(*^▽^*)`);
    return true;
  }

  if (isNaN(Number(groupID))) {
    e.reply(`${groupID} <- 你介可不是群ID吧？\n示例：${command}B站推送群权限 248635791`);
    return true;
  }

  let group = Bot.gl.get(Number(groupID));
  if (!group) {
    e.reply("我不在这个群里哦");
    return true;
  }

  // 这叫什么？扼杀在摇篮里？
  if (!PushBilibiliDynamic[groupID]) {
    PushBilibiliDynamic[groupID] = {
      isNewsPush: true,
      allowPush: true,
      adminPerm: true,
      isGroup: true,
      biliUserList: [{ uid: "401742377", name: "原神" }], // 默认推送原神B站
      pushTarget: groupID,
      pushTargetName: group.group_name,
    };
  }

  PushBilibiliDynamic[groupID].adminPerm = command === "开启";

  await savePushJson();
  e.reply(`【${group.group_name}】已${command}B站推送狗管理权限`);

  return true;
}

// 新增/删除B站动态推送UID
export async function updateBilibiliPush(e) {
  // 是否允许使用这个功能
  if (!isAllowPushFunc(e)) {
    return false;
  }

  if (e.isGroup && !common.isGroupAdmin(e) && !e.isMaster) {
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
    e.reply("你还妹在这里开启过B站动态推送呢");
    return true;
  }

  let msgList = e.msg.split("B站推送");
  const addComms = ["订阅", "添加", "新增", "增加", "#订阅", "#添加", "#新增", "#增加"];
  const delComms = ["删除", "移除", "去除", "取消", "#删除", "#移除", "#去除", "#取消"];

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

    // let url = `${BiliUserInfoApiUrl}?mid=${uid}&token=&platform=web&jsonp=jsonp`; // 用户信息接口废弃了
    let url = `${BiliDynamicApiUrl}?host_mid=${uid}`;
    const response = await fetch(url, { method: "get", headers: BiliReqHeaders });

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

    data = res?.data?.items || [];
    let preMsg = '';
    if (data.length === 0) {
      data.name = uid;
    } else {
      let dynamic = data[0];
      data.name = dynamic?.modules?.module_author?.name || uid;
    }

    PushBilibiliDynamic[pushID].biliUserList.push({ uid, name: data.name });
    savePushJson();
    e.reply(`${preMsg}添加成功~\n${data.name}：${uid}`);
  }

  return true;
}

// 返回当前聊天对象推送的B站用户列表
export async function getBilibiliPushUserList(e) {
  // 是否允许使用这个功能
  if (!isAllowPushFunc(e)) {
    return false;
  }

  if (e.msg.indexOf("群") > -1) {
    if (!e.isMaster) {
      return false;
    }

    let groupMap = Bot.gl;
    let groupList = [];

    for (let [groupID, groupObj] of groupMap) {
      groupID = "" + groupID;
      let info = PushBilibiliDynamic[groupID];
      if (!info) {
        groupList.push(`${groupObj.group_name}(${groupID})：未开启，允许使用`);
      } else {
        PushBilibiliDynamic[groupID].pushTargetName = groupObj.group_name;
        let tmp = PushBilibiliDynamic[groupID];
        groupList.push(
          `${groupObj.group_name}(${groupID})：${tmp.isNewsPush ? "已开启" : "已关闭"}，${tmp.adminPerm === false ? "无权限" : "有权限"}，${
            tmp.allowPush === false ? "禁止使用" : "允许使用"
          }`
        );
      }
    }

    e.reply(`B站推送各群使用情况：\n${groupList.join("\n")}`);

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

// 设置B站推送定时任务时间
export async function setBiliPushTimeInterval(e) {
  if (!e.isMaster) {
    return false;
  }

  let time = e.msg.split("B站推送时间")[1].trim();
  time = Number(time);

  if (time <= 0 || time >= 60) {
    e.reply("时间不能乱填哦\n时间单位：分钟，范围[1-60)\n示例：B站推送时间 10");
    return true;
  }

  BilibiliPushConfig.dynamicPushTimeInterval = time;
  await saveConfigJson();
  e.reply(`设置间隔时间 ${time}分钟 成功，重启后生效~\n请手动重启或者跟我说#重启`);

  return true;
}

// 设置B站推送过期时间，对，就直接从上面搬下来了，为什么这么懒？就这么懒！
export async function setBiliPushFaultTime(e) {
  if (!e.isMaster) {
    return false;
  }

  let time = e.msg.split("B站推送过期时间")[1].trim();
  time = Number(time);

  if (time < 1 || time > 24) {
    e.reply("时间不能乱填哦\n时间单位：小时，范围[1-24]\n示例：B站推送过期时间 1");
    return true;
  }

  BilibiliPushConfig.dynamicPushFaultTime = time;
  await saveConfigJson();
  e.reply(`设置过期时间 ${time}小时 成功，重启后生效~\n请手动重启或者跟我说#重启`);

  return true;
}

// (开启|关闭)B站转发推送
export async function changeBiliPushTransmit(e) {
  if (!isAllowPushFunc(e)) {
    return false;
  }
  if (e.isGroup && !common.isGroupAdmin(e) && !e.isMaster) {
    e.reply("哒咩，只有管理员和master可以操作哦");
    return true;
  }

  let pushID = "";
  if (e.isGroup) {
    pushID = e.group_id;
  } else {
    pushID = e.user_id;
  }
  let info = PushBilibiliDynamic[pushID];
  if (!info) {
    e.reply("你还妹在这里开启过B站动态推送呢");
    return true;
  }

  if (e.msg.indexOf("开启") > -1) {
    PushBilibiliDynamic[pushID].pushTransmit = true;
    e.reply("设置成功~转发的动态也会推送了哦");
  }
  if (e.msg.indexOf("关闭") > -1) {
    PushBilibiliDynamic[pushID].pushTransmit = false;
    e.reply("好的~不会推送转发的动态了哦");
  }

  await savePushJson();

  return true;
}

// 设置B站推送(默认|合并|图片)
export async function setBiliPushSendType(e) {
  if (!isAllowPushFunc(e)) {
    return false;
  }
  if (e.isGroup && !common.isGroupAdmin(e) && !e.isMaster) {
    e.reply("哒咩，只有管理员和master可以操作哦");
    return true;
  }

  let pushID = "";
  if (e.isGroup) {
    pushID = e.group_id;
  } else {
    pushID = e.user_id;
  }
  let info = PushBilibiliDynamic[pushID];
  if (!info) {
    e.reply("你还妹在这里开启过B站动态推送呢");
    return true;
  }

  let type = e.msg.substr(e.msg.length - 2);
  let typeCode = "";
  switch (type) {
    case "默认":
      typeCode = "default";
      break;
    case "合并":
      typeCode = "merge";
      break;
    case "图片":
      typeCode = "picture";
      break;
  }
  if (e.msg.indexOf("全局") > -1) {
    BilibiliPushConfig.sendType = typeCode;
    type = "全局" + type;
    await saveConfigJson();
  } else {
    PushBilibiliDynamic[pushID].sendType = typeCode;
    await savePushJson();
  }

  e.reply(`设置B站推送方式：【${type}】成功！`);

  return true;
}

// 推送定时任务
export async function pushScheduleJob(e = {}) {
  if (e.msg) return false; // 注释这一行，master就可以手动发起推送了
  if (e.msg && !e.isMaster) {
    return false;
  }
  
  // 没有任何人正在开启B站推送
  if (Object.keys(PushBilibiliDynamic).length === 0) {
    return true;
  }

  // 推送之前先初始化，拿到历史推送，但不能频繁去拿，为空的时候肯定要尝试去拿
  if (dynamicPushHistory.length === 0) {
    let temp = await redis.get("zhi:bilipush:history");
    if (!temp) {
      dynamicPushHistory = [];
    } else {
      dynamicPushHistory = JSON.parse(temp);
    }
  }

  Bot.logger.mark("zhi-plugin == B站动态定时推送");

  // 将上一次推送的动态全部合并到历史记录中
  let hisArr = new Set(dynamicPushHistory);
  for (let [userId, pushList] of nowDynamicPushList) {
    for (let msg of pushList) {
      hisArr.add(msg.id_str);
    }
  }
  dynamicPushHistory = [...hisArr]; // 重新赋值，这个时候dynamicPushHistory就是完整的历史推送了。
  await redis.set("zhi:bilipush:history", JSON.stringify(dynamicPushHistory), { EX: 24 * 60 * 60 }); // 仅存储一次，过期时间24小时

  nowPushDate = Date.now();
  nowDynamicPushList = new Map(); // 清空上次的推送列表

  let temp = PushBilibiliDynamic;
  for (let user in temp) {
    temp[user].pushTarget = user; // 保存推送QQ对象
    // 循环每个订阅了推送任务的QQ对象
    if (isAllowSchedulePush(temp[user])) {
      await pushDynamic(temp[user]);
    }
  }
}

// 定时任务是否给这个QQ对象推送B站动态
function isAllowSchedulePush(user) {
  if (botConfig.masterQQ.includes(Number(user.pushTarget))) return true; // 主人的命令就是一切！

  if (!user.isNewsPush) return false; // 不推那当然。。不推咯
  if (user.allowPush === false) return false; // 信息里边禁止使用推送功能了，那直接禁止
  if (!BilibiliPushConfig.allowPrivate && !user.isGroup) return false; // 禁止私聊推送并且不是群聊，直接禁止

  return true;
}

// 动态推送
async function pushDynamic(pushInfo) {
  let users = pushInfo.biliUserList;
  for (let i = 0; i < users.length; i++) {
    let biliUID = users[i].uid;

    // 请求这个B站用户动态之前，先看看刚刚有没有请求过这个B  站用户，有就不需要再请求了
    let lastPushList = nowDynamicPushList.get(biliUID);

    // 刚刚请求过了，不再请求
    if (lastPushList) {
      // 刚刚请求时候就没有可以推送的内容，跳过
      if (lastPushList.length === 0) {
        continue;
      }
      await sendDynamic(pushInfo, users[i], lastPushList);
      continue;
    }

    let url = `${BiliDynamicApiUrl}?host_mid=${biliUID}`;
    const response = await fetch(url, { method: "get", headers: BiliReqHeaders });

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

    let pushList = new Set(); // 满足时间要求的可推送动态列表

    // 获取可以推送的动态列表
    for (let val of data) {
      let author = val?.modules?.module_author || {};

      if (!author?.pub_ts) continue; // 没有推送时间，这属于数据有问题。。。跳过，下一个

      author.pub_ts = author.pub_ts * 1000;
      // 允许推送多早以前的动态，重要，超过了设定时间则不推
      if (nowPushDate - author.pub_ts > DynamicPushTimeInterval) {
        continue;
      }

      pushList.add(val);
    }

    pushList = rmDuplicatePushList([...pushList]); // 数据去重，确保不会重复推送
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

// 历史推送过的动态，这一轮不推
function rmDuplicatePushList(newList) {
  if (newList && newList.length === 0) return newList;
  return newList.filter((item) => {
    return !dynamicPushHistory.includes(item.id_str);
  });
}

// 发送动态内容
async function sendDynamic(info, biliUser, list) {
  let pushID = info.pushTarget;
  Bot.logger.mark(`B站动态推送[${pushID}]`);

  for (let val of list) {
    let msg = buildSendDynamic(biliUser, val, info);
    if (msg === "can't push transmit") {
      // 这不好在前边判断，只能放到这里了
      continue;
    }
    if (!msg) {
      Bot.logger.mark(`B站动态推送[${pushID}] - [${biliUser.name}]，推送失败，动态信息解析失败`);
      continue;
    }

    let sendType = getSendType(info);
    if (sendType === "merge") {
      msg = await common.replyMake(msg, info.isGroup, msg[0]);
    }

    if (info.isGroup) {
      Bot.pickGroup(pushID)
        .sendMsg(msg)
        .catch((err) => { // 推送失败，可能仅仅是某个群推送失败
          // dynamicPushFailed.set(pushID, val.id_str);
          pushAgain(pushID, msg);
        });
    } else {
      common.relpyPrivate(pushID, msg);
    }

    await common.sleep(BotHaveARest); // 休息一下，别一口气发一堆
  }

  return true;
}

// 群推送失败了，再推一次，再失败就算球了
async function pushAgain(groupId, msg) {
  await common.sleep(BotHaveARest);

  Bot.pickGroup(groupId)
  .sendMsg(msg)
  .catch((err) => {
    Bot.logger.mark(`群[${groupId}]推送失败：${err}`);
  });

  return true;
}

// 构建动态消息
function buildSendDynamic(biliUser, dynamic, info) {
  let desc, msg, pics;
  let title = `B站【${biliUser.name}】动态推送：\n`;

  // 以下对象结构参考米游社接口，接口在顶部定义了
  switch (dynamic.type) {
    case "DYNAMIC_TYPE_AV":
      desc = dynamic?.modules?.module_dynamic?.major?.archive;
      if (!desc) return;

      title = `B站【${biliUser.name}】视频动态推送：\n`;
      // 视频动态仅由标题、封面、链接组成
      msg = [title, desc.title, segment.image(desc.cover), resetLinkUrl(desc.jump_url)];

      return msg;
    case "DYNAMIC_TYPE_WORD":
      desc = dynamic?.modules?.module_dynamic?.desc;
      if (!desc) return;

      title = `B站【${biliUser.name}】动态推送：\n`;
      if (getSendType(info) != "default") {
        msg = [title, `${desc.text}\n`, `${BiliDrawDynamicLinkUrl}${dynamic.id_str}`];
      } else {
        msg = [title, `${dynamicContentLimit(desc.text)}\n`, `${BiliDrawDynamicLinkUrl}${dynamic.id_str}`];
      }

      return msg;
    case "DYNAMIC_TYPE_DRAW":
      desc = dynamic?.modules?.module_dynamic?.desc;
      pics = dynamic?.modules?.module_dynamic?.major?.draw?.items;
      if (!desc && !pics) return;

      pics = pics.map((item) => {
        return segment.image(item.src);
      });

      title = `B站【${biliUser.name}】图文动态推送：\n`;
      
      if (getSendType(info) != "default") {
        msg = [title, `${desc.text}\n`, ...pics, `${BiliDrawDynamicLinkUrl}${dynamic.id_str}`];
      } else {
        if (pics.length > DynamicPicCountLimit) pics.length = DynamicPicCountLimit; // 最多发DynamicPicCountLimit张图，不然要霸屏了
        // 图文动态由内容（经过删减避免过长）、图片、链接组成
        msg = [title, `${dynamicContentLimit(desc.text)}\n`, ...pics, `${BiliDrawDynamicLinkUrl}${dynamic.id_str}`];
      }

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

      title = `B站【${biliUser.name}】文章动态推送：\n`;
      // 专栏/文章动态由标题、图片、链接组成
      msg = [title, desc.title, ...pics, resetLinkUrl(desc.jump_url)];

      return msg;
    case "DYNAMIC_TYPE_FORWARD": // 转发的动态
      let pushTransmit = info.pushTransmit;
      if (!pushTransmit) return "can't push transmit";

      desc = dynamic?.modules?.module_dynamic?.desc;
      if (!desc) return;
      if (!dynamic.orig) return;

      let orig = buildSendDynamic(biliUser, dynamic.orig, info);
      if (orig && orig.length) {
        // 掐头去尾
        orig.shift();
        orig.pop();
      } else {
        return false;
      }

      title = `B站【${biliUser.name}】转发动态推送：\n`;
      
      if (getSendType(info) != "default") {
        msg = [
          title,
          `${desc.text}\n---以下为转发内容---\n`,
          ...orig,
          `${BiliDrawDynamicLinkUrl}${dynamic.id_str}`,
        ];
      } else {
        msg = [
          title,
          `${dynamicContentLimit(desc.text, 1, 15)}\n---以下为转发内容---\n`,
          ...orig,
          `${BiliDrawDynamicLinkUrl}${dynamic.id_str}`,
        ];
      }

      return msg;
    case "DYNAMIC_TYPE_LIVE_RCMD":
      desc = dynamic?.modules?.module_dynamic?.major?.live_rcmd?.content;
      if (!desc) return;

      desc = JSON.parse(desc);
      desc = desc?.live_play_info;
      if (!desc) return;

      title = `B站【${biliUser.name}】直播动态推送：\n`;
      // 直播动态由标题、封面、链接组成
      msg = [title, `${desc.title}\n`, segment.image(desc.cover), resetLinkUrl(desc.link)];

      return msg;
    default:
      Bot.logger.mark(`未处理的B站推送【${biliUser.name}】：${dynamic.type}`);
      return false;
  }
}

// 限制动态字数/行数，避免过长影响观感（霸屏）
function dynamicContentLimit(content, lineLimit, lenLimit) {
  content = content.split("\n");

  lenLimit = lenLimit || DynamicContentLenLimit;
  lineLimit = lineLimit || DynamicContentLineLimit;

  if (content.length > lineLimit) content.length = lineLimit;

  let contentLen = 0; // 内容总长度
  let outLen = false; // 溢出 flag
  for (let i = 0; i < content.length; i++) {
    let len = lenLimit - contentLen; // 这一段内容允许的最大长度

    if (outLen) {
      // 溢出了，后面的直接删掉
      content.splice(i--, 1);
      continue;
    }
    if (content[i].length > len) {
      content[i] = content[i].substr(0, len);
      content[i] = `${content[i]}...`;
      contentLen = lenLimit;
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

// 是否被禁用了B站推送功能
function isAllowPushFunc(e) {
  if (e.isMaster) return true; // master当然是做什么都可以咯

  let pushID = "";
  if (e.isGroup) {
    pushID = e.group_id;
  } else {
    // 私聊禁止使用哦
    if (!BilibiliPushConfig.allowPrivate) {
      return false;
    }
    pushID = e.user_id;
  }

  let info = PushBilibiliDynamic[pushID];
  if (!info) return true;

  if (info.isGroup && info.adminPerm === false) return false;

  // allowPush可能不存在，只在严格不等于false的时候才禁止
  if (info.allowPush === false) return false;

  return info.allowPush !== false;
}

// 判断当前不是默认推送方式
function getSendType(info) {
  if (BilibiliPushConfig.sendType && BilibiliPushConfig.sendType != "default") return BilibiliPushConfig.sendType;
  if (info.sendType) return info.sendType;
  return "default";
}

// 存储B站推送信息
async function savePushJson() {
  let path = _path + "/data/PushNews/PushBilibiliDynamic.json";
  fs.writeFileSync(path, JSON.stringify(PushBilibiliDynamic, "", "\t"));
}

// 存储B站推送配置信息
async function saveConfigJson() {
  let path = _path + "/data/PushNews/BilibiliPushConfig.json";
  fs.writeFileSync(path, JSON.stringify(BilibiliPushConfig, "", "\t"));
}
