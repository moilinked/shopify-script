/**
 * Shopify Admin GraphQL: 产品变体 (PRODUCTVARIANT) 元字段定义 — 创建或按 key 重复时更新名称
 * 需要 Node.js 18+（内置 fetch）
 * 配置：在项目根目录复制 .env.example 为 .env 并填写 SHOPIFY_* 变量
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

const HEADERS = {
  'Content-Type': 'application/json',
  'X-Shopify-Access-Token': ACCESS_TOKEN,
}

const URL = `https://${SHOP_DOMAIN}/admin/api/${API_VERSION}/graphql.json`

// ========== 产品变体元字段定义数据 ==========
const METAFIELD_DEFINITIONS = [
  {"name": "折扣码", "namespace": "custom", "key": "variant_discount_code", "type": "single_line_text_field", "access": {"admin": "PUBLIC_READ_WRITE", "storefront": "PUBLIC_READ"}},
  {"name": "折扣价", "namespace": "custom", "key": "variant_price_discount", "type": "money", "access": {"admin": "PUBLIC_READ_WRITE", "storefront": "PUBLIC_READ"}},
  {"name": "折扣显示样式", "namespace": "custom", "key": "show_percentage_amount", "description": "默认展示直降金额", "type": "single_line_text_field", "validations": [{"name": "choices", "value": "[\"amount\",\"percentage\"]"}], "access": {"admin": "PUBLIC_READ_WRITE", "storefront": "PUBLIC_READ"}},
]

const OWNER_TYPE = 'PRODUCTVARIANT'

// ========== GraphQL: 创建 ==========
const CREATE_MUTATION = `
mutation CreateMetafieldDefinition($definition: MetafieldDefinitionInput!) {
  metafieldDefinitionCreate(definition: $definition) {
    createdDefinition { id name namespace key }
    userErrors { field message code }
  }
}
`

// ========== GraphQL: 查询已有定义 ID ==========
const QUERY_EXISTING = `
query GetMetafieldDefinition($ownerType: MetafieldOwnerType!, $namespace: String!, $key: String!) {
  metafieldDefinitions(ownerType: $ownerType, namespace: $namespace, key: $key, first: 1) {
    edges {
      node { id name }
    }
  }
}
`

// ========== GraphQL: 更新名称 ==========
const UPDATE_MUTATION = `
mutation UpdateMetafieldDefinition($definition: MetafieldDefinitionUpdateInput!, $id: ID!) {
  metafieldDefinitionUpdate(definition: $definition, id: $id) {
    updatedDefinition { id name namespace key }
    userErrors { field message code }
  }
}
`

async function graphql(query, variables) {
  const response = await fetch(URL, {
    method: 'POST',
    headers: HEADERS,
    body: JSON.stringify({ query, variables }),
  })
  const result = await response.json()
  return result
}

function createDefinition(defn) {
  const definition = {
    name: defn.name,
    namespace: defn.namespace,
    key: defn.key,
    description: defn.description ?? '',
    type: defn.type,
    ownerType: OWNER_TYPE,
  }
  if (defn.validations) {
    definition.validations = defn.validations
  }
  return graphql(CREATE_MUTATION, { definition })
}

/** 查询已存在的元字段定义，返回 [id, name] 或 null */
async function findExisting(namespace, key) {
  const result = await graphql(QUERY_EXISTING, {
    ownerType: OWNER_TYPE,
    namespace,
    key,
  })
  const edges = result.data?.metafieldDefinitions?.edges ?? []
  if (edges.length > 0) {
    const node = edges[0].node
    return [node.id, node.name]
  }
  return null
}

function updateDefinition(definitionId, defn) {
  return graphql(UPDATE_MUTATION, {
    id: definitionId,
    definition: {
      name: defn.name,
      description: defn.description ?? '',
    },
  })
}

function isDuplicateError(errors) {
  return errors.some((e) => {
    const code = e.code
    const msg = (e.message ?? '').toLowerCase()
    return (
      code === 'TAKEN' ||
      code === 'DUPLICATE' ||
      code === 'already_exists' ||
      msg.includes('taken') ||
      msg.includes('already')
    )
  })
}

async function main() {
  const successCreate = []
  const successUpdate = []
  const failed = []

  for (const defn of METAFIELD_DEFINITIONS) {
    const label = `${defn.namespace}.${defn.key}`

    const result = await createDefinition(defn)
    const errors = result.data?.metafieldDefinitionCreate?.userErrors ?? []
    const created = result.data?.metafieldDefinitionCreate?.createdDefinition

    if (created && errors.length === 0) {
      console.log(`✅ 创建成功: ${label} -> "${defn.name}"`)
      successCreate.push(label)
      continue
    }

    if (isDuplicateError(errors)) {
      const existing = await findExisting(defn.namespace, defn.key)
      if (existing) {
        const [existingId, existingName] = existing
        if (existingName === defn.name) {
          console.log(`⏭️  跳过（名称已一致）: ${label} -> "${existingName}"`)
          successUpdate.push(label)
          continue
        }

        const updateResult = await updateDefinition(existingId, defn)
        const updateErrors = updateResult.data?.metafieldDefinitionUpdate?.userErrors ?? []
        const updated = updateResult.data?.metafieldDefinitionUpdate?.updatedDefinition

        if (updated && updateErrors.length === 0) {
          console.log(`✏️  已更新名称: ${label} "${existingName}" -> "${defn.name}"`)
          successUpdate.push(label)
        } else {
          console.log(`❌ 更新失败: ${label} -> ${JSON.stringify(updateErrors)}`)
          failed.push({ key: label, errors: updateErrors })
        }
      } else {
        console.log(`❌ 重复但未找到已有定义: ${label} -> ${JSON.stringify(errors)}`)
        failed.push({ key: label, errors })
      }
    } else {
      console.log(`❌ 创建失败（非重复错误）: ${label} -> ${JSON.stringify(errors)}`)
      failed.push({ key: label, errors })
    }
  }

  console.log(`\n${'='.repeat(50)}`)
  console.log(`✅ 新建成功: ${successCreate.length} 个`)
  console.log(`✏️  更新名称: ${successUpdate.length} 个`)
  console.log(`❌ 失败:     ${failed.length} 个`)
  if (failed.length > 0) {
    console.log('失败详情:', JSON.stringify(failed, null, 2))
  }
}

main().catch((err) => {
  console.error(err)
  process.exitCode = 1
})
