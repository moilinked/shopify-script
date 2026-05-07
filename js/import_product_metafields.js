const fs = require('fs')
const path = require('path')
const readline = require('readline')

require('dotenv').config({ path: path.join(__dirname, '..', '.env') })

const SHOP_DOMAIN = process.env.SHOPIFY_SHOP_DOMAIN
const ACCESS_TOKEN = process.env.SHOPIFY_ACCESS_TOKEN
const API_VERSION = process.env.SHOPIFY_API_VERSION || '2025-01'
const INPUT_FILE = path.join(__dirname, '..', 'product_metafields_export.json')
const OUTPUT_FILE = path.join(__dirname, '..', 'product_metafields_import_result.json')

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

// id 是 Shopify 产品 ID，例如：1234567890
// Example:
// const productIdPairs = [
//   { updateProductId: '1', searchProductId: '1' },
//   { updateProductId: '2', searchProductId: '2' },
// ]
const productIdPairs = [
  { updateProductId: '15083008196972', searchProductId: '15083008590188' },
]

const METAFIELDS_SET_MUTATION = `
mutation SetProductMetafields($metafields: [MetafieldsSetInput!]!) {
  metafieldsSet(metafields: $metafields) {
    metafields {
      id
      namespace
      key
      type
      value
    }
    userErrors {
      field
      message
      code
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

function findDuplicateIds(ids) {
  const seen = new Set()
  const duplicates = new Set()

  for (const id of ids) {
    if (seen.has(id)) {
      duplicates.add(id)
      continue
    }

    seen.add(id)
  }

  return [...duplicates]
}

function normalizeShopDomain(shopDomain) {
  return shopDomain?.trim().toLowerCase()
}

function askQuestion(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  })

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close()
      resolve(answer)
    })
  })
}

async function confirmImportWhenSameShop(sourceShopDomain) {
  if (normalizeShopDomain(sourceShopDomain) !== normalizeShopDomain(SHOP_DOMAIN)) {
    return true
  }

  console.warn(`导出文件 sourceShopDomain 与当前 SHOPIFY_SHOP_DOMAIN 相同：${SHOP_DOMAIN}`)
  console.warn('这可能会把元字段导入回源店，请确认是否继续。')

  const answer = await askQuestion('输入 y 继续执行导入，其他输入取消：')
  if (answer.trim().toLowerCase() === 'y') {
    return true
  }

  console.log('已取消导入。')
  return false
}

async function setProductMetafields(product, productId) {
  const ownerId = toProductGid(productId)
  const sourceMetafields = product.variables?.metafields ?? product.metafields ?? []
  const metafields = sourceMetafields
    .filter((metafield) => metafield.value !== null && metafield.value !== undefined)
    .map((metafield) => ({
      ownerId,
      namespace: metafield.namespace,
      key: normalizeMetafieldKey(metafield.key),
      value: metafield.value,
      type: metafield.type,
    }))
  const variables = { metafields }

  if (metafields.length === 0) {
    return { skipped: true, userErrors: [], metafields: [], variables }
  }

  const response = await fetch(URL, {
    method: 'POST',
    headers: HEADERS,
    body: JSON.stringify({
      query: METAFIELDS_SET_MUTATION,
      variables,
    }),
  })
  const result = await response.json()

  if (!response.ok || result.errors?.length) {
    throw new Error(`导入产品 ${productId} 失败：${JSON.stringify(result.errors ?? result)}`)
  }

  const userErrors = result.data?.metafieldsSet?.userErrors ?? []
  const updatedMetafields = result.data?.metafieldsSet?.metafields ?? []
  return { skipped: false, userErrors, metafields: updatedMetafields, variables }
}

async function main() {
  if (!fs.existsSync(INPUT_FILE)) {
    console.error(`未找到导入文件: ${INPUT_FILE}`)
    process.exit(1)
  }

  const payload = JSON.parse(fs.readFileSync(INPUT_FILE, 'utf8'))
  const shouldContinue = await confirmImportWhenSameShop(payload.sourceShopDomain)
  if (!shouldContinue) {
    return
  }

  const products = payload.products ?? []
  const success = []
  const failed = []
  const skipped = []

  const duplicateUpdateProductIds = findDuplicateIds(
    productIdPairs.map(({ updateProductId }) => updateProductId),
  )
  if (duplicateUpdateProductIds.length > 0) {
    console.error(`updateProductId 不允许重复：${duplicateUpdateProductIds.join(', ')}`)
    process.exit(1)
  }

  const productById = new Map(products.map((product) => [product.productId, product]))

  console.log(`读取到 ${products.length} 个导出产品，开始处理 ${productIdPairs.length} 个导入配置...`)

  for (const { updateProductId, searchProductId } of productIdPairs) {
    const label = `${searchProductId} -> ${updateProductId}`

    if (updateProductId === searchProductId) {
      skipped.push({
        productId: updateProductId,
        sourceProductId: searchProductId,
        reason: 'updateProductId 与 searchProductId 相同',
      })
      console.log(`跳过: ${label}，updateProductId 与 searchProductId 相同`)
      continue
    }

    const product = productById.get(searchProductId)
    if (!product) {
      failed.push({
        productId: updateProductId,
        sourceProductId: searchProductId,
        message: '导出文件中未找到对应的 searchProductId',
      })
      console.log(`导入失败: ${label}，导出文件中未找到对应的 searchProductId`)
      continue
    }

    try {
      const result = await setProductMetafields(product, updateProductId)

      if (result.skipped) {
        skipped.push({
          productId: updateProductId,
          sourceProductId: searchProductId,
          reason: '没有可导入的元字段',
          variables: result.variables,
        })
        console.log(`跳过: ${label}，没有可导入的元字段`)
        continue
      }

      if (result.userErrors.length > 0) {
        failed.push({
          productId: updateProductId,
          sourceProductId: searchProductId,
          errors: result.userErrors,
          variables: result.variables,
        })
        console.log(`导入失败: ${label}，${JSON.stringify(result.userErrors)}`)
        continue
      }

      success.push({
        productId: updateProductId,
        sourceProductId: searchProductId,
        metafieldCount: result.metafields.length,
        variables: result.variables,
      })
      console.log(`导入成功: ${label}`)
    } catch (error) {
      failed.push({
        productId: updateProductId,
        sourceProductId: searchProductId,
        message: error.message,
      })
      console.error(error.message)
    }
  }

  console.log(`\n导入完成：成功 ${success.length} 个，跳过 ${skipped.length} 个，失败 ${failed.length} 个`)
  if (failed.length > 0) {
    console.log('失败详情:')
    console.log(JSON.stringify(failed, null, 2))
  }

  const importResult = {
    importedAt: new Date().toISOString(),
    targetShopDomain: SHOP_DOMAIN,
    apiVersion: API_VERSION,
    inputFile: INPUT_FILE,
    sourceExportedAt: payload.exportedAt,
    sourceShopDomain: payload.sourceShopDomain,
    totals: {
      exportProducts: products.length,
      importConfigs: productIdPairs.length,
      success: success.length,
      skipped: skipped.length,
      failed: failed.length,
    },
    success,
    skipped,
    failed,
  }

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(importResult, null, 2), 'utf8')
  console.log(`导入结果文件: ${OUTPUT_FILE}`)
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
