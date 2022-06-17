import { getRandomApply, randomApply, addRandomApplyContext, delRandomApply, revertRandomApply } from "./apps/randomApply.js";
import { changeBilibiliPush, updateBilibiliPush, getBilibiliPushUserList, pushScheduleJob } from "./apps/bilibiliPush.js";
import { updateZhiPlugin } from "./apps/update.js";

import schedule from "node-schedule";

export {
  getRandomApply,
  randomApply,
  addRandomApplyContext,
  delRandomApply,
  revertRandomApply,
  changeBilibiliPush,
  updateBilibiliPush,
  getBilibiliPushUserList,
  pushScheduleJob,
  updateZhiPlugin,
};

let rule = {
  changeBilibiliPush: {
    reg: "^#*(开启|关闭)B站推送$",
    priority: 5,
    describe: "开启或关闭B站推送，默认推送原神动态",
  },
  updateBilibiliPush: {
    reg: "^#*(订阅|添加|增加|新增|删除|移除|去除)B站推送\\s*.*$",
    priority: 5,
    describe: "添加或删除B站推送UID"
  },
  getBilibiliPushUserList: {
    reg: "^#*B站推送列表$",
    priority: 5,
    describe: "返回当前聊天对象推送的B站用户列表"
  },
  pushScheduleJob: {
    reg: "^#*测试B站推送$",
    priority: 5,
    describe: "测试B站推送"
  },
  updateZhiPlugin: {
    reg: "^#*更新白纸插件$",
    priority: 5,
    describe: "更新白纸插件",
  },
  getRandomApply: {
    reg: "noCheck",
    priority: 5000,
    describe: "回复添加的随机回复",
  },
  // 覆盖默认的添加表情行为
  randomApply: {
    reg: "^#*添加(.*)",
    priority: 5001,
    describe: "【添加哈哈】添加内容",
  },
  // revertRandomApply: {
  //   reg: "^#恢复表情(.*)",
  //   priority: 5001,
  //   describe: "【添加哈哈】添加内容",
  // },
  addRandomApplyContext: {
    reg: "noCheck",
    priority: 5002,
    describe: "添加随机回复上下文",
  },
  delRandomApply: {
    reg: "^#*删除(.*)$",
    priority: 5003,
    describe: "【删除哈哈】删除添加的内容",
  },
};

// 定时任务
async function task() {
  // B站动态推送
  // Cron表达式，具体百度。每到[5,15,25,35,45,55]分钟执行一次
  schedule.scheduleJob("0 5,15,25,35,45,55 * * * ?", () => YunzaiApps['plugin_zhi-plugin'].pushScheduleJob());
}

task();

console.log("白纸插件初始化完成~");

export { rule };
