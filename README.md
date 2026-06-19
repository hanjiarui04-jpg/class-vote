# 班干部扫码匿名投票系统

一个可直接部署的 React + Vite 单页应用。前端托管在 Vercel，名单、选票和统计存放在 Supabase；不需要自建服务器，也不要求投票人登录。

## 已实现

- `/`：手机优先的三步投票（评分 → 标签 → 匿名评论）
- `/share`：根据当前部署地址生成二维码、复制链接、下载 PNG
- `/admin`：密码登录、平均分、人数、标签统计和评论列表
- 首次访问生成 UUID 并写入 `localStorage`
- Supabase RPC 原子提交整张选票，并在数据库再次拦截同一 UUID
- RLS 开启；浏览器不能直接读取或写入评论表
- 未配置 Supabase 时自动使用演示数据，方便本地预览

## 本地运行

要求 Node.js 18 或更高版本。

```bash
npm install
cp .env.example .env.local
npm run dev
```

如果暂时不填写 `.env.local`，页面会以演示模式运行。演示模式投票成功后如需重测，在浏览器开发者工具中清除该站点的 Local Storage。

## 配置 Supabase

1. 在 [Supabase](https://supabase.com/dashboard) 创建免费项目。面向中国大陆用户时，优先选择 Singapore 区域，并在目标校园网、移动和联通网络上实测。
2. 打开项目的 **SQL Editor**，复制并执行 [`supabase/schema.sql`](./supabase/schema.sql)。它会创建表、索引、RLS、两个 RPC 和 11 条班干部数据。
3. 在 **Project Settings → API** 复制 Project URL 与 anon/publishable key。
4. 创建 `.env.local`：

```env
VITE_SUPABASE_URL=https://你的项目.supabase.co
VITE_SUPABASE_ANON_KEY=你的匿名公钥
```

不要把 `service_role` key 写入前端。Vite 中以 `VITE_` 开头的变量会打包到浏览器；这里只能使用允许公开的 anon/publishable key，真正的数据权限由 RLS 和 RPC 控制。

### 数据结构

PostgreSQL 使用 snake_case，和需求字段对应如下：

| 表 | 字段 |
| --- | --- |
| `officers` | `id`, `name`, `role`, `sort_order` |
| `reviews` | `id`, `officer_id`, `score`, `tags`, `comment`, `anonymous_id`, `created_at` |

`reviews` 对 `(officer_id, anonymous_id)` 有唯一约束；`submit_ballot` 还会先检查该 `anonymous_id` 是否已有任何记录，因此同一个匿名身份只能提交一整张选票。

### 修改名单与管理员密码

- 名单：在 Supabase 的 Table Editor 中编辑 `officers`；保持 `sort_order` 唯一且连续体验最好。
- 密码：在 `schema.sql` 的 `get_admin_dashboard` 函数中修改密码，再单独执行该 `create or replace function` 语句。不要在登录页面公开显示密码。

当前的简单共享密码符合原始需求，但不等同于真正的管理员身份系统。若用于敏感或正式评议，建议升级为 Supabase Auth + 管理员角色，不在浏览器中传共享密码。

## 部署到 Vercel

1. 将项目推送到 GitHub、GitLab 或 Bitbucket。
2. 在 [Vercel](https://vercel.com/new) 中 Import 项目；框架会自动识别为 Vite。
3. 在项目 **Settings → Environment Variables** 添加：
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. 点击 Deploy。构建命令为 `npm run build`，输出目录为 `dist`。
5. 打开部署后的 `/share`，下载指向正式域名的二维码。

仓库中的 `vercel.json` 已把所有路径重写到 `index.html`，因此刷新 `/admin` 或 `/share` 不会 404。修改环境变量后需要重新部署，Vite 才会把新值写入前端构建。

## 关于“国内可访问”

这套架构没有使用 Google Fonts、国外图片或第三方前端 CDN，能减少额外跨境依赖；选择 Supabase Singapore 区域，并给 Vercel 绑定自己的域名，通常比默认配置更稳。

但应明确：Vercel 官方说明其在中国大陆没有服务器或 CDN 节点，因此免费 Vercel + Supabase 不能承诺中国大陆稳定性或 SLA。正式发给全班前，请至少用校园网、中国移动和中国联通各测试一次；如果必须保证境内稳定访问，需要考虑已备案域名与中国大陆云托管，这将不再是“Vercel 全免费”方案。

参考：[Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security)、[Supabase Database Functions](https://supabase.com/docs/guides/database/functions)、[Vite on Vercel](https://vercel.com/docs/frameworks/frontend/vite)、[Vercel 中国大陆访问说明](https://vercel.com/kb/guide/accessing-vercel-hosted-sites-from-mainland-china)。

## 生产前检查

```bash
npm run lint
npm run build
```

然后用真实部署域名完成一次投票，检查 Supabase 的 `reviews` 表是否新增 11 条记录，再验证同一浏览器无法重复提交。
