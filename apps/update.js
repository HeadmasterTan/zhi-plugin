import { createRequire } from "module";

const require = createRequire(import.meta.url);
const { exec } = require("child_process");

const _path = process.cwd();

// 更新插件内容
export async function updateZhiPlugin(e) {
  if (!e.isMaster) {
    e.reply("只有狗修金萨玛才能操作哦~");
    return true;
  }
  
  e.reply("开始尝试更新，请耐心等待~");
  command = `git pull`;
  exec(command, { cwd: `${_path}/plugins/zhi-plugin/` }, function (error, stdout, stderr) {
    if (/Already up to date/.test(stdout)) {
      e.reply("目前已经是最新了~");
      return true;
    }

    if (error) {
      e.reply("更新失败！请稍后重试。");
    } else {
      e.reply("更新成功~记得重启哦~");
    }
    return true;
  });

  return true; // 返回true 阻挡消息不再往下
}