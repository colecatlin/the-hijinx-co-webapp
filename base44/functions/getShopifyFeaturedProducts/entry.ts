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

    // Parse parameters (backward compatible — no body = newest, 6 products)
    let mode = "newest";
    let collectionHandle = "";
    let count = 6;
    try {
      const body = await req.json();
      mode = body.mode || "newest";
      collectionHandle = body.collectionHandle || "";
      count = Math.min(Math.max(body.count || 6, 1), 12);
    } catch {
      // No body — use defaults
    }

    const productFields = `
      id
      title
      handle
      onlineStoreUrl
      availableForSale
      createdAt
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
    `;

    let edges = [];

    // Collection mode — query by handle
    if (mode === "collection" && collectionHandle) {
      const query = `
        query CollectionProducts($handle: String!, $count: Int!) {
          collectionByHandle(handle: $handle) {
            products(first: $count, sortKey: CREATED_AT, reverse: true) {
              edges {
                node {
                  ${productFields}
                }
              }
            }
          }
        }
      `;

      try {
        const res = await fetch(endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Shopify-Storefront-Access-Token": token,
          },
          body: JSON.stringify({ query, variables: { handle: collectionHandle, count } }),
        });

        if (res.ok) {
          const json = await res.json();
          if (!json.errors) {
            edges = json.data?.collectionByHandle?.products?.edges || [];
          }
        }
      } catch {
        // Fall through to newest
      }
      // Fall back to newest if collection not found or empty
    }

    // Newest mode (or fallback from empty collection)
    if (edges.length === 0) {
      const query = `
        query FeaturedProducts($count: Int!) {
          products(first: $count, sortKey: CREATED_AT, reverse: true) {
            edges {
              node {
                ${productFields}
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
        body: JSON.stringify({ query, variables: { count } }),
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

      edges = json.data?.products?.edges || [];
    }

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
          created_at: n.createdAt || null,
        };
      });

    return Response.json({ products });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}