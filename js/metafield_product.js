/**
 * Shopify Admin GraphQL: 产品 (PRODUCT) 元字段定义 — 仅创建
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

// ========== 元字段定义数据 ==========
const METAFIELD_DEFINITIONS = [
  // --- custom namespace ---
  // {"name": "event_discountprice", "namespace": "custom", "key": "event_discountprice", "description": "Discount Amount", "type": "single_line_text_field", "access": {"admin": "PUBLIC_READ_WRITE", "storefront": "PUBLIC_READ"}},
  // {"name": "event_discountcode", "namespace": "custom", "key": "event_discountcode", "description": "Discount Code", "type": "single_line_text_field", "access": {"admin": "PUBLIC_READ_WRITE", "storefront": "PUBLIC_READ"}},
  // {"name": "event_discountswitch", "namespace": "custom", "key": "event_discountswitch", "description": "Discount Switch", "type": "boolean", "access": {"admin": "PUBLIC_READ_WRITE", "storefront": "PUBLIC_READ"}},
  // {"name": "event_discountedprice", "namespace": "custom", "key": "event_discountedprice", "description": "Discounted Price", "type": "single_line_text_field", "access": {"admin": "PUBLIC_READ_WRITE", "storefront": "PUBLIC_READ"}},
  // {"name": "event_discounticon", "namespace": "custom", "key": "event_discounticon", "description": "event_discounticon", "type": "file_reference", "validations": [{"name": "file_type_options", "value": "[\"Image\",\"Video\"]"}], "access": {"admin": "PUBLIC_READ_WRITE", "storefront": "PUBLIC_READ"}},
  // {"name": "event_discountimage", "namespace": "custom", "key": "event_discountimage", "description": "event_discountimage", "type": "file_reference", "validations": [{"name": "file_type_options", "value": "[\"Image\",\"Video\"]"}], "access": {"admin": "PUBLIC_READ_WRITE", "storefront": "PUBLIC_READ"}},
  // {"name": "event_customblog1", "namespace": "custom", "key": "event_customblog1", "type": "single_line_text_field", "access": {"admin": "PUBLIC_READ_WRITE", "storefront": "PUBLIC_READ"}},
  // {"name": "youtube video", "namespace": "custom", "key": "custom_youtubevideo", "type": "multi_line_text_field", "access": {"admin": "PUBLIC_READ_WRITE", "storefront": "PUBLIC_READ"}},
  // {"name": "event_customblog_tag", "namespace": "custom", "key": "event_customblog_tag", "type": "single_line_text_field", "access": {"admin": "PUBLIC_READ_WRITE", "storefront": "PUBLIC_READ"}},
  // {"name": "event_product_template", "namespace": "custom", "key": "event_product_template", "type": "single_line_text_field", "access": {"admin": "PUBLIC_READ_WRITE", "storefront": "PUBLIC_READ"}},
  // {"name": "event_custom_replenishment_time", "namespace": "custom", "key": "event_custom_replenishment_time", "type": "single_line_text_field", "access": {"admin": "PUBLIC_READ_WRITE", "storefront": "PUBLIC_READ"}},
  // {"name": "product_specs_info", "namespace": "custom", "key": "event_product_specs_info", "type": "multi_line_text_field", "access": {"admin": "PUBLIC_READ_WRITE", "storefront": "PUBLIC_READ"}},
  // {"name": "product_specs_description", "namespace": "custom", "key": "event_product_specs_description", "type": "multi_line_text_field", "access": {"admin": "PUBLIC_READ_WRITE", "storefront": "PUBLIC_READ"}},
  // {"name": "Model", "namespace": "custom", "key": "event_product_sku", "type": "single_line_text_field", "access": {"admin": "PUBLIC_READ_WRITE", "storefront": "PUBLIC_READ"}},
  // {"name": "product_card_tag", "namespace": "custom", "key": "product_card_tag", "type": "single_line_text_field", "access": {"admin": "PUBLIC_READ_WRITE", "storefront": "PUBLIC_READ"}},
  // {"name": "product_card_flux", "namespace": "custom", "key": "product_card_flux", "type": "single_line_text_field", "access": {"admin": "PUBLIC_READ_WRITE", "storefront": "PUBLIC_READ"}},
  // {"name": "product_card_replacement_info", "namespace": "custom", "key": "product_card_replacement_info", "type": "single_line_text_field", "access": {"admin": "PUBLIC_READ_WRITE", "storefront": "PUBLIC_READ"}},
  // {"name": "product_replacements", "namespace": "custom", "key": "product_replacements", "type": "list.single_line_text_field", "access": {"admin": "PUBLIC_READ_WRITE", "storefront": "PUBLIC_READ"}},
  // {"name": "product_card_feature", "namespace": "custom", "key": "product_card_feature", "type": "single_line_text_field", "access": {"admin": "PUBLIC_READ_WRITE", "storefront": "PUBLIC_READ"}},
  // {"name": "product_you_may_also_like", "namespace": "custom", "key": "product_you_may_also_like", "type": "list.single_line_text_field", "access": {"admin": "PUBLIC_READ_WRITE", "storefront": "PUBLIC_READ"}},
  // {"name": "proudct_in_the_box", "namespace": "custom", "key": "proudct_in_the_box", "type": "multi_line_text_field", "access": {"admin": "PUBLIC_READ_WRITE", "storefront": "PUBLIC_READ"}},
  // {"name": "porduct_sale_count_down", "namespace": "custom", "key": "porduct_sale_count_down", "type": "date_time", "access": {"admin": "PUBLIC_READ_WRITE", "storefront": "PUBLIC_READ"}},
  // {"name": "product_show_reviews", "namespace": "custom", "key": "product_show_reviews", "type": "boolean", "access": {"admin": "PUBLIC_READ_WRITE", "storefront": "PUBLIC_READ"}},
  // {"name": "product_show_amazon_reviews", "namespace": "custom", "key": "product_show_amazon_reviews", "type": "boolean", "access": {"admin": "PUBLIC_READ_WRITE", "storefront": "PUBLIC_READ"}},
  // {"name": "product_bundle", "namespace": "custom", "key": "product_bundle", "type": "list.single_line_text_field", "access": {"admin": "PUBLIC_READ_WRITE", "storefront": "PUBLIC_READ"}},
  // {"name": "porduct_mian_gift", "namespace": "custom", "key": "porduct_mian_gift", "type": "multi_line_text_field", "access": {"admin": "PUBLIC_READ_WRITE", "storefront": "PUBLIC_READ"}},
  // {"name": "product_main_replacement_filter", "namespace": "custom", "key": "product_main_replacement_filter", "type": "multi_line_text_field", "access": {"admin": "PUBLIC_READ_WRITE", "storefront": "PUBLIC_READ"}},
  // {"name": "product_main_point", "namespace": "custom", "key": "product_main_point", "type": "single_line_text_field", "access": {"admin": "PUBLIC_READ_WRITE", "storefront": "PUBLIC_READ"}},
  // {"name": "product_main_expires", "namespace": "custom", "key": "product_main_expires", "type": "single_line_text_field", "access": {"admin": "PUBLIC_READ_WRITE", "storefront": "PUBLIC_READ"}},
  // {"name": "product_main_description", "namespace": "custom", "key": "product_main_description", "type": "multi_line_text_field", "access": {"admin": "PUBLIC_READ_WRITE", "storefront": "PUBLIC_READ"}},
  // {"name": "product_main_video_url", "namespace": "custom", "key": "product_main_video_url", "type": "multi_line_text_field", "access": {"admin": "PUBLIC_READ_WRITE", "storefront": "PUBLIC_READ"}},
  // {"name": "product_main_receive", "namespace": "custom", "key": "product_main_receive", "type": "single_line_text_field", "access": {"admin": "PUBLIC_READ_WRITE", "storefront": "PUBLIC_READ"}},
  // {"name": "event_custom_persell_send_email", "namespace": "custom", "key": "event_custom_persell_send_email", "type": "boolean", "access": {"admin": "PUBLIC_READ_WRITE", "storefront": "PUBLIC_READ"}},
  // {"name": "event_custom_persell_time", "namespace": "custom", "key": "event_custom_persell_time", "type": "single_line_text_field", "access": {"admin": "PUBLIC_READ_WRITE", "storefront": "PUBLIC_READ"}},
  // {"name": "product_main_major_receive", "namespace": "custom", "key": "product_main_major_receive", "type": "single_line_text_field", "access": {"admin": "PUBLIC_READ_WRITE", "storefront": "PUBLIC_READ"}},
  // {"name": "event_show_service", "namespace": "custom", "key": "event_show_service", "type": "boolean", "access": {"admin": "PUBLIC_READ_WRITE", "storefront": "PUBLIC_READ"}},
  // {"name": "event_search_system", "namespace": "custom", "key": "event_search_system", "type": "boolean", "access": {"admin": "PUBLIC_READ_WRITE", "storefront": "PUBLIC_READ"}},
  // {"name": "product_mian_trade_in", "namespace": "custom", "key": "product_mian_trade_in", "type": "boolean", "access": {"admin": "PUBLIC_READ_WRITE", "storefront": "PUBLIC_READ"}},
  {"name": "Key Feature", "namespace": "custom", "key": "key_feature", "type": "rich_text_field", "access": {"admin": "PUBLIC_READ_WRITE", "storefront": "PUBLIC_READ"}},
  {"name": "推荐滤芯", "namespace": "custom", "key": "recommend_products", "type": "list.product_reference", "access": {"admin": "PUBLIC_READ_WRITE", "storefront": "PUBLIC_READ"}},
  {"name": "说明书链接", "namespace": "custom", "key": "user_manual_url", "type": "single_line_text_field", "access": {"admin": "PUBLIC_READ_WRITE", "storefront": "PUBLIC_READ"}},
  {"name": "youtube 视频列表", "namespace": "custom", "key": "product_main_youtube", "type": "list.single_line_text_field", "access": {"admin": "PUBLIC_READ_WRITE", "storefront": "PUBLIC_READ"}},
  {"name": "简短描述", "namespace": "custom", "key": "short_describe", "type": "multi_line_text_field", "access": {"admin": "PUBLIC_READ_WRITE", "storefront": "PUBLIC_READ"}},
  {"name": "悬停图片", "namespace": "custom", "key": "hover_image", "type": "file_reference", "validations": [{"name": "file_type_options", "value": "[\"Image\"]"}], "access": {"admin": "PUBLIC_READ_WRITE", "storefront": "PUBLIC_READ"}},
  {
    "name": "赠品",
    "namespace": "custom",
    "key": "gift_product",
    "type": "product_reference",
    "description": "",
    "validations": [],
    "access": {
      "admin": "PUBLIC_READ_WRITE",
      "storefront": "PUBLIC_READ"
    }
  },
  {
    "name": "赠品时间区间",
    "namespace": "custom",
    "key": "gift_date_range",
    "type": "list.date_time",
    "description": "第一个值为开始时间，第二个值为结束时间",
    "validations": [
      { "name": "list.max", "value": "2" }
    ],
    "access": {
      "admin": "PUBLIC_READ_WRITE",
      "storefront": "PUBLIC_READ"
    }
  },
  // {"name": "会员价", "namespace": "custom", "key": "member_price", "type": "single_line_text_field", "access": {"admin": "PUBLIC_READ_WRITE", "storefront": "PUBLIC_READ"}},
  // {"name": "会员折扣码", "namespace": "custom", "key": "member_code", "type": "single_line_text_field", "access": {"admin": "PUBLIC_READ_WRITE", "storefront": "PUBLIC_READ"}},
  // {"name": "product description for ai", "namespace": "custom", "key": "product_description_for_ai", "type": "multi_line_text_field", "access": {"admin": "PUBLIC_READ_WRITE", "storefront": "PUBLIC_READ"}},
  // --- 筛选用元字段 (storefront: NONE) ---
  // {"name": "Dispensing Option（用于筛选）", "namespace": "custom", "key": "dispensing_option_from_tags", "description": "用于产品筛选的 Dispensing Option 属性，数据来源于产品标签", "type": "list.single_line_text_field", "validations": [{"name": "choices", "value": "[\"Ambient Water\",\"Instant Hot Water\",\"Chilled Water\",\"Hot and Cold water\"]"}], "access": {"admin": "PUBLIC_READ_WRITE", "storefront": "NONE"}},
  // {"name": "Replacement for Brand（用于筛选）", "namespace": "custom", "key": "replacement_for_brand_from_tags", "description": "用于产品筛选的 Replacement for Brand 属性，数据来源于产品标签", "type": "list.single_line_text_field", "validations": [{"name": "choices", "value": "[\"Samsung\",\"LG\",\"GE\",\"Kenmore\",\"Everydrop for Whirlpool\",\"Frigidaire\",\"Maytag\",\"KitchenAid\",\"Fisher & Paykel\",\"Electrolux\",\"Bosch\",\"Amana\",\"Filtrete\",\"Culligan\",\"Insinkerator\",\"3M™ Aqua-Pure™\",\"Brita\",\"PUR\",\"Berkey\",\"De'Longhi\",\"Aquasana\",\"DuPont\"]"}], "access": {"admin": "PUBLIC_READ_WRITE", "storefront": "NONE"}},
  // {"name": "Family Size（用于筛选）", "namespace": "custom", "key": "family_size_from_tags", "description": "用于产品筛选的 Family Size 属性，数据来源于产品标签", "type": "list.single_line_text_field", "validations": [{"name": "choices", "value": "[\"1-3\",\"4-6\",\"7+\"]"}], "access": {"admin": "PUBLIC_READ_WRITE", "storefront": "NONE"}},
  // {"name": "Product Type（用于筛选）", "namespace": "custom", "key": "product_type_from_tags", "description": "用于产品筛选的 Product Type 属性，数据来源于产品标签", "type": "list.single_line_text_field", "validations": [{"name": "choices", "value": "[\"System\",\"Replacement filter\",\"Kit & Accessory\",\"King tank series\",\"Faucet water filter\",\"Coffee water filter\",\"Camping & Emergency filter\",\"RV water filter\",\"Pool & Spa filter\",\"Garden water filter\",\"Car wash filter\",\"Pre-filtration system\",\"Scale inhibitor\",\"Electric Pitchers\",\"Pitchers&Dispensers\",\"Gravity-fed Water Filters\",\"Faucet Water Filters\",\"Coffee Water Filters\",\"Reverse Osmosis Systems\",\"Bottleless Water Dispenser\",\"Undersink filters\",\"Outdoor filters\",\"Whloe House Filters\",\"Refrigerator Filters\"]"}], "access": {"admin": "PUBLIC_READ_WRITE", "storefront": "NONE"}},
  // {"name": "Capacity（用于筛选）", "namespace": "custom", "key": "capacity_from_tags", "description": "用于产品筛选的 Capacity 属性，数据来源于产品标签", "type": "list.single_line_text_field", "validations": [{"name": "choices", "value": "[\"400 GPD\",\"600 GPD\",\"800 GPD\",\"1200 GPD\",\"1600 GPD\",\"450 GPD\",\"500 GPD\",\"700 GPD\"]"}], "access": {"admin": "PUBLIC_READ_WRITE", "storefront": "NONE"}},
  // {"name": "Filtration Type（用于筛选）", "namespace": "custom", "key": "filtration_type_from_tags", "description": "用于产品筛选的 Filtration Type 属性，数据来源于产品标签", "type": "list.single_line_text_field", "validations": [{"name": "choices", "value": "[\"With UV sterilizer\",\"Ultrafiltration\",\"Alkaline\",\"Reduce Chloramine\",\"Mineral-enhanced RO\",\"RO\",\"Ultra-filtration\",\"Carbon\",\"No Filtration\"]"}], "access": {"admin": "PUBLIC_READ_WRITE", "storefront": "NONE"}},
  // {"name": "Certification（用于筛选）", "namespace": "custom", "key": "certification_from_tags", "description": "用于产品筛选的 Certification 属性，数据来源于产品标签", "type": "list.single_line_text_field", "validations": [{"name": "choices", "value": "[\"NSF 58 & 372\",\"SGS\",\"NSF 53\",\"NSF 401\",\"NSF 42 & 372\",\"NSF 42\",\"NSF 58\",\"NSF 372\",\"NSF 42 & 58 & 372\",\"NSF 42 & 53 & 58 & 372\"]"}], "access": {"admin": "PUBLIC_READ_WRITE", "storefront": "NONE"}},
  // {"name": "Remineralization（用于筛选）", "namespace": "custom", "key": "remineralization_from_tags", "description": "用于产品筛选的 Remineralization 属性，数据来源于产品标签", "type": "list.single_line_text_field", "validations": [{"name": "choices", "value": "[\"Remineralization RO water\",\"Mineral\",\"Alkaline\"]"}], "access": {"admin": "PUBLIC_READ_WRITE", "storefront": "NONE"}},
  // {"name": "Replacement For（用于筛选）", "namespace": "custom", "key": "replacement_for_from_tags", "description": "用于产品筛选的 Replacement For 属性，数据来源于产品标签", "type": "list.single_line_text_field", "validations": [{"name": "choices", "value": "[\"Undersink RO\",\"Countertop RO\",\"Electric Pitchers\",\"Gravity-fed filters\",\"Other Pitchers\",\"Undersink filters\",\"Outdoor filters\",\"Whloe House filters\",\"Pitchers & Dispensers\",\"Bottleless Water Dispenser\"]"}], "access": {"admin": "PUBLIC_READ_WRITE", "storefront": "NONE"}},
  // {"name": "Series（用于筛选）", "namespace": "custom", "key": "series_from_tags", "description": "用于产品筛选的 Series 属性，数据来源于产品标签", "type": "list.single_line_text_field", "validations": [{"name": "choices", "value": "[\"Waterdrop X series\",\"Waterdrop G series\",\"Waterdrop D series\",\"Waterdrop H series\",\"Waterdrop N series\",\"Waterdrop K series\",\"Waterdrop A series\",\"Waterdrop CoreRO series\",\"Refurbished series\",\"Waterdrop T series\",\"Waterdrop G3 series\",\"Waterdrop G2 series\",\"Waterdrop G5 series\",\"Waterdrop M series\",\"Waterdrop Y1CH series\"]"}], "access": {"admin": "PUBLIC_READ_WRITE", "storefront": "NONE"}},
  // {"name": "Color（用于筛选）", "namespace": "custom", "key": "color_from_tags", "description": "用于产品筛选的 Color 属性，数据来源于产品标签", "type": "list.single_line_text_field", "validations": [{"name": "choices", "value": "[\"Silver\",\"Black\",\"White\",\"Blue\",\"Pink\",\"Yellow\"]"}], "access": {"admin": "PUBLIC_READ_WRITE", "storefront": "NONE"}},
  // --- seo namespace ---
  // {"name": "seo.hidden", "namespace": "seo", "key": "hidden", "type": "number_integer", "access": {"admin": "PUBLIC_READ_WRITE", "storefront": "PUBLIC_READ"}},
  // --- mm-google-shopping namespace ---
  // {"name": "Google: Custom Product", "namespace": "mm-google-shopping", "key": "custom_product", "description": "Use to indicate whether or not the unique product identifiers (UPIs) GTIN, MPN, and brand are available for your product.", "type": "boolean", "access": {"admin": "PUBLIC_READ_WRITE", "storefront": "NONE"}},
  // --- shopify--discovery namespace ---
  // {"name": "Search product boosts", "namespace": "shopify--discovery--product_search_boost", "key": "queries", "description": "List of search queries for which a product gets higher rank in search results", "type": "list.single_line_text_field", "validations": [{"name": "max", "value": "100"}, {"name": "list.max", "value": "10"}], "access": {"admin": "PUBLIC_READ_WRITE", "storefront": "PUBLIC_READ"}},
  // {"name": "Related products", "namespace": "shopify--discovery--product_recommendation", "key": "related_products", "description": "List of related products", "type": "list.product_reference", "validations": [{"name": "list.max", "value": "10"}], "access": {"admin": "PUBLIC_READ_WRITE", "storefront": "PUBLIC_READ"}},
  // {"name": "Related products settings", "namespace": "shopify--discovery--product_recommendation", "key": "related_products_display", "description": "Determines how related products are displayed along with algorithmic product recommendations", "type": "single_line_text_field", "validations": [{"name": "choices", "value": "[\"ahead\",\"only manual\"]"}], "access": {"admin": "PUBLIC_READ_WRITE", "storefront": "PUBLIC_READ"}},
  // {"name": "Complementary products", "namespace": "shopify--discovery--product_recommendation", "key": "complementary_products", "description": "List of complementary products", "type": "list.product_reference", "validations": [{"name": "list.max", "value": "10"}], "access": {"admin": "PUBLIC_READ_WRITE", "storefront": "PUBLIC_READ"}},
]

// ========== GraphQL Mutation ==========
const MUTATION = `
mutation CreateMetafieldDefinition($definition: MetafieldDefinitionInput!) {
  metafieldDefinitionCreate(definition: $definition) {
    createdDefinition {
      id
      name
      namespace
      key
      type { name }
    }
    userErrors {
      field
      message
      code
    }
  }
}
`

async function createMetafieldDefinition(definition) {
  const defPayload = {
    name: definition.name,
    namespace: definition.namespace,
    key: definition.key,
    description: definition.description ?? '',
    type: definition.type,
    ownerType: 'PRODUCT'
  }
  if (definition.validations) {
    defPayload.validations = definition.validations
  }

  const response = await fetch(URL, {
    method: 'POST',
    headers: HEADERS,
    body: JSON.stringify({
      query: MUTATION,
      variables: { definition: defPayload },
    }),
  })
  return response.json()
}

async function main() {
  const success = []
  const failed = []

  for (const defn of METAFIELD_DEFINITIONS) {
    const result = await createMetafieldDefinition(defn)
    const errors = result.data?.metafieldDefinitionCreate?.userErrors ?? []
    const created = result.data?.metafieldDefinitionCreate?.createdDefinition

    if (created && errors.length === 0) {
      console.log(`✅ 创建成功: ${defn.namespace}.${defn.key}`)
      success.push(defn.key)
    } else {
      console.log(`❌ 创建失败: ${defn.namespace}.${defn.key} -> ${JSON.stringify(errors)}`)
      failed.push({ key: defn.key, errors })
    }
  }

  console.log(`\n完成！成功: ${success.length} 个，失败: ${failed.length} 个`)
  if (failed.length > 0) {
    console.log('失败列表:', JSON.stringify(failed, null, 2))
  }
}

main().catch((err) => {
  console.error(err)
  process.exitCode = 1
})
