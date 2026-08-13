# 逆天言论HUB
> [!NOTE]
> 注意此仓库纯属娱乐，请勿上升到人身攻击

> [!TIP]
> 建议多贡献点图片

# 这是什么
这个是一个阿清创建的收集群里的一些言论/表情包的存放仓库，以方便查看黑历史

# 🌐 在线网站
> 部署在 GitHub Pages，地址：`https://ChenRay-team.github.io/Outrageous-statement-Hub/site/`

在线网站提供：
- **📸 图库预览**：浏览仓库里全部图片（按目录分类）
- **⬆️ 快捷上传**：登录 GitHub 后直接选图提交，自动推送到仓库并触发打包发布到 Releases
- **💬 评论区**：登录 GitHub 后可以吐槽、留言

> [!IMPORTANT]
> 登录功能需要 **OAuth 代理（Cloudflare Worker）**：由于 GitHub 设备流接口不支持跨域（CORS），纯 Pages 网站无法直接登录。请按下方说明部署 `oauth-worker/worker.js` 到 Cloudflare Workers，把生成的 Worker 地址填到 `site/app.js` 顶部的 `OAUTH_PROXY`。

### 🔐 部署 OAuth 代理（Cloudflare Worker）
1. 注册 [Cloudflare](https://dash.cloudflare.com)（免费）
2. 打开 **Workers & Pages** → **Create application** → **Worker** → 创建
3. 把 `oauth-worker/worker.js` 的代码粘贴进编辑器，保存并部署
4. 部署后你会得到一个 Worker 地址，形如 `https://xxx.workers.dev`
5. 把该地址填到 `site/app.js` 顶部的 `OAUTH_PROXY` 常量（需重新提交推送）

> 设备流换 token 只用 `client_id`（不需要 `client_secret`），所以 Worker 里不用存任何密钥，可放心部署。

# 如何提交逆天发言
1. 表情包和群友集体发言直接放在仓库**根目录**即可
2. 根据你要提交者的名字放入相应的文件夹中,如果没有可以创建
3. 图片的命名请不要使用杂乱的名称
4. 图片文件命名建议使用简短的文字概括
5. 不要提交不相关的图片内容
6. 如果 PR 数大于 5 ，可以开 issue 要贡献者权限
# 可以用来做什么
1. 可以随便的发在群里面，帮助群友回忆黑历史
# 许可证
本仓库采用[逆天言论HUB 许可证](LICENSE)：
- 允许：群里随便发、互相调侃、转发传播、贡献图片
- 禁止：商业使用、人身攻击、断章取义、冒充来源
- 被记录者不想被收录？提出来，管理员会尽快移除
# 特别鸣谢
此项目受到[EasyBotHUB](https://github.com/easybot-team/EasybotHUB)启发而创建
