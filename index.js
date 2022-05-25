import { getRandomApply, randomApply, addRandomApplyContext } from "./apps/randomApply.js";
export { getRandomApply, randomApply, addRandomApplyContext };

let rule = {
  getRandomApply: {
    reg: "noCheck",
    priority: 50,
    describe: "回复添加的随机回复",
  },
  // 覆盖默认的添加表情行为
  randomApply: {
    reg: "^#*添加(.*)",
    priority: 51,
    describe: "【添加哈哈】添加内容",
  },
  addRandomApplyContext: {
    reg: "noCheck",
    priority: 52,
    describe: "添加随机回复上下文",
  },
};

console.log("白纸插件初始化完成~");

export { rule };
