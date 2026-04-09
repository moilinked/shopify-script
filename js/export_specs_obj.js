const fs = require("fs");
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
const METAOBJECT_TYPE = "specs_obj";
const OUTPUT_FILE = "specs_obj_data.json";

const URL = `https://${SHOP_DOMAIN}/admin/api/${API_VERSION}/graphql.json`;
const HEADERS = {
  "Content-Type": "application/json",
  "X-Shopify-Access-Token": ACCESS_TOKEN,
};

const QUERY = `
query GetMetaobjects($type: String!, $after: String) {
  metaobjects(type: $type, first: 50, after: $after) {
    pageInfo {
      hasNextPage
      endCursor
    }
    edges {
      node {
        id
        handle
        displayName
        fields {
          key
          value
          type
        }
      }
    }
  }
}
`;

async function graphql(query, variables = {}) {
  const res = await fetch(URL, {
    method: "POST",
    headers: HEADERS,
    body: JSON.stringify({ query, variables }),
  });
  return res.json();
}

async function fetchAll() {
  const allItems = [];
  let cursor = null;

  while (true) {
    const data = await graphql(QUERY, { type: METAOBJECT_TYPE, after: cursor });
    const result = data?.data?.metaobjects ?? {};
    const edges = result.edges ?? [];
    const pageInfo = result.pageInfo ?? {};

    for (const edge of edges) {
      allItems.push(edge.node);
    }

    console.log(`  已获取 ${allItems.length} 条...`);

    if (pageInfo.hasNextPage) {
      cursor = pageInfo.endCursor;
    } else {
      break;
    }
  }

  return allItems;
}

async function main() {
  console.log(`开始导出 ${METAOBJECT_TYPE} 元对象数据...`);
  const items = await fetchAll();
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(items, null, 2), "utf-8");
  console.log(`\n✅ 导出完成！共 ${items.length} 条，已保存到: ${OUTPUT_FILE}`);
}

main().catch(console.error);
