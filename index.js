import { getRandomApply, randomApply, addRandomApplyContext, delRandomApply } from "./apps/randomApply.js";
export { getRandomApply, randomApply, addRandomApplyContext, delRandomApply };

let rule = {
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

console.log("白纸插件初始化完成~");

export { rule };
