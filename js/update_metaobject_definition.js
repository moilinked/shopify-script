/**
 * 按 type 查询元对象定义 id，再更新 displayNameKey 与 fieldDefinitions。
 * API：metaobjectDefinitionByType → metaobjectDefinitionUpdate
 * 需要 Node.js 18+、具备 write_metaobject_definitions 的 Admin Token
 *
 * 仅需 .env：SHOPIFY_SHOP_DOMAIN、SHOPIFY_ACCESS_TOKEN（可选 SHOPIFY_API_VERSION）
 * 类型与字段列表在下方常量中修改，不依赖 METAOBJECT_DEFINITION_ID 等环境变量。
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

/** 元对象定义 type（与后台 Custom data 中定义的 type 一致，如 specs_obj） */
const METAOBJECT_DEFINITION_TYPE = 'specs_obj'

/** 展示名称所用字段 key */
const DISPLAY_NAME_KEY = 'model'

/**
 * 目标字段定义（顺序即期望顺序；resetFieldOrder 会按此顺序排列已提交字段）
 * type 仅在「新建字段」时使用；已存在字段走 update，不能改 type
 */
const DESIRED_FIELD_DEFINITIONS = [
  { name: 'Model', key: 'model', type: 'single_line_text_field', description: '', required: false, validations: [] },
  { name: 'Pure to Drain', key: 'pure_to_drain', type: 'single_line_text_field', description: '', required: false, validations: [] },
  { name: 'Product Dimensions (In)', key: 'product_dimensions_in', type: 'single_line_text_field', description: '', required: false, validations: [] },
  { name: 'Product Weight (Ib)', key: 'product_weight_ib', type: 'single_line_text_field', description: '', required: false, validations: [] },
  { name: 'Certification', key: 'certification', type: 'single_line_text_field', description: '', required: false, validations: [] },
  { name: 'Filtration', key: 'filtration', type: 'single_line_text_field', description: '', required: false, validations: [] },
  { name: 'Capacity', key: 'capacity', type: 'single_line_text_field', description: '', required: false, validations: [] },
  { name: 'Usage', key: 'usage', type: 'single_line_text_field', description: '', required: false, validations: [] },
  { name: 'Electricity Required', key: 'electricity_required', type: 'single_line_text_field', description: '', required: false, validations: [] },
  { name: 'Flow Rate', key: 'flow_rate', type: 'single_line_text_field', description: '', required: false, validations: [] },
  { name: 'Alkaline Mineralization', key: 'alkaline_mineralization', type: 'single_line_text_field', description: '', required: false, validations: [] },
  { name: 'Average Annual Cost', key: 'average_annual_cost', type: 'single_line_text_field', description: '', required: false, validations: [] },
  { name: 'Warranty', key: 'warranty', type: 'single_line_text_field', description: '', required: false, validations: [] },
  { name: 'Product Dimensions (Cm)', key: 'product_dimensions_cm', type: 'single_line_text_field', description: '', required: false, validations: [] },
  { name: 'Product Weight (Kg)', key: 'product_weight_kg', type: 'single_line_text_field', description: '', required: false, validations: [] },
  { name: 'Temperature', key: 'temperature', type: 'single_line_text_field', description: '', required: false, validations: [] },
  { name: 'Screen', key: 'screen', type: 'single_line_text_field', description: '', required: false, validations: [] },
  {
    name: 'Filter Lifespan',
    key: 'filter_lifespan',
    type: 'rich_text_field',
    description: '采用 无序列表 做换行，确保每一点为一条',
    required: false,
    validations: [],
  },
  { name: 'Faucet（简单描述）', key: 'faucet_single', type: 'single_line_text_field', description: '', required: false, validations: [] },
  {
    name: 'Faucet（详细描述）',
    key: 'faucet',
    type: 'rich_text_field',
    description: '采用 无序列表 做换行，确保每一点为一条',
    required: false,
    validations: [],
  },
  {
    name: 'Compatible With',
    key: 'compatible_with',
    type: 'rich_text_field',
    description: '采用 无序列表 做换行，确保每一点为一条',
    required: false,
    validations: [],
  },
  { name: 'Instant Hot', key: 'instant_hot', type: 'single_line_text_field', description: '', required: false, validations: [] },
  { name: 'Display', key: 'display', type: 'single_line_text_field', description: '', required: false, validations: [] },
  { name: 'Water Capacity Options', key: 'water_capacity_options', type: 'single_line_text_field', description: '', required: false, validations: [] },
  {
    name: 'Dispensing Area Height',
    key: 'dispensing_area_height',
    type: 'rich_text_field',
    description: '采用 无序列表 做换行，确保每一点为一条',
    required: false,
    validations: [],
  },
  {
    name: 'Power Supply',
    key: 'power_supply',
    type: 'rich_text_field',
    description: '采用 无序列表 做换行，确保每一点为一条',
    required: false,
    validations: [],
  },
  {
    name: 'Feature',
    key: 'feature',
    type: 'rich_text_field',
    description: '采用 无序列表 做换行，确保每一点为一条',
    required: false,
    validations: [],
  },
]

const URL = `https://${SHOP_DOMAIN}/admin/api/${API_VERSION}/graphql.json`
const HEADERS = {
  'Content-Type': 'application/json',
  'X-Shopify-Access-Token': ACCESS_TOKEN,
}

const QUERY_DEFINITION_BY_TYPE = `
query MetaobjectDefinitionByType($type: String!) {
  metaobjectDefinitionByType(type: $type) {
    id
    name
    type
    description
    fieldDefinitions {
      key
      name
      type {
        name
      }
      required
      validations {
        name
        value
      }
    }
    access {
      admin
      storefront
    }
    capabilities {
      publishable {
        enabled
      }
      translatable {
        enabled
      }
    }
  }
}
`

const MUTATION_UPDATE = `
mutation UpdateMetaobjectDefinition($id: ID!, $definition: MetaobjectDefinitionUpdateInput!) {
  metaobjectDefinitionUpdate(id: $id, definition: $definition) {
    metaobjectDefinition {
      id
      name
      displayNameKey
      fieldDefinitions {
        name
        key
        type {
          name
        }
      }
    }
    userErrors {
      field
      message
      code
    }
  }
}
`

function mapValidations(validations) {
  if (!validations || validations.length === 0) return []
  return validations.map((v) => ({
    name: v.name,
    value: v.value != null ? String(v.value) : '',
  }))
}

/**
 * MetaobjectFieldDefinitionOperationInput：已存在 key → update；否则 → create（含 type）
 */
function buildFieldDefinitionOperations(desiredList, existingFieldDefinitions = []) {
  const existingByKey = new Map((existingFieldDefinitions || []).map((f) => [f.key, f]))
  const operations = []

  for (const d of desiredList) {
    const validations = mapValidations(d.validations)
    if (existingByKey.has(d.key)) {
      operations.push({
        update: {
          key: d.key,
          name: d.name,
          description: d.description ?? '',
          required: Boolean(d.required),
          validations,
        },
      })
    } else {
      operations.push({
        create: {
          key: d.key,
          name: d.name,
          type: d.type,
          description: d.description ?? '',
          required: Boolean(d.required),
          validations,
        },
      })
    }
  }

  return operations
}

async function graphql(label, query, variables) {
  const bodyObj = { query, variables }
  const bodyStr = JSON.stringify(bodyObj)

  const res = await fetch(URL, {
    method: 'POST',
    headers: HEADERS,
    body: bodyStr,
  })

  const rawText = await res.text()

  let parsed
  try {
    parsed = JSON.parse(rawText)
  } catch (e) {
    console.log('(响应体不是合法 JSON)')
    console.log(rawText)
    throw e
  }

  return parsed
}

async function main() {
  console.log(`查询元对象定义 type=${METAOBJECT_DEFINITION_TYPE} …\n`)

  const queryResult = await graphql('metaobjectDefinitionByType', QUERY_DEFINITION_BY_TYPE, {
    type: METAOBJECT_DEFINITION_TYPE,
  })

  if (queryResult.errors) {
    console.error('GraphQL 错误（查询）:', JSON.stringify(queryResult.errors, null, 2))
    process.exit(1)
  }

  const def = queryResult.data?.metaobjectDefinitionByType
  if (!def?.id) {
    console.error(`未找到 type 为 "${METAOBJECT_DEFINITION_TYPE}" 的元对象定义。`)
    process.exit(1)
  }

  console.log(`已找到定义: ${def.name} (${def.id})`)
  console.log(`现有字段数: ${def.fieldDefinitions?.length ?? 0}\n`)

  const fieldOperations = buildFieldDefinitionOperations(DESIRED_FIELD_DEFINITIONS, def.fieldDefinitions)

  const definitionInput = {
    displayNameKey: DISPLAY_NAME_KEY,
    fieldDefinitions: fieldOperations,
    resetFieldOrder: true,
  }

  console.log(
    `提交更新: displayNameKey=${DISPLAY_NAME_KEY}, 字段操作数=${fieldOperations.length}（create/update 已自动区分）\n`,
  )

  const result = await graphql('metaobjectDefinitionUpdate', MUTATION_UPDATE, {
    id: def.id,
    definition: definitionInput,
  })

  if (result.errors) {
    console.error('GraphQL 错误（更新）:', JSON.stringify(result.errors, null, 2))
    process.exit(1)
  }

  const payload = result.data?.metaobjectDefinitionUpdate
  const errors = payload?.userErrors ?? []
  const updated = payload?.metaobjectDefinition

  if (errors.length > 0) {
    console.error('userErrors:', JSON.stringify(errors, null, 2))
    process.exit(1)
  }

  if (updated) {
    console.log('\n✅ 元对象定义已更新（完整返回见上方 [metaobjectDefinitionUpdate]）。')
  } else {
    console.log('\n⚠️ 未返回 metaobjectDefinition，完整 body 已打印在上方。')
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
