const fs = require("fs");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const LOG_FILE_NAME = `sync_product_metafields_log_${new Date().toISOString().replace(/[:.]/g, "-")}.txt`;
const LOG_FILE_PATH = path.join(__dirname, "..", LOG_FILE_NAME);

function formatLogValue(value) {
  if (value instanceof Error) {
    return value.stack ?? value.message;
  }

  if (typeof value === "string") {
    return value;
  }

  return JSON.stringify(value, null, 2);
}

function writeLog(level, values) {
  const message = values.map(formatLogValue).join(" ");
  fs.appendFileSync(LOG_FILE_PATH, `[${new Date().toISOString()}] [${level}] ${message}\n`, "utf8");
}

function log(...values) {
  console.log(...values);
  writeLog("INFO", values);
}

function logError(...values) {
  console.error(...values);
  writeLog("ERROR", values);
}

const SHOP_DOMAIN_S = process.env.SHOPIFY_SHOP_DOMAIN;
const SHOP_DOMAIN_U = process.env.SHOPIFY_SHOP_DOMAIN_U;
const ACCESS_TOKEN_S = process.env.SHOPIFY_ACCESS_TOKEN;
const ACCESS_TOKEN_U = process.env.SHOPIFY_ACCESS_TOKEN_U;
const API_VERSION = process.env.SHOPIFY_API_VERSION || "2025-01";

if (!SHOP_DOMAIN_S || !SHOP_DOMAIN_U || !ACCESS_TOKEN_S || !ACCESS_TOKEN_U) {
  logError("缺少环境变量：请在项目根目录创建 .env（可参考 .env.example），设置 SHOPIFY_SHOP_DOMAIN 与 SHOPIFY_ACCESS_TOKEN。");
  process.exit(1);
}

const HEADERS_S = {
  "Content-Type": "application/json",
  "X-Shopify-Access-Token": ACCESS_TOKEN_S,
};

const HEADERS_U = {
  "Content-Type": "application/json",
  "X-Shopify-Access-Token": ACCESS_TOKEN_U,
};

const URL_S = `https://${SHOP_DOMAIN_S}/admin/api/${API_VERSION}/graphql.json`;
const URL_U = `https://${SHOP_DOMAIN_U}/admin/api/${API_VERSION}/graphql.json`;

// 元字段在这里修改
// "custom.product_description_for_ai"
const PRODUCT_METAFIELDS_QUERY = `
query ProductMetafields($id: ID!) {
  product(id: $id) {
    id
    metafields(
      first: 50
      keys: [
        "custom.key_feature",
        "custom.user_manual_url",
        "custom.product_main_youtube",
        "custom.short_describe",
        "custom.event_product_sku",
      ]
    ) {
      nodes {
        namespace
        key
        value
        type
      }
    }
  }
}
`;

const PRODUCT_METAFIELDS_UPDATE_MUTATION = `
mutation UpdateProductWithMetafields($product: ProductUpdateInput!) {
  productUpdate(product: $product) {
    product {
      id
      title
      metafields(first: 20) {
        edges {
          node {
            id
            namespace
            key
            type
            value
          }
        }
      }
    }
    userErrors {
      field
      message
    }
  }
}
`;

// id 是 Shopify 产品 ID，例如：1234567890
// Example:
// const productIdPairs = [
//   { updateProductId: '1', searchProductId: '1' },
//   { updateProductId: '2', searchProductId: '2' },
// ]
const productIdPairs = [
];

function toProductGid(productId) {
  return `gid://shopify/Product/${productId}`;
}

function normalizeMetafieldKey(key) {
  return key.replace(/^custom\./, "");
}

function transformProductMetafields(result, updateProductId) {
  const nodes = result.data?.product?.metafields?.nodes ?? [];

  return {
    product: {
      id: toProductGid(updateProductId),
      metafields: nodes.map((node) => ({
        namespace: node.namespace,
        key: normalizeMetafieldKey(node.key),
        value: node.value,
        type: node.type,
      })),
    },
  };
}

async function syncProductMetafields(searchProductId, updateProductId) {
  const response = await fetch(URL_S, {
    method: "POST",
    headers: HEADERS_S,
    body: JSON.stringify({
      query: PRODUCT_METAFIELDS_QUERY,
      variables: { id: toProductGid(searchProductId) },
    }),
  });

  const result = await response.json();

  if (!response.ok || result.errors?.length) {
    throw new Error(`查询产品 ${searchProductId} 失败：${JSON.stringify(result.errors ?? result)}`);
  }

  if (!result.data?.product) {
    throw new Error(`查询产品 ${searchProductId} 失败：未找到 product`);
  }

  const mutationPayload = transformProductMetafields(result, updateProductId);
  const mutationResponse = await fetch(URL_U, {
    method: "POST",
    headers: HEADERS_U,
    body: JSON.stringify({
      query: PRODUCT_METAFIELDS_UPDATE_MUTATION,
      variables: mutationPayload,
    }),
  });
  const mutationResult = await mutationResponse.json();

  if (!mutationResponse.ok || mutationResult.errors?.length) {
    throw new Error(`更新产品 ${updateProductId} 失败：${JSON.stringify(mutationResult.errors ?? mutationResult)}`);
  }

  const userErrors = mutationResult.data?.productUpdate?.userErrors ?? [];
  if (userErrors.length > 0) {
    throw new Error(`更新产品 ${updateProductId} 失败：${JSON.stringify(userErrors)}`);
  }

  return mutationPayload;
}

async function main() {
  const products = [];
  const failed = [];

  log(`日志文件: ${LOG_FILE_PATH}`);

  for (const { updateProductId, searchProductId } of productIdPairs) {
    try {
      const product = await syncProductMetafields(searchProductId, updateProductId);
      products.push({ updateProductId, searchProductId });
      log(`同步成功: ${searchProductId} -> ${updateProductId}`);
      log(`元字段: ${JSON.stringify(product, null, 2)}`);
    } catch (error) {
      failed.push({ updateProductId, searchProductId, message: error.message });
      logError(error.message);
    }
  }

  log(JSON.stringify({ products, failed }, null, 2));
}

main().catch((error) => {
  logError(error);
  process.exitCode = 1;
});
