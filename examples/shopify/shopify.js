const { Reshuffle } = require('reshuffle')
const { ShopifyConnector } = require('reshuffle-shopify-connector')

// This example uses reshuffle-shopify-connector
// Code and documentation available on Github: https://github.com/reshufflehq/reshuffle-shopify-connector

// Create an API token from your Shopify Admin Page:
// 1. Go to https://<your_shop_name>.myshopify.com/admin/apps/private
// 2. Click `Create new private app`,
// 3. Provide a name and scopes (keeping in mind that permissions are very limited per default)
// 4. Click Save, and you'll get api key and password

const app = new Reshuffle()
const connector = new ShopifyConnector(app, {
  shopName: '<your_shop_name>',
  apiKey: '<your_shopify_private_app_api_key>',
  password: '<your_shopify_private_app_password>',
  baseURL: '<your_runtime_base_url>',
})

connector.on({ topic: 'orders/fulfilled' }, async (event, app) => {
  console.log(event.topic) // 'orders/fulfilled'
  console.log(event) // { id: '<order_id>', ... }
})

async function main() {
  const orders = await connector.sdk().order.list({ limit: 5 })
  console.log(orders)

  const country = await connector.sdk().country.create({ code: 'FR', tax: 0.25 })
  console.log(country) // { id: 381258858693, name: 'France', tax: 0.25, code: 'FR', tax_name: 'FR TVA', provinces: [] }

  const products = await connector.sdk().product.list()
  console.log(products) // [{ id: 6095693840581, title: 'Reshuffle cap', created_at: '2020-11-23T15:23:09+13:00', published_scope: 'web', admin_graphql_api_id: 'gid://shopify/Product/6095693840581', ... }]

  // See full list of Shopify client actions: https://www.npmjs.com/package/shopify-api-node#available-resources-and-methods
}

app.start()

main()
