const fs = require('fs')
const path = require('path')
require('dotenv').config({ path: path.join(__dirname, '..', '.env') })

// ========== 配置 ==========
const SHOP_DOMAIN = process.env.SHOPIFY_SHOP_DOMAIN
const ACCESS_TOKEN = process.env.SHOPIFY_ACCESS_TOKEN
const API_VERSION = process.env.SHOPIFY_API_VERSION || '2025-01'

if (!SHOP_DOMAIN || !ACCESS_TOKEN) {
  console.error(
    '缺少环境变量：请在项目根目录创建 .env（可参考 .env.example），设置 SHOPIFY_SHOP_DOMAIN 与 SHOPIFY_ACCESS_TOKEN。',
  )
  process.exit(1)
}
const METAOBJECT_TYPE = 'specs_obj'
const INPUT_FILE = path.join(_dirname, 'specs_obj_daata.json')
const REQUEST_DELAY_MS = 300 // 请求间隔，防止限流

const URL = `https://${SHOP_DOMAIN}/admin/api/${API_VERSION}/graphql.json`
const HEADERS = {
  'Content-Type': 'application/json',
  'X-Shopify-Access-Token': ACCESS_TOKEN,
}

// rich_text_field 空值占位
const RICH_TEXT_EMPTY = JSON.stringify({
  type: 'root',
  children: [{ type: 'paragraph', children: [{ type: 'text', value: '' }] }],
})

// ========== GraphQL ==========
const UPSERT_MUTATION = `
mutation MetaobjectUpsert($handle: MetaobjectHandleInput!, $metaobject: MetaobjectUpsertInput!) {
  metaobjectUpsert(handle: $handle, metaobject: $metaobject) {
    metaobject {
      id
      handle
      type
    }
    userErrors {
      field
      message
      code
    }
  }
}
`

// ========== 工具函数 ==========
async function graphql(query, variables = {}) {
  const res = await fetch(URL, {
    method: 'POST',
    headers: HEADERS,
    body: JSON.stringify({ query, variables }),
  })
  return res.json()
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function buildFields(fields = []) {
  const result = []
  for (const f of fields) {
    if (f.value === null || f.value === undefined) continue
    let value = f.value
    if (f.type === 'rich_text_field' && typeof value === 'string' && !value.trim()) {
      value = RICH_TEXT_EMPTY
    }
    result.push({ key: f.key, value })
  }
  return result
}

async function upsertEntry(item) {
  return graphql(UPSERT_MUTATION, {
    handle: {
      type: METAOBJECT_TYPE,
      handle: item.handle,
    },
    metaobject: {
      capabilities: {
        publishable: {
          status: 'ACTIVE'
        }
      },
      fields: buildFields(item.fields),
    },
  })
}

// ========== 主流程 ==========
async function main() {
  const items = JSON.parse(fs.readFileSync(INPUT_FILE, 'utf-8'))
  console.log(`📂 读取到 ${items.length} 条 ${METAOBJECT_TYPE} 数据，开始 upsert...\n`)

  const success = []
  const failed = []

  for (let i = 0; i < items.length; i++) {
    const item = items[i]
    const { handle, displayName = handle } = item
    const label = `[${i + 1}/${items.length}] ${displayName} (handle: ${handle})`

    const result = await upsertEntry(item)

    if (result.errors) {
      console.log(`❌ GraphQL 错误: ${label}`, JSON.stringify(result.errors))
      failed.push({ handle, errors: result.errors })
      await sleep(REQUEST_DELAY_MS)
      continue
    }

    const payload = result?.data?.metaobjectUpsert
    const errors = payload?.userErrors ?? []
    const metaobject = payload?.metaobject

    if (metaobject && errors.length === 0) {
      console.log(`✅ Upsert 成功: ${label} → ${metaobject.id}`)
      success.push(handle)
    } else {
      console.log(`❌ Upsert 失败: ${label}`, JSON.stringify(errors))
      failed.push({ handle, errors })
    }

    await sleep(REQUEST_DELAY_MS)
  }

  console.log(`\n${'='.repeat(55)}`)
  console.log(`✅ 成功: ${success.length} 条`)
  console.log(`❌ 失败: ${failed.length} 条`)
  if (failed.length > 0) {
    console.log('\n失败详情:')
    console.log(JSON.stringify(failed, null, 2))
  }
}

main().catch(console.error)
