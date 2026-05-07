const fs = require('fs')
const path = require('path')

require('dotenv').config({ path: path.join(__dirname, '..', '.env') })

const SHOP_DOMAIN = process.env.SHOPIFY_SHOP_DOMAIN
const ACCESS_TOKEN = process.env.SHOPIFY_ACCESS_TOKEN
const API_VERSION = process.env.SHOPIFY_API_VERSION || '2025-01'
const OUTPUT_FILE = path.join(__dirname, '..', 'product_metafields_export.json')

if (!SHOP_DOMAIN || !ACCESS_TOKEN) {
  console.error(
    '缺少环境变量：请在项目根目录创建 .env（可参考 .env.example），设置 SHOPIFY_SHOP_DOMAIN 与 SHOPIFY_ACCESS_TOKEN。',
  )
  process.exit(1)
}

const HEADERS = {
  'Content-Type': 'application/json',
  'X-Shopify-Access-Token': ACCESS_TOKEN,
}

const URL = `https://${SHOP_DOMAIN}/admin/api/${API_VERSION}/graphql.json`

// 需要导出的元字段在这里修改，格式为 namespace.key
const PRODUCT_METAFIELD_KEYS = [
  'custom.key_feature',
  'custom.user_manual_url',
  'custom.product_main_youtube',
  'custom.short_describe',
  'custom.event_product_sku',
]

// 源店 Shopify 产品 ID，例如：1234567890
// Example:
// const productIds = ['1', '2']
const productIds = ['15083008590188']

const PRODUCT_METAFIELDS_QUERY = `
query ProductMetafields($id: ID!, $keys: [String!]) {
  product(id: $id) {
    id
    title
    metafields(first: 50, keys: $keys) {
      nodes {
        namespace
        key
        value
        type
      }
    }
  }
}
`

function toProductGid(productId) {
  return `gid://shopify/Product/${productId}`
}

function normalizeMetafieldKey(key) {
  return key.replace(/^custom\./, '')
}

function buildMetafieldsSetVariables(ownerId, metafields) {
  return {
    metafields: metafields.map((metafield) => ({
      ownerId,
      namespace: metafield.namespace,
      key: metafield.key,
      value: metafield.value,
      type: metafield.type,
    })),
  }
}

async function fetchProductMetafields(productId) {
  const response = await fetch(URL, {
    method: 'POST',
    headers: HEADERS,
    body: JSON.stringify({
      query: PRODUCT_METAFIELDS_QUERY,
      variables: {
        id: toProductGid(productId),
        keys: PRODUCT_METAFIELD_KEYS,
      },
    }),
  })
  const result = await response.json()

  if (!response.ok || result.errors?.length) {
    throw new Error(`查询产品 ${productId} 失败：${JSON.stringify(result.errors ?? result)}`)
  }

  const product = result.data?.product
  if (!product) {
    throw new Error(`查询产品 ${productId} 失败：未找到 product`)
  }

  return {
    id: product.id,
    title: product.title,
    metafields: (product.metafields?.nodes ?? []).map((node) => ({
      namespace: node.namespace,
      key: normalizeMetafieldKey(node.key),
      value: node.value,
      type: node.type,
    })),
  }
}

async function main() {
  const products = []
  const failed = []

  console.log(`开始导出产品元字段，共 ${productIds.length} 个产品...`)

  for (const productId of productIds) {
    try {
      const product = await fetchProductMetafields(productId)
      const variables = buildMetafieldsSetVariables(product.id, product.metafields)

      products.push({
        productId,
        sourceProductGid: product.id,
        title: product.title,
        metafields: product.metafields,
        variables,
      })

      console.log(`导出成功: ${productId}，元字段 ${product.metafields.length} 个`)
    } catch (error) {
      failed.push({ productId, message: error.message })
      console.error(error.message)
    }
  }

  const payload = {
    exportedAt: new Date().toISOString(),
    sourceShopDomain: SHOP_DOMAIN,
    apiVersion: API_VERSION,
    metafieldKeys: PRODUCT_METAFIELD_KEYS,
    products,
    failed,
  }

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(payload, null, 2), 'utf8')

  console.log(`\n导出完成：成功 ${products.length} 个，失败 ${failed.length} 个`)
  console.log(`导出文件: ${OUTPUT_FILE}`)
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
