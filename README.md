# Shopify Admin 脚本集

本仓库包含一批通过 **Shopify Admin GraphQL API** 管理元字段、元对象与导航菜单的 Node.js 脚本，以及功能相近的 **Python** 参考实现。所有命令均在**项目根目录**执行，以便正确加载根目录下的 `.env` 与数据文件。

## 环境要求

- **Node.js 18+**（使用内置 `fetch`）
- **npm**（安装依赖）
- 使用 Python 脚本时：**Python 3** 与 **`requests`**（`pip install requests`）

## 快速开始

```bash
cd /path/to/script
npm install
copy .env.example .env
```

编辑 `.env`，填入目标店铺的域名与 Admin API Token（见下表）。**切勿将 `.env` 提交到版本库。**

## 环境变量

| 变量 | 说明 |
|------|------|
| `SHOPIFY_SHOP_DOMAIN` | 店铺域名，如 `your-store.myshopify.com` |
| `SHOPIFY_ACCESS_TOKEN` | Admin API access token（按各脚本所需 scope 申请） |
| `SHOPIFY_SHOP_DOMAIN_U` | 目标更新店铺域名；`sync:product-metafields` 使用，与 `SHOPIFY_SHOP_DOMAIN` 要求一致 |
| `SHOPIFY_ACCESS_TOKEN_U` | 目标更新店铺 Admin API access token；`sync:product-metafields` 使用，与 `SHOPIFY_ACCESS_TOKEN` 要求一致 |
| `SHOPIFY_API_VERSION` | 可选，默认 `2025-01` |

多数位于 `js/` 下的脚本会从**项目根目录**的 `.env` 读取上述变量（通过 `path.join(__dirname, '..', '.env')`）。`sync:product-metafields` 会用 `SHOPIFY_SHOP_DOMAIN` / `SHOPIFY_ACCESS_TOKEN` 查询源产品，并用 `SHOPIFY_SHOP_DOMAIN_U` / `SHOPIFY_ACCESS_TOKEN_U` 更新目标产品。个别脚本若仍在文件顶部写死店铺与 Token，使用前请自行改为 `.env` 或安全占位。

官方 API 文档：[Shopify Admin GraphQL API](https://shopify.dev/docs/api/admin-graphql)。

## npm 脚本

在项目根目录执行：

| 命令 | 说明 |
|------|------|
| `npm run metafield:variants` | 创建/同步 **产品变体**（`PRODUCTVARIANT`）元字段定义；若 key 已存在则尝试更新名称 |
| `npm run metafield:product` | 批量创建 **产品**（`PRODUCT`）元字段定义 |
| `npm run import:menu` | 根据 `js/main-header-menu.json` 调用 `menuCreate` 导入导航菜单 |
| `npm run export:specs` | 将指定类型的 **元对象**导出到 `specs_obj_data.json`（需先在脚本内配置类型与凭证） |
| `npm run import:specs` | 根据 `specs_obj_data.json` 对元对象执行 `metaobjectUpsert` |
| `npm run update:metaobject-definition` | 按 `type` 查询元对象定义并更新 `displayNameKey` 与字段定义（见脚本内常量） |
| `npm run sync:product-metafields` | 从源产品查询指定产品元字段，并同步更新到目标产品；需配置普通变量与 `_U` 变量 |

等价命令示例：`node js/metafield_variants.js`。

## 目录与数据文件

```
js/           # Node 脚本与菜单 JSON
py/           # 与部分 JS 功能对应的 Python 脚本（元字段定义）
specs_obj_data.json   # 元对象导出/导入数据（根目录，供 import/export 使用）
```

- **`js/main-header-menu.json`**：`import:menu` 读取的菜单结构（`menu.title`、`handle`、`items` 等）。
- **`specs_obj_data.json`**：元对象条目数组；每项为包含 `id`、`handle`、`displayName`、`fields` 的对象（与导出格式一致）。

## Python 脚本（`py/`）

| 文件 | 说明 |
|------|------|
| `metafield_variants.py` | 与 `js/metafield_variants.js` 类似：变体元字段定义创建/名称更新 |
| `metafield_product.py` | 与 `js/metafield_product.js` 类似：产品元字段定义批量创建 |

Python 版在文件内配置 `SHOP_DOMAIN`、`ACCESS_TOKEN` 等，需自行安装 `requests`。

## 安全说明

- Admin API Token 权限高，请仅保存在本机 `.env` 或密钥管理工具中。
- 若 Token 曾出现在历史提交或截图中，应在 Shopify 后台**轮换**后再使用。

