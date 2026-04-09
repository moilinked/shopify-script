import requests
import json

# ========== 配置 ==========
SHOP_DOMAIN = "your-store.myshopify.com"  # 替换为目标商店域名
ACCESS_TOKEN = "your-access-token"         # 替换为目标商店 Admin API Token
API_VERSION = "2025-01"

HEADERS = {
    "Content-Type": "application/json",
    "X-Shopify-Access-Token": ACCESS_TOKEN,
}
URL = f"https://{SHOP_DOMAIN}/admin/api/{API_VERSION}/graphql.json"

# ========== 产品变体元字段定义数据 ==========
METAFIELD_DEFINITIONS = [
    {"name": "折扣码", "namespace": "custom", "key": "variant_discount_code", "type": "single_line_text_field", "access": {"admin": "PUBLIC_READ_WRITE", "storefront": "PUBLIC_READ"}},
    {"name": "折扣价", "namespace": "custom", "key": "variant_price_discount", "type": "money", "access": {"admin": "PUBLIC_READ_WRITE", "storefront": "PUBLIC_READ"}},
    {"name": "折扣显示样式", "namespace": "custom", "key": "show_percentage_amount", "description": "默认展示直降金额", "type": "single_line_text_field", "validations": [{"name": "choices", "value": "[\"amount\",\"percentage\"]"}], "access": {"admin": "PUBLIC_READ_WRITE", "storefront": "PUBLIC_READ"}},
]

OWNER_TYPE = "PRODUCTVARIANT"

# ========== GraphQL: 创建 ==========
CREATE_MUTATION = """
mutation CreateMetafieldDefinition($definition: MetafieldDefinitionInput!) {
  metafieldDefinitionCreate(definition: $definition) {
    createdDefinition { id name namespace key }
    userErrors { field message code }
  }
}
"""

# ========== GraphQL: 查询已有定义 ID ==========
QUERY_EXISTING = """
query GetMetafieldDefinition($ownerType: MetafieldOwnerType!, $namespace: String!, $key: String!) {
  metafieldDefinitions(ownerType: $ownerType, namespace: $namespace, key: $key, first: 1) {
    edges {
      node { id name }
    }
  }
}
"""

# ========== GraphQL: 更新名称 ==========
UPDATE_MUTATION = """
mutation UpdateMetafieldDefinition($definition: MetafieldDefinitionUpdateInput!, $id: ID!) {
  metafieldDefinitionUpdate(definition: $definition, id: $id) {
    updatedDefinition { id name namespace key }
    userErrors { field message code }
  }
}
"""

def graphql(query, variables):
    response = requests.post(URL, headers=HEADERS, json={"query": query, "variables": variables})
    return response.json()

def create_definition(defn):
    return graphql(CREATE_MUTATION, {
        "definition": {
            "name": defn["name"],
            "namespace": defn["namespace"],
            "key": defn["key"],
            "description": defn.get("description", ""),
            "type": defn["type"],
            "ownerType": OWNER_TYPE,
            "access": defn["access"],
            **({"validations": defn["validations"]} if "validations" in defn else {}),
        }
    })

def find_existing(namespace, key):
    """查询已存在的元字段定义，返回 (id, name) 或 None"""
    result = graphql(QUERY_EXISTING, {
        "ownerType": OWNER_TYPE,
        "namespace": namespace,
        "key": key,
    })
    edges = result.get("data", {}).get("metafieldDefinitions", {}).get("edges", [])
    if edges:
        node = edges[0]["node"]
        return node["id"], node["name"]
    return None

def update_definition(definition_id, defn):
    return graphql(UPDATE_MUTATION, {
        "id": definition_id,
        "definition": {
            "name": defn["name"],
            "description": defn.get("description", ""),
        }
    })

# ========== 执行 ==========
success_create, success_update, failed = [], [], []

for defn in METAFIELD_DEFINITIONS:
    label = f"{defn['namespace']}.{defn['key']}"

    # 1. 尝试创建
    result = create_definition(defn)
    errors = result.get("data", {}).get("metafieldDefinitionCreate", {}).get("userErrors", [])
    created = result.get("data", {}).get("metafieldDefinitionCreate", {}).get("createdDefinition")

    if created and not errors:
        print(f"✅ 创建成功: {label} -> \"{defn['name']}\"")
        success_create.append(label)
        continue

    # 2. 判断是否为 key 重复错误
    is_duplicate = any(
        e.get("code") in ("TAKEN", "DUPLICATE", "already_exists") or "taken" in e.get("message", "").lower() or "already" in e.get("message", "").lower()
        for e in errors
    )

    if is_duplicate:
        # 3. 查找已有定义
        existing = find_existing(defn["namespace"], defn["key"])
        if existing:
            existing_id, existing_name = existing
            if existing_name == defn["name"]:
                print(f"⏭️  跳过（名称已一致）: {label} -> \"{existing_name}\"")
                success_update.append(label)
                continue

            # 4. 更新名称
            update_result = update_definition(existing_id, defn)
            update_errors = update_result.get("data", {}).get("metafieldDefinitionUpdate", {}).get("userErrors", [])
            updated = update_result.get("data", {}).get("metafieldDefinitionUpdate", {}).get("updatedDefinition")

            if updated and not update_errors:
                print(f"✏️  已更新名称: {label} \"{existing_name}\" -> \"{defn['name']}\"")
                success_update.append(label)
            else:
                print(f"❌ 更新失败: {label} -> {update_errors}")
                failed.append({"key": label, "errors": update_errors})
        else:
            print(f"❌ 重复但未找到已有定义: {label} -> {errors}")
            failed.append({"key": label, "errors": errors})
    else:
        print(f"❌ 创建失败（非重复错误）: {label} -> {errors}")
        failed.append({"key": label, "errors": errors})

# ========== 汇总 ==========
print(f"\n{'='*50}")
print(f"✅ 新建成功: {len(success_create)} 个")
print(f"✏️  更新名称: {len(success_update)} 个")
print(f"❌ 失败:     {len(failed)} 个")
if failed:
    print("失败详情:", json.dumps(failed, ensure_ascii=False, indent=2))
