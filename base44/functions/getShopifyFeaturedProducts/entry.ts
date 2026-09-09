import { secrets } from "base44:runtime";

const SHOPIFY_API_VERSION = "2025-01";

export default async function(req) {
  try {
    const domain = secrets.get("SHOPIFY_STORE_DOMAIN");
    const token = secrets.get("SHOPIFY_STOREFRONT_ACCESS_TOKEN");

    if (!domain || !token) {
      return Response.json(
        { error: "Shopify credentials not configured" },
        { status: 500 }
      );
    }

    const cleanDomain = domain.replace(/^https?:\/\//, "").replace(/\/$/, "");
    const endpoint = `https://${cleanDomain}/api/${SHOPIFY_API_VERSION}/graphql.json`;
    console.log("Shopify debug:", { domain: cleanDomain, tokenPrefix: token?.slice(0, 6), tokenLen: token?.length });

    // Fetch first 6 products with image, price, and online store URL
    const query = `
      query FeaturedProducts {
        products(first: 6, sortKey: CREATED, reverse: true) {
          edges {
            node {
              id
              title
              handle
              onlineStoreUrl
              availableForSale
              priceRange {
                minVariantPrice {
                  amount
                  currencyCode
                }
              }
              compareAtPriceRange {
                minVariantPrice {
                  amount
                  currencyCode
                }
              }
              featuredImage {
                url
                altText
              }
            }
          }
        }
      }
    `;

    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Storefront-Access-Token": token,
      },
      body: JSON.stringify({ query }),
    });

    if (!res.ok) {
      const text = await res.text();
      return Response.json(
        { error: `Shopify API error: ${res.status}`, details: text },
        { status: 502 }
      );
    }

    const json = await res.json();

    if (json.errors) {
      return Response.json(
        { error: "Shopify GraphQL error", details: json.errors },
        { status: 502 }
      );
    }

    const edges = json.data?.products?.edges || [];

    const products = edges
      .map((e) => e.node)
      .filter((n) => n.availableForSale !== false)
      .map((n) => {
        const price = parseFloat(n.priceRange?.minVariantPrice?.amount || "0");
        const compareAt = n.compareAtPriceRange?.minVariantPrice?.amount
          ? parseFloat(n.compareAtPriceRange.minVariantPrice.amount)
          : null;
        return {
          id: n.id,
          name: n.title,
          handle: n.handle,
          url: n.onlineStoreUrl || `https://${domain}/products/${n.handle}`,
          image_url: n.featuredImage?.url || null,
          image_alt: n.featuredImage?.altText || n.title,
          price,
          compare_at_price: compareAt,
          currency: n.priceRange?.minVariantPrice?.currencyCode || "USD",
          on_sale: compareAt && compareAt > price,
        };
      });

    return Response.json({ products });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}