# Zhi-Plugin说明

[Zhi-Plugin](https://github.com/HeadmasterTan/zhi-plugin)是一个[Yunzai-Bot](https://github.com/Le-niao/Yunzai-Bot)的插件，详细功能见[功能说明](https://github.com/HeadmasterTan/zhi-plugin/blob/main/功能说明.md)

主要功能是B站动态推送（可以是任意UP）。

## 依赖/兼容

> 写在前面：插件升级兼容云崽V3，参考自[miao-plugin](https://github.com/yoimiya-kokomi/miao-plugin)，感谢喵喵作出的贡献！
> 
> 同时本插件的部分功能也有借鉴喵喵插件，再次感谢喵喵！😊

- [Yunzai-Bot](https://github.com/Le-niao/Yunzai-Bot/tree/master)
  - 目前已兼容云崽V2以及V3版本
  - 目前已兼容云崽V2以及V3版本
  - 目前已兼容云崽V2以及V3版本

- [yoimiya-kokomi/Yunzai-Bot](https://github.com/yoimiya-kokomi/Yunzai-Bot)
  - 兼容喵喵维护的云崽版本（喵喵真的好肝好肝。。。🥵）

## 功能列表

可通过给机器人发送`白纸帮助`查看简单文档，功能详细说明见👉[功能说明](https://github.com/HeadmasterTan/zhi-plugin/blob/main/功能说明.md)

你要想直接啃代码也行，注释我基本上都标清楚了，有问题的话可以尝试自己解决哦🧐

> 注意：
> 
> 取消了 `添加B站推送` 和 `删除B站推送` 这两个命令，取而代之的是 `订阅B站推送` 和 `取消B站推送`，目的是为了防止和添加表情的命令冲突
> 
> 表情功能`添加 XX`更改为`#添加 XX`，`删除 XX`更改为`#删除 XX`，目的也是为了防止命令冲突

- 随机回复
- B站动态推送
- 插件更新
- 帮助

## 安装与更新

推荐使用git进行安装，以方便后续升级。在BOT根目录夹打开终端，运行如下命令进行安装。

```base
git clone https://github.com/HeadmasterTan/zhi-plugin.git ./plugins/zhi-plugin/

# 如果上面那条安装不了或者失败的话就用下面这条吧(不是两条都执行、不是两条都执行、不是两条都执行)

git clone https://gitee.com/headmastertan/zhi-plugin.git ./plugins/zhi-plugin/
```

如需更新，在BOT文件夹根目录打开终端，运行如下指令。或者给机器人发送`白纸更新`（失败了就多试几次吧，玩坏了就重新下载吧🤣）

> 如果你正在使用云崽V2，可以在Yunzai-Bot根目录下直接执行命令`git checkout main`切换到V3版本，记得切换后还需要按照V3版本进行`pnpm install`哦

```
git -C ./plugins/zhi-plugin/ pull
```

## 免责声明

功能仅限内部交流与小范围使用（学习、参考、移植都没问题，不用征得我意见~），请勿将本插件用于以盈利为目的的场景（叠甲当然是有必要的~）