# Poetry Gallery · 云端存档

现有仓库 `tasconyeric-slack/Poetry_Gallery`，站点 https://shici.byliyz.com/，Vercel `shici-archive`，Cloudflare Worker `poetry-gallery-api`，D1 `poetry-gallery-d1`（`6f92588b-0a92-41c6-ad43-ae014f6112fe`）。本次范围是写入、私有草稿、版本归档、发布、撤回、图片及备份恢复。视频/MV 暂停，Passkey/SMS/Supabase/多用户登录不在范围内。

## 使用与保存

在编辑器写诗或导入后，本机草稿立即保存在设备上；网络失败时保留本机修改。清理浏览器数据会丢失本机草稿，请定期导出。作者令牌只保存在当前页面内存，刷新/退出即清除。令牌必须是至少 64 位随机十六进制字符，不要粘贴到聊天、GitHub、URL 或本地配置文件。

解锁后可保存私有云端草稿，重新读取、修改、发布或撤回。保存失败和版本冲突不得显示成功或丢弃本机编辑。同一新草稿保持同一 UUID localId，首次提交响应丢失后重试不会创建重复作品。已有作品更新必须提交当前 version。封面上传同样检查并递增版本；恢复历史版本同时恢复历史封面。删除必须明确确认并提交当前版本，会删除作品、封面和修订历史，请先备份。

未授权只能访问已发布列表、详情和当前封面。撤回后，链接和封面 API 都返回 404；已下载到他人设备的副本无法追回。未配置或无效的生产 Owner Secret 会明确拒绝私有读写，不会降级为匿名写入。

## 唯一后端与前端协作

规范路线：浏览器直接调用 `https://poetry-gallery-api.tasconyeric.workers.dev`。兼容 `/api/poetry` 转发到同一 Worker，只转发调用者的 Authorization，绝不注入服务器令牌。`POETRY_WORKER_URL`、`POETRY_GATEWAY_KEY` 不再作为依赖，已有无关 Secret 不删除。`/api/config` 从 Worker health 读取实际准备状态。

Task A 修后端，Task B 独立 PR 交付编辑器/上传/微信分享。上传必须携带 version，删除必须提交 `{id,version,confirm:true}`；最终前端发布须先集成 B 的适配并通过浏览器闭环。具体契约见 AGENTS.md。

## 私有备份与恢复

**导出完整备份** 包含全部草稿/公开作品、版本历史和所有封面字节。另行导出本机草稿以保留未同步编辑。备份是私有数据，请安全保存。

Node 24+ 本地恢复（不会连接生产）：

```bash
node scripts/restore-archive.mjs private/archive.private.json --local private/recovery.sqlite
```

工具用事务恢复全部记录，拒绝已有 ID、无效版本以及缺失的当前/历史封面；失败时不改原有数据库。恢复文件需检查后，再另行审批生产恢复。旧 `import-poems.mjs` 只是作品数组导入，不是完整历史恢复；本次生产发布不使用它。

## 本地验证

```bash
node --check worker/index.js
node scripts/smoke.mjs
node scripts/mvp-check.mjs
node scripts/worker.test.mjs
node scripts/config.test.mjs
node scripts/import-poems.test.mjs
node scripts/d1-lifecycle.test.mjs
node scripts/cloud-regression.test.mjs
npx wrangler@4.158.0 d1 migrations apply poetry-gallery-d1 --local
```

实际 workerd/D1 回归：本地开发使用合成测试凭据，可通过 Wrangler 的本地 secret binding 配置；不要使用生产令牌或将其写入 `.dev.vars`。启动 `npx wrangler@4.158.0 dev --local --port 8788 --ip 127.0.0.1`，在另一个 Git Bash 中：

```bash
POETRY_LOCAL_WORKER_URL=http://127.0.0.1:8788 node scripts/cloud-regression.test.mjs
```

本地测试的所有写入仅发生在本机，脚本拒绝非 loopback 地址。迁移按 D1 的 d1_migrations 记录跳过已执行项；0002/0003 的 ALTER 不能手工重复执行 SQL。浏览器测试仍需在 Task B 集成后完成。视频测试不属于此次发布检查。

## 生产发布

生产迁移、Secret 和最终合并/部署分别等待确认。先核对绑定和迁移表，导出备份并在本地验证，再应用现有前向 0003；不得重建/清空生产库或导入测试作品。完整命令、已核实状态及待验收项见 [云端发布记录](docs/CLOUD_RELEASE.md)。Vercel Git 部署只更新前端，不会自动部署 Worker 或迁移 D1。

发布后的必要线上验证先做只读/拒绝测试。真实保存→发布→撤回→备份恢复闭环需要作者操作或单独批准的生产测试写入，未经授权不写入作品。微信真机长按、原生分享和 webview 行为由最终集成验收记录明确区分。

## Issue21 reference reconstruction

See [reference matrix](docs/CLONE_REFERENCE_MATRIX.md), [visual results/screenshots](docs/CLONE_VISUAL_RESULTS.md), [interaction evidence](docs/CLONE_INTERACTIONS.md) and [local/deploy instructions](docs/CLONE_RELEASE.md). Frontend includes focused writing, private library, collection management/order, favorites, typography, three PNG themes and full collection printing. Production migration0004 and Worker/frontend deployment remain separately approved steps.
