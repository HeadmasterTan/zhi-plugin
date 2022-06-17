import { exec } from "child_process";

const _path = process.cwd();

// 更新插件内容
export async function updateZhiPlugin(e = {}) {
  if (!e.isMaster) {
    e.reply("哒咩，你可不是老娘的master");
    return true;
  }
  
  let command = "git  pull";
  e.reply("马上给你更新，稍等一下");
  
  exec(command, { cwd: `${_path}/plugins/zhi-plugin/` }, function (error, stdout, stderr) {
    if (/Already up[ -]to[ -]date/.test(stdout)) {
      e.reply("啊这，没有可以更新的内容呢");
      return true;
    }
    if (error) {
      e.reply(`更新失败了呜呜呜\nError code: ${error.code}\n等会再试试吧`);
      // e.reply("更新失败！\nError code: " + error.code + "\n" + error.stack + "\n 请稍后重试。");
      return true;
    }
    e.reply("更新完成！请发送 #重启 或者手动重启吧~");
  });

  return true;
}