# 宋明卓 / Mingzhuo Song

个人主页：mingzhuosong.net。GitHub 用户：misong2002。

**手稿在本地转换成 LaTeX 并编译为 PDF；网站只发布确认后的 PDF。**

## 本地手稿工作流

双击 `Manuscript-to-PDF.cmd`，输入图片目录和标题。也可把图片或文件夹拖到此文件上。

完整操作见 [LOCAL-WORKFLOW.md](LOCAL-WORKFLOW.md)。

```powershell
node scripts/manuscript.mjs run "E:\personalpage\my-scans" --name qft-ch01 --title "量子场论第一章"
node scripts/manuscript.mjs compile qft-ch01
node scripts/manuscript.mjs publish qft-ch01 --slug qft-ch01 --title-en "Quantum Field Theory - Chapter 1" --confirm
```

第一次处理会调用 DeepSeek API 转录与校对。编辑 `manuscript-private/qft-ch01/main.tex` 后，`compile` 使用本机 XeLaTeX，不调用 API。`publish` 只把当前 PDF 和标题加入 `pdfs/`，不会上传 GitHub。

`manuscript-private/`、原图、校对记录与 `.env` 均被 Git 忽略。旧的 `ingest/` 浏览器工具和 `books/qft/` 示例保留为历史代码，不参与当前网站构建。

## 网站构建和预览

```powershell
$env:QUARTO_PATH = 'E:\personalpage\.tools\bin\quarto.cmd'
node scripts/build.mjs
node scripts/serve.mjs
```

打开 http://127.0.0.1:4173/。PDF 目录来自 `pdfs/catalog.json`，构建时自动生成中英文及日文目录。发布目录为 `_site/`，不包含 LaTeX 或手稿工具。

## 手动修改网页文字

| 文字位置 | 中文源文件 | 英文源文件 |
| --- | --- | --- |
| 首页姓名、主问题、短介绍、讲义卡片 | `index.qmd` | `en/index.qmd` |
| 完整研究介绍（首页和关于页共用） | `_includes/bio-zh.qmd` | `_includes/bio-en.qmd` |
| 关于页其他文字 | `about.qmd` | `en/about.qmd` |
| PDF 目录说明 | `notes.qmd` | `en/notes.qmd` |

日文页面位于 `ja/`。导航和页脚在 `_quarto.yml`，导航翻译在 `assets/languages.js`。PDF 标题在 `pdfs/catalog.json`。

保存后运行 `node scripts/build.mjs` 并刷新浏览器。`_site/` 是自动生成的，不要直接修改。

## 更新线上网站

仓库已连接到 [misong2002/personalpage](https://github.com/misong2002/personalpage)，GitHub Pages 使用 GitHub Actions 自动部署，域名为 `mingzhuosong.net`。

修改网页文字或确认发布 PDF 后，在项目目录执行：

```powershell
git add .
git commit -m "Update website"
git push
```

推送后在仓库 Actions 页面查看构建和部署结果，成功后访问域名检查更新。仅在本地保存文件或构建不会更新公网网站。

GitHub 账号已完成域名所有权验证，请保留 Cloudflare 中的 `_github-pages-challenge-misong2002` TXT 记录。仓库 Pages → Custom domain 已设置 `mingzhuosong.net`。

Cloudflare DNS（DNS only）：

| 类型 | 名称 | 内容 |
| --- | --- | --- |
| A | @ | 185.199.108.153 |
| A | @ | 185.199.109.153 |
| A | @ | 185.199.110.153 |
| A | @ | 185.199.111.153 |
| CNAME | www | misong2002.github.io |

DNS 与证书准备好后，勾选 Enforce HTTPS。推送 main 后自动构建发布；PR 仅检查构建。

## 验证

`node --test workflow/latex.test.mjs` 验证 LaTeX 检查、标题转义、PDF 导出和过期 PDF 拦截。
