# 摸鱼短剧 · Codex 适配版

让 Codex 干活，自己在旁边刷一集。🎬

这是 **[frostming/dsh-hongguo](https://github.com/frostming/dsh-hongguo) 的 Codex MCP Apps 适配层**。原项目面向 DSH；本项目接上 Codex 的应用面板、媒体传输、观看进度和任务结束暂停。原播放器与片源后端来自上游，感谢 frostming 和 [openhongguo](https://github.com/beilunyang/openhongguo)。

本仓库只包含适配代码。安装时从原作者仓库拉取 [固定版本](https://github.com/frostming/dsh-hongguo/tree/043c675d5d9b0d70b3e317257ab940d79fc05282)，在你的电脑上构建播放器；上游源码与构建产物不在本仓库分发。

## 能做什么

- 在 Codex 的右侧应用标签页看短剧，聊天可以继续。
- 搜剧、选集、倍速、静音、连续播放。
- 本机保存观看进度，关掉面板后可以续播。
- 任务结束自动暂停；面板右上角可以关闭。

## 安装

准备好 **Node.js 22+、Git、ffmpeg、Codex CLI，以及支持 MCP Apps 的 Codex 桌面客户端**。本项目使用本地运行方式，不需要填写短剧账号或 OpenAI API Key；Codex 使用你自己的正常登录。

macOS 的 ffmpeg 可以用 `brew install ffmpeg` 安装；Windows 可以用 `winget install Gyan.FFmpeg`，安装后重新打开终端，让 `ffmpeg` 能在 PATH 中找到。Linux 使用发行版的 ffmpeg 包。

```sh
git clone https://github.com/Echoes0302/codex-hongguo.git
cd codex-hongguo
npm ci --ignore-scripts
npm run setup
npm run install:codex
```

安装脚本会自动定位你的 Node 和项目路径，生成本机配置，并注册 `codex-hongguo@hongguo-local`。请保留克隆下来的项目目录，运行时需要其中的文件。

然后在 Codex 开一个新聊天，按客户端提示审核这个插件的 **5 项任务状态 hooks**，说「打开摸鱼短剧」。如果已经开着的客户端没显示新插件，重开客户端后再试。

暂时没有「直接在插件市场点一下就装完」的版本，以上终端安装步骤需要执行一次。macOS 已实测；Windows/Linux 提供同样的安装脚本与 CI 检查，桌面客户端实际播放体验仍需在对应系统验证。

## 自动暂停怎么用

让 Codex 调用 `open_player` 时传入当前聊天的 `thread_id`，暂停就跟随这一条聊天。从不带参数的插件入口打开时，暂停跟随本机所有 Codex 任务的汇总状态。任务结束只会暂停，继续播放由你点击。

hooks 只记录会话 ID、运行状态和时间，不保存提示词、聊天正文或工具参数。它们不应阻止 Codex 工作，失败会直接退出。

## 数据与运行

- 本机数据：`~/.local/share/codex-hongguo/`。其中 `history.json` 是观看记录，`tasks/` 是任务状态，`dsh-hongguo/` 是匿名设备和视频/封面缓存。
- Codex 沙箱中的数据、封面与媒体通过 MCP 应用通道传输，视频分块后在面板内组合播放。首次开播需要等待本集加载。
- 单集最多 64 MiB；面板内存最多缓存 4 集视频，磁盘视频缓存沿用上游最近 40 集的策略。
- 片源来自第三方非官方接口，可用性由上游决定。内容版权归相应权利人，使用说明同时参见上游 README。

可以设置 `HONGGUO_DATA_DIR` 指定数据目录；开发时适合用一个独立临时目录。

## 更新与卸载

更新适配层：`git pull`，然后重新执行 `npm ci --ignore-scripts`、`npm run setup` 和 `npm run install:codex`。上游版本锁定在 `upstream.json`，不会静默跟随上游最新分支。

```sh
codex plugin remove codex-hongguo@hongguo-local
codex plugin marketplace remove hongguo-local
```

卸载插件会保留本机观看记录和缓存，确认需要时再自行删除数据目录。

## 开发与检查

```sh
npm test
npm run check:public
npm run smoke
```

`npm test` 检查多窗口历史合并、当前聊天隔离、安装路径与 hooks 的隐私边界。`npm run smoke` 会实际访问上游片源，检查 MCP、剧集与媒体分块；它需要联网与 ffmpeg。CI 不运行真实片源测试。

`node scripts/install.mjs --generate-only` 只生成本机插件配置，不改动 Codex 配置，适合检查安装产物。`node codex/smoke.mjs --keep-open` 可以保留独立开发预览，预览地址写入系统临时目录的 `codex-hongguo-preview-url`。

## 来源与许可

- 上游项目：[frostming/dsh-hongguo](https://github.com/frostming/dsh-hongguo)，固定 revision 记录在 `upstream.json`。
- 上游在本适配版本整理时没有声明 license。本仓库的 MIT 许可只覆盖这里独立编写的适配层，不对上游源码、播放器或媒体内容授予许可，也不表示本项目获得了原作者背书。
- 安装后拉取的上游文件、提取的播放器和打包产物都只生成在本机，并通过 `.gitignore` 排除。请不要把它们当作本项目的 MIT 源码重新打包分发。
- `openhongguo` 和其他 npm 依赖保留各自的许可；详情见 [THIRD-PARTY-NOTICES.md](THIRD-PARTY-NOTICES.md)。

Codex 适配：Echoes0302，使用 Vesper 协助完成。
