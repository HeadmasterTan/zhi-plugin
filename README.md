# Zhi-Plugin说明

Zhi-Plugin是一个Yunzai-Bot的插件，覆盖了原本添加表情的命令，原命令只能添加单一回复和回复单一内容，本插件赋予了添加复数内容和回复随机内容的功能


## 使用说明

> xxx为任意内容
> 表情：可以是图片

- `添加xxx` 如：添加 哈哈
  - 指添加一个【哈哈】的表情
- `删除xxx` 如：删除 哈哈
  - 删除全部的哈哈表情
- `删除xxx(空格)序号` 如：删除 哈哈 3
  - 删除添加的第3个哈哈表情

## 安装与更新

- 直接将zhi-plugin放置在Yunzai-Bot的plugins目录下，重启Yunzai-Bot后即可使用。

或

推荐使用git进行安装，以方便后续升级。在BOT根目录夹打开终端，运行

```
git clone https://github.com/HeadmasterTan/zhi-plugin.git ./plugins/zhi-plugin/
```

进行安装。如需更新，在BOT文件夹根目录打开终端，运行

```
git -C ./plugins/zhi-plugin/ pull
```
