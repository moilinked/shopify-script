/**
 * 从同目录 main-header-menu.json 导入导航菜单到 Shopify
 * 使用方式: 在项目根目录执行 npm run import:menu 或 node js/import-menu.js
 * 配置：在项目根目录复制 .env.example 为 .env 并填写 SHOPIFY_* 变量（需 Node.js 18+，内置 fetch）
 */

const path = require('path')
require('dotenv').config({ path: path.join(__dirname, '..', '.env') })
const SHOP_DOMAIN = process.env.SHOPIFY_SHOP_DOMAIN
const ACCESS_TOKEN = process.env.SHOPIFY_ACCESS_TOKEN
const API_VERSION = process.env.SHOPIFY_API_VERSION || '2025-01'

if (!SHOP_DOMAIN || !ACCESS_TOKEN) {
  console.error(
    '缺少环境变量：请在项目根目录创建 .env（可参考 .env.example），设置 SHOPIFY_SHOP_DOMAIN 与 SHOPIFY_ACCESS_TOKEN。',
  )
  process.exit(1)
}

const menuData = require('./main-header-menu.json')

const ENDPOINT = `https://${SHOP_DOMAIN}/admin/api/${API_VERSION}/graphql.json`

// 递归构建 items 输入结构
function buildItems(items) {
  return items.map((item) => ({
    title: item.title,
    url: item.url,
    type: item.type,
    ...(item.items && item.items.length > 0 ? { items: buildItems(item.items) } : {}),
  }))
}

const CREATE_MENU_MUTATION = `
  mutation menuCreate($title: String!, $handle: String!, $items: [MenuItemCreateInput!]!) {
    menuCreate(title: $title, handle: $handle, items: $items) {
      menu {
        id
        title
        handle
      }
      userErrors {
        field
        message
      }
    }
  }
`

async function importMenu() {
  const { title, handle, items } = menuData.menu

  const variables = {
    title,
    handle,
    items: buildItems(items),
  }

  console.log(`\n🚀 正在导入菜单: "${title}" (handle: ${handle})`)
  console.log(`📡 目标店铺: ${SHOP_DOMAIN}\n`)

  try {
    const response = await fetch(ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': ACCESS_TOKEN,
      },
      body: JSON.stringify({
        query: CREATE_MENU_MUTATION,
        variables,
      }),
    })

    const result = await response.json()

    if (result.errors) {
      console.error('❌ GraphQL 错误:', result.errors)
      return
    }

    const { menu, userErrors } = result.data.menuCreate

    if (userErrors && userErrors.length > 0) {
      console.error('❌ 导入失败，错误信息:')
      userErrors.forEach((e) => console.error(`  - [${e.field}] ${e.message}`))
      return
    }

    console.log('✅ 菜单导入成功！')
    console.log(`   ID: ${menu.id}`)
    console.log(`   标题: ${menu.title}`)
    console.log(`   Handle: ${menu.handle}`)
  } catch (err) {
    console.error('❌ 请求失败:', err.message)
  }
}

importMenu()
