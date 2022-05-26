import { segment } from "oicq";
import fs from "fs";
import lodash from "lodash";

const _path = process.cwd();

if (!fs.existsSync(`${_path}/data/randomApply/`)) {
  fs.mkdirSync(`${_path}/data/randomApply/`);
}

const JSON_PATH = `${_path}/data/randomApply/randomApply.json`;
const BAKE_JSON_PATH = `${_path}/data/randomApply/randomApply_bake.json`;
let context = {}; // 随机回复上下文
let textArr = {};
let bakeTextArr = {};
let contextTimer = {};
getTextData();

// 应对随机回复
export async function getRandomApply(e) {
  if (!e.message) {
    return;
  }
  if (context[e.user_id]) {
    // 当前正在添加随机回复
    return;
  }
  if (textArr.size <= 0) {
    // 随机回复列表中没有数据
    return false;
  }

  // 提取关键词
  let key = e.toString().replace(/#|＃/g, "");
  key = key.replace(`{at:${BotConfig.account.qq}}`, "").trim();

  let text = textArr.get(key); // 获取关键词对应的回复列表
  if (textArr && text) {
    let sendMsg = [];
    text = text[Math.floor(Math.random() * text.length)]; // 随机回复其中的一条

    for (let val of text) {
      // 避免风控。。
      if (val.type == "image") {
        let tmp = segment.image(val.url);
        tmp.asface = val.asface;
        sendMsg.push(tmp);
      } else if (val.type == "at") {
        let tmp = segment.at(val.qq);
        sendMsg.push(tmp);
      } else {
        sendMsg.push(val);
      }
    }
    e.reply(sendMsg);
    return true;
  }

  return false;
}

// 添加随机回复
export async function randomApply(e) {
  if (!e.message) {
    return false;
  }

  let name = lodash.truncate(e.sender.card, { length: 8 });

  let Msg = [];
  let head;
  for (let val of e.message) {
    if (val.type == "text" && /^[#|\s|\r]*添加(.*)/g.test(val.text)) {
      val.isAdd = true;
      val.text = val.text.replace(/#|＃|图片|表情|添加|删除|列表/g, "");
      head = val;
    } else {
      if (val.type == "at") {
        if (val.qq == BotConfig.account.qq) {
          continue;
        }
        delete val.text;
      }
      Msg.push(val);
    }
  }
  Msg.unshift(head);

  if (!Msg[0] || Msg[0].type != "text" || !Msg[0].isAdd || (Msg.length == 1 && !Msg[0].text)) {
    return;
  }

  // 关键词后携带图片的，直接添加图片
  if (Msg.length == 2 && Msg[1].type == "image" && Msg[0].text) {
    let msgList = textArr.get(Msg[0].text.trim()) || [];
    msgList.push([Msg[1]]);

    textArr.set(Msg[0].text.trim(), msgList);
    let name = lodash.truncate(e.sender.card, { length: 8 });
    e.reply([segment.at(e.user_id, name), "\n添加成功：", Msg[0].text.trim()]);
    Bot.logger.mark(`[${e.sender.nickname}(${e.user_id})] 添加成功:${Msg[0].text.trim()}`);

    let obj = {};
    for (let [k, v] of textArr) {
      obj[k] = v;
    }

    fs.writeFileSync(JSON_PATH, JSON.stringify(obj, "", "\t"));
    return true;
  }

  var re = new RegExp("{at:" + BotConfig.account.qq + "}", "g");

  // 上下文添加
  context[e.user_id] = {
    text: e
      .toString()
      .replace(re, "")
      .replace(/#|＃|图片|表情|添加|删除|列表/g, "")
      .trim(),
    msg: Msg,
  };

  Bot.logger.mark(`[${e.group_name}] 添加:${context[e.user_id].text}`);
  e.reply([segment.at(e.user_id, name), ` 请发送内容`]);

  contextTimer[e.user_id] = setTimeout(() => {
    if (context[e.user_id]) {
      delete context[e.user_id];
      e.reply([segment.at(e.user_id, name), ` 添加已取消`]);
    }
  }, 120000);

  return true;
}

// 将上下文设置为随机回复
export async function addRandomApplyContext(e) {
  if (!context[e.user_id] || !e.message) {
    return;
  }
  let name = lodash.truncate(e.sender.card, { length: 8 });

  // 添加消息处理
  for (let i in e.message) {
    if (e.message[i].type == "at") {
      if (e.message[i].qq == BotConfig.account.qq) {
        e.reply([segment.at(e.user_id, name), " 不要@我啦，再给你一次机会哦"]);
        return true;
      }
      e.message[i].text = e.message[i].text.replace(/^@/, "");
    }
  }

  let msgList = textArr.get(context[e.user_id].text.trim()) || [];
  let isExist = false
  msgList.forEach(function(item) {
    if (JSON.stringify(item) === JSON.stringify(e.message)) {
      isExist = true
    }
  })
  if (!isExist) {
    msgList.push(e.message);
  }

  textArr.set(context[e.user_id].text.trim(), msgList);
  e.reply([segment.at(e.user_id, name), "\n添加成功：", ...context[e.user_id].msg]);
  Bot.logger.mark(`[${e.sender.nickname}(${e.user_id})] 添加成功:${context[e.user_id].text}`);

  clearTimeout(contextTimer[e.user_id]);
  delete context[e.user_id];
  delete contextTimer[e.user_id];

  let obj = {};
  for (let [k, v] of textArr) {
    obj[k] = v;
  }

  fs.writeFileSync(JSON_PATH, JSON.stringify(obj, "", "\t"));

  return true;
}

// 删除表情
export async function delRandomApply(e) {
  var re = new RegExp("{at:" + BotConfig.account.qq + "}", "g");

  let msg = e
    .toString()
    .replace(re, "")
    .replace(/#|＃|图片|表情|添加|删除|列表/g, "")
    .trim();

  if (!msg) {
    return false;
  }

  if (e.groupConfig.imgAddLimit == 2) {
    if (!e.isMaster) {
      e.reply(`只有主人才能删除`);
      return true;
    }
  }

  if (e.groupConfig.imgAddLimit == 1 && !e.isMaster) {
    if (e.isGroup && !e.member.is_admin) {
      e.reply(`只有管理员才能删除`);
      return true;
    }
  }

  let index = getIndex(msg);
  // 指定序号删除
  if (index > -1) {
    msg = msg.split(" ");
    msg.pop();
    msg = msg.join(" ").trimEnd(); // 保不准这个表情中间真的有空格
  }

  let tempArr = textArr.get(msg);
  if (tempArr) {
    if (index > -1) {
      if (index > tempArr.length) {
        return;
      }
      let delMsg = tempArr.splice(index - 1, 1)[0];

      if (tempArr.length === 0) {
        textArr.delete(msg);
      } else {
        textArr.set(msg, tempArr);
      }

      let sendMsg = [];
      for (let val of delMsg) {
        // 避免风控。。
        if (val.type == "image") {
          let tmp = segment.image(val.url);
          tmp.asface = val.asface;
          sendMsg.push(tmp);
        } else if (val.type == "at") {
          let tmp = segment.at(val.qq);
          sendMsg.push(tmp);
        } else {
          sendMsg.push(val);
        }
      }
      e.reply(["删除指定表情成功：\n", ...sendMsg]);
    } else {
      textArr.delete(msg);
      bakeRandomApply(msg, tempArr);
      e.reply("删除成功：" + msg);
    }

    let obj = {};
    for (let [k, v] of textArr) {
      obj[k] = v;
    }
    fs.writeFileSync(JSON_PATH, JSON.stringify(obj, "", "\t"));
  } else {
    return;
  }

  Bot.logger.mark(`[${e.sender.nickname}(${e.user_id})] 删除成功:${msg}`);

  return true;
}

// 从备份中恢复
export async function revertRandomApply(e) {
  return true;
}

// 备份表情，只会在完整删除的时候备份，序号删除的时候不会备份
function bakeRandomApply(msg, arr) {
  bakeTextArr.set(msg, arr)
  
  let obj = {};
  for (let [k, v] of bakeTextArr) {
    obj[k] = v;
  }
  fs.writeFileSync(BAKE_JSON_PATH, JSON.stringify(obj, "", "\t"));
}

// 获取index，  index：是否删除指定index的表情
function getIndex(msg) {
  let arr = msg.split(" ");
  if (arr.length === 1) {
    return -1;
  }
  let index = Number(arr.pop());
  if (isNaN(index) || index < 1) {
    return -1;
  }

  return index;
}

// 获取随机回复列表
function getTextData() {
  textArr = new Map();
  bakeTextArr = new Map();

  if (!fs.existsSync(JSON_PATH)) {
    fs.writeFileSync(JSON_PATH, JSON.stringify({}, "", "\t"));
    return;
  }

  if (!fs.existsSync(BAKE_JSON_PATH)) {
    fs.writeFileSync(BAKE_JSON_PATH, JSON.stringify({}, "", "\t"));
    return;
  }

  let textJson = JSON.parse(fs.readFileSync(JSON_PATH, "utf8"));
  let bakeTextJson = JSON.parse(fs.readFileSync(BAKE_JSON_PATH, "utf8"));
  textArr = new Map(Object.entries(textJson));
  bakeTextArr = new Map(Object.entries(bakeTextJson));
}
