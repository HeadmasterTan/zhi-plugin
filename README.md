# Zhi-Plugin说明

[Zhi-Plugin](https://github.com/HeadmasterTan/zhi-plugin)是一个[Yunzai-Bot](https://github.com/Le-niao/Yunzai-Bot)的插件，详细功能见[功能说明](https://github.com/HeadmasterTan/zhi-plugin/blob/main/功能说明.md)

## 依赖

- [Yunzai-Bot](https://github.com/Le-niao/Yunzai-Bot/tree/master)
  - 不是3.0版本，不是3.0版本，不是3.0版本

## 功能列表

可通过给机器人发送`白纸帮助`查看简单文档，功能详细说明见👉[功能说明](https://github.com/HeadmasterTan/zhi-plugin/blob/main/功能说明.md)

你要想直接啃代码也行，注释我基本上都标清楚了，有问题的话可以尝试自己解决哦🧐

- 随机回复
- B站动态推送
- 插件更新
- 原魔数据（开发中...）
- 帮助

## 安装与更新

推荐使用git进行安装，以方便后续升级。在BOT根目录夹打开终端，运行如下命令进行安装。

> 注：如果运行发现报错了，请检查一下当前Yunzai是否3.0版本（main分支），目前插件暂不支持Yunzai3.0版本
> 如果确实需要使用，请把Yunzai分支切换到master分支，具体操作：在Yunzai根目录执行`git checkout master`

```base
git clone https://github.com/HeadmasterTan/zhi-plugin.git ./plugins/zhi-plugin/

# 如果上面那条安装不了或者失败的话就用下面这条吧(不是两条都执行、不是两条都执行、不是两条都执行)

git clone https://gitee.com/headmastertan/zhi-plugin.git ./plugins/zhi-plugin/
```

如需更新，在BOT文件夹根目录打开终端，运行如下指令。或者给机器人发送`白纸更新`（失败了就多试几次吧，玩坏了就重新下载吧🤣）

```
git -C ./plugins/zhi-plugin/ pull
```