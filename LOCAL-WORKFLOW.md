# 本地手稿 → LaTeX → PDF

网站只维护确认发布的 PDF，保留现有个人主页和语言切换。手稿转换不需要浏览器或本地服务器。

## 最简单的使用方法

双击 `Manuscript-to-PDF.cmd`，输入图片目录和讲义标题；也可将图片或文件夹拖到该文件上。输入 `y` 后开始处理。

生成的内容位于 `manuscript-private/<任务名>/`：

```text
originals/          原图及顺序（SHA-256 在 metadata.json 中）
transcripts/        逐页原始识别响应和 LaTeX 正文
raw-transcript.tex  合并后的原始正文
main.tex            可手动编辑的唯一主稿
review.md           人类可读的原图复查报告
review.json         结构化校对记录
lint.json           机械检查结果
main.pdf            本地 XeLaTeX 编译结果
compile.log         编译日志
compilation.json    源稿和 PDF 的对应校验记录
```

这些文件已被 Git 忽略，不会加入公开网站。

## 命令行使用

在 `E:\personalpage` 的 PowerShell 中运行（把示例图片目录换成真实路径）：

```powershell
node scripts/manuscript.mjs run "E:\personalpage\my-scans" --name qft-ch01 --title "量子场论第一章"
```

图片按文件名中的数字自然排序。建议使用 `001.jpg`、`002.jpg`。一次最多 50 页，每页最多 8 MB。

`run` 完成原图归档、直接 LaTeX 转录、原图复查和两轮 XeLaTeX 编译。识别/复查每页调用两次 DeepSeek API，会将原图发送给服务商；后续编辑和编译可离线进行。

处理完成后，打开 `manuscript-private/qft-ch01/main.tex` 修改文字和公式，并对照 `originals/` 与 `review.md` 校对。报告只提出建议，不会自动改写主稿。

修改后重新编译，不调用 API：

```powershell
node scripts/manuscript.mjs compile qft-ch01
```

如果希望重新对照原图机器校对（会调用 API）：

```powershell
node scripts/manuscript.mjs verify qft-ch01
```

也可分阶段：`import` 只复制原图；`transcribe` 生成主稿；`verify` 校对；`compile` 编译。`transcribe` 不覆盖已有 `main.tex`，保护人工修改。重新转录请创建新任务。

## 把 PDF 加入网站

人工校对后执行：

```powershell
node scripts/manuscript.mjs publish qft-ch01 --slug qft-ch01 --title-en "Quantum Field Theory - Chapter 1" --confirm
$env:QUARTO_PATH = 'E:\personalpage\.tools\bin\quarto.cmd'
node scripts/build.mjs
```

`publish` 只复制 PDF 到 `pdfs/qft-ch01.pdf`，并更新 `pdfs/catalog.json`；中英文和日文目录会在网站构建时自动生成。`.tex`、原图和校对报告不复制到网站。命令不上传 GitHub；检查网站后再提交源文件和 `pdfs/`。

如果编译后又修改了 `main.tex`，发布步骤会拒绝旧 PDF，要求重新编译。

网站预览仍使用 `node scripts/serve.mjs`，地址为 http://127.0.0.1:4173/。这仅用于看网站，不参与手稿处理。

## 配置与限制

- DeepSeek 密钥在被 Git 忽略的 `.env` 中，模型默认 `deepseek-flash`。
- 本地需安装 Node.js 和 XeLaTeX。本机已检测到 `C:\texlive\2025\bin\windows\xelatex.exe`。
- 模板支持中文、英文、数学公式和引用；复杂 TikZ、额外图片、文献库等需要手动扩展模板。
- 机器原图复查可能误判，LaTeX 编译通过不证明转录或物理推导正确。
- 旧的 `ingest/` 浏览器工具保留为历史代码，不再是默认工作流。
