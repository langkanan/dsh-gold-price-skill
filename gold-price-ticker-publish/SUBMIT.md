# 发布说明

这个目录是 `dsh-gold-price-ticker` 的可发布版本，和本机已安装的
`@local/gold-price-ticker` 分开，避免影响当前正在使用的插件。

## 1. 发布到 npm

需要 npm 账号且该包名可用。已经生成好
`dsh-gold-price-ticker-1.1.0.tgz`，可以直接发布这个 tarball：

```sh
cd gold-price-ticker-publish
npm login
npm publish ./dsh-gold-price-ticker-1.1.0.tgz --access public
```

或者从目录发布：

```sh
npm publish --access public
```

发布后包地址为：

```text
https://www.npmjs.com/package/dsh-gold-price-ticker
```

如果 `dsh-gold-price-ticker` 已被占用，先改 `package.json` 的 `name`，同时
修改 `client.js` 第一行的 `id` 和 `cordis.patch.yml` 的 `name`，三者必须一致。

## 2. 发布市场索引

把 `market/` 目录整体放到任意 HTTPS 静态主机，例如 GitHub Pages：

```text
https://your-host/dsh-gold-price-ticker/index.json
https://your-host/dsh-gold-price-ticker/icon.svg
```

索引里的 `icon` 是相对路径，所以 `index.json` 和 `icon.svg` 放在同一目录即可。

然后在 DSH 的 **插件 → 发现 → 添加索引源** 中填入该 `index.json` 的 URL。
如果「发现」标签页还没出现，先在 **插件 → 实验性插件** 里打开
**自定义插件市场**。

## 3. 提交到 dshmarket 社区目录

`dshmarket` 的市场目录来自
[awesome-dsh-plugin](https://github.com/awesome-dsh-plugin/awesome-dsh-plugin)。
要让插件出现在这里，需要：

1. 有一个公开的 GitHub 仓库（或 npm 包）；
2. 向 `awesome-dsh-plugin` 仓库提交一个 PR，添加该仓库/包；
3. 等目录 CI 收录，通常一天内生效。

## 当前环境的阻塞

这台机器上：

- `npm whoami` 返回 `ENEEDAUTH`，没有 npm 登录态；
- 没有 `GITHUB_TOKEN`；
- `git` / `gh` 不在 PATH；
- 访问 `registry.npmjs.org` 会超时。

因此我可以生成可发布包和索引，但不能替你把包上传到公共 npm 或提交 GitHub PR。
需要你提供 npm 登录态/Token，或提供一个可推送的 GitHub 仓库后继续。
