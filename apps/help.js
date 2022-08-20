import fs from "fs";
import { segment } from "oicq";
import { isV3 } from "../components/common.js";

// 我又双叒叕抄了喵喵的代码咩哈哈哈，嗯？我又不盈利，没什么可耻的哼！

const _path = process.cwd();
const helpPath = `${_path}/plugins/zhi-plugin/resources/help`;

let helpList = [];
if (fs.existsSync(helpPath + "/index.json")) {
  helpList = JSON.parse(fs.readFileSync(helpPath + "/index.json", "utf8")) || [];
}

export async function help(e, { render }) {
  if (helpList.length === 0) {
    e.reply("不知道为什么，帮助文档不见了！");
    return false;
  }

  let helpGroup = [];
  helpList.forEach((group) => {
    if (group.auth && group.auth === "master" && !e.isMaster) {
      return;
    }

    helpGroup.push(group);
  });

  return renderFunc("help/index", { helpGroup }, { e, render });
}

const renderFunc = async function (path, params, cfg) {
  let paths = path.split("/");
  let { render, e } = cfg;
  let base64 = await render(paths[0], paths[1], {
    ...params,
  });

  let ret = true;
  if (base64) {
    ret = isV3 ? await e.reply(base64) : await e.reply(segment.image(`base64://${base64}`));
  }
  return cfg.retMsgId ? ret : true;
};