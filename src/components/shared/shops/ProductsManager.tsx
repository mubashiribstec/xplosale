"use client";

import { useState, useEffect, useCallback, useRef } from "react";

interface ProductImage {
  id: string;
  url: string;
  order: number;
}

interface Product {
  id: string;
  name: string;
  description: string | null;
  priceMin: number | null;
  priceMax: number | null;
  currency: string;
  isHidden: boolean;
  images: ProductImage[];
}

interface ProductsManagerProps {
  shopId: string;
  maxProducts: number;
  maxImagesPerProduct: number;
  planKey: string;
  onProductsChange?: (count: number) => void;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024;

export default function ProductsManager({
  shopId,
  maxProducts,
  maxImagesPerProduct,
  planKey,
  onProductsChange,
}: ProductsManagerProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/shops/${shopId}/products`);
      const json = await res.json() as { ok: boolean; data?: Product[] };
      if (json.ok && json.data) setProducts(json.data);
    } finally {
      setLoading(false);
    }
  }, [shopId]);

  useEffect(() => { void fetchProducts(); }, [fetchProducts]);

  useEffect(() => {
    if (!loading) onProductsChange?.(products.length);
  }, [products.length, loading, onProductsChange]);

  const atLimit = products.length >= maxProducts;

  return (
    <div style={{ fontFamily: "var(--body)" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <div>
          <p style={{ fontSize: 13, fontWeight: 600, color: "var(--ink-soft)", margin: 0 }}>
            Products
          </p>
          <p style={{ fontSize: 12, color: "var(--ink-faint)", margin: "2px 0 0" }}>
            {products.length} / {maxProducts} on {planKey === "FREE" ? "Free" : "Premium"} plan
          </p>
        </div>
        {!atLimit && !showAdd && (
          <button
            type="button"
            onClick={() => setShowAdd(true)}
            style={addBtnStyle}
          >
            + Add product
          </button>
        )}
      </div>

      {atLimit && planKey === "FREE" && (
        <div style={{
          padding: "12px 16px", background: "rgba(160,78,55,.06)", borderRadius: 10,
          fontSize: 13, color: "var(--clay)", marginBottom: 14,
        }}>
          You've reached the {maxProducts}-product limit on the Free plan.{" "}
          <strong>Upgrade to Premium</strong> to list up to 30 products.
        </div>
      )}

      {showAdd && (
        <AddProductForm
          shopId={shopId}
          onCreated={(p) => {
            setProducts((prev) => [...prev, p]);
            setShowAdd(false);
            setExpandedId(p.id);
          }}
          onCancel={() => setShowAdd(false)}
        />
      )}

      {loading && products.length === 0 ? (
        <p style={{ fontSize: 13, color: "var(--ink-faint)" }}>Loading…</p>
      ) : products.length === 0 ? (
        <p style={{ fontSize: 13, color: "var(--ink-faint)" }}>
          No products yet. Add your first product above.
        </p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {products.map((p) => (
            <ProductCard
              key={p.id}
              product={p}
              shopId={shopId}
              maxImagesPerProduct={maxImagesPerProduct}
              expanded={expandedId === p.id}
              onToggleExpand={() => setExpandedId((cur) => cur === p.id ? null : p.id)}
              onUpdated={(updated) => setProducts((prev) => prev.map((x) => x.id === updated.id ? updated : x))}
              onDeleted={() => setProducts((prev) => prev.filter((x) => x.id !== p.id))}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Add Product Form ────────────────────────────────────────────────────────

function AddProductForm({
  shopId,
  onCreated,
  onCancel,
}: {
  shopId: string;
  onCreated: (p: Product) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [priceMin, setPriceMin] = useState("");
  const [priceMax, setPriceMax] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/shops/${shopId}/products`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || undefined,
          priceMin: priceMin ? parseFloat(priceMin) : undefined,
          priceMax: priceMax ? parseFloat(priceMax) : undefined,
          currency: "PKR",
        }),
      });
      const json = await res.json() as { ok: boolean; data?: Product; error?: string };
      if (!res.ok || !json.ok || !json.data) {
        setError(json.error ?? "Failed to add product");
        return;
      }
      onCreated(json.data);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        background: "var(--paper-2)", borderRadius: 12, padding: "16px",
        marginBottom: 10, display: "flex", flexDirection: "column", gap: 10,
      }}
    >
      <p style={{ fontWeight: 600, fontSize: 14, color: "var(--ink)", margin: 0 }}>New Product</p>

      <input
        type="text" value={name} onChange={(e) => setName(e.target.value)}
        placeholder="Product name *" required maxLength={120}
        style={inputStyle}
      />
      <textarea
        value={description} onChange={(e) => setDescription(e.target.value)}
        placeholder="Description (optional)" maxLength={1000} rows={2}
        style={{ ...inputStyle, resize: "vertical" }}
      />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <input
          type="number" value={priceMin} onChange={(e) => setPriceMin(e.target.value)}
          placeholder="Min price (PKR)" min="0" step="any"
          style={inputStyle}
        />
        <input
          type="number" value={priceMax} onChange={(e) => setPriceMax(e.target.value)}
          placeholder="Max price (PKR)" min="0" step="any"
          style={inputStyle}
        />
      </div>
      {error && <p style={{ fontSize: 12, color: "var(--clay)", margin: 0 }}>{error}</p>}
      <div style={{ display: "flex", gap: 8 }}>
        <button type="submit" disabled={saving || !name.trim()} style={primaryBtnStyle}>
          {saving ? "Adding…" : "Add product"}
        </button>
        <button type="button" onClick={onCancel} style={ghostBtnStyle}>Cancel</button>
      </div>
    </form>
  );
}

// ── Product Card ────────────────────────────────────────────────────────────

function ProductCard({
  product,
  shopId,
  maxImagesPerProduct,
  expanded,
  onToggleExpand,
  onUpdated,
  onDeleted,
}: {
  product: Product;
  shopId: string;
  maxImagesPerProduct: number;
  expanded: boolean;
  onToggleExpand: () => void;
  onUpdated: (p: Product) => void;
  onDeleted: () => void;
}) {
  const [deleting, setDeleting] = useState(false);
  const [editing, setEditing] = useState(false);

  async function handleDelete() {
    if (!confirm(`Delete "${product.name}"? This cannot be undone.`)) return;
    setDeleting(true);
    try {
      await fetch(`/api/shops/${shopId}/products/${product.id}`, { method: "DELETE" });
      onDeleted();
    } finally {
      setDeleting(false);
    }
  }

  const priceLabel =
    product.priceMin != null
      ? product.priceMax != null && product.priceMax !== product.priceMin
        ? `PKR ${product.priceMin.toLocaleString()} – ${product.priceMax.toLocaleString()}`
        : `PKR ${product.priceMin.toLocaleString()}`
      : null;

  return (
    <div style={{ border: "1px solid var(--line)", borderRadius: 12, overflow: "hidden" }}>
      {/* Header row */}
      <div
        style={{
          display: "flex", alignItems: "center", gap: 10, padding: "12px 14px",
          background: "var(--white)", cursor: "pointer",
        }}
        onClick={onToggleExpand}
      >
        {product.images[0] ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={product.images[0].url}
            alt={product.name}
            style={{ width: 40, height: 40, borderRadius: 6, objectFit: "cover", flexShrink: 0 }}
          />
        ) : (
          <div style={{
            width: 40, height: 40, borderRadius: 6, background: "var(--paper-2)",
            flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 18,
          }}>🛍️</div>
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontWeight: 600, fontSize: 14, color: "var(--ink)", margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {product.name}
          </p>
          {priceLabel && (
            <p style={{ fontSize: 12, color: "var(--ink-faint)", margin: 0 }}>{priceLabel}</p>
          )}
        </div>
        <span style={{ fontSize: 12, color: "var(--ink-faint)" }}>
          {product.images.length} img{product.images.length !== 1 ? "s" : ""} · {expanded ? "▲" : "▼"}
        </span>
      </div>

      {/* Expanded section */}
      {expanded && (
        <div style={{ borderTop: "1px solid var(--line)", padding: "14px", background: "var(--paper)" }}>
          {editing ? (
            <EditProductForm
              product={product}
              shopId={shopId}
              onUpdated={(updated) => { onUpdated(updated); setEditing(false); }}
              onCancel={() => setEditing(false)}
            />
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {/* Product images */}
              <ProductImageStrip
                product={product}
                shopId={shopId}
                maxImagesPerProduct={maxImagesPerProduct}
                onUpdated={onUpdated}
              />
              {/* Actions */}
              <div style={{ display: "flex", gap: 8 }}>
                <button type="button" onClick={() => setEditing(true)} style={ghostBtnStyle}>Edit</button>
                <button
                  type="button"
                  onClick={() => void handleDelete()}
                  disabled={deleting}
                  style={{ ...ghostBtnStyle, color: "var(--clay)" }}
                >
                  {deleting ? "Deleting…" : "Delete"}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Product image strip ─────────────────────────────────────────────────────

function ProductImageStrip({
  product,
  shopId,
  maxImagesPerProduct,
  onUpdated,
}: {
  product: Product;
  shopId: string;
  maxImagesPerProduct: number;
  onUpdated: (p: Product) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const atImgLimit = product.images.length >= maxImagesPerProduct;

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_FILE_SIZE) { setError("File must be under 10 MB"); return; }

    setError(null);
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch(`/api/shops/${shopId}/products/${product.id}/images`, {
        method: "POST", body: form,
      });
      const json = await res.json() as { ok: boolean; data?: ProductImage; error?: string };
      if (!res.ok || !json.ok || !json.data) {
        setError(json.error ?? "Upload failed");
        return;
      }
      onUpdated({ ...product, images: [...product.images, json.data] });
    } catch {
      setError("Upload failed. Please try again.");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function handleDeleteImg(imageId: string) {
    try {
      await fetch(`/api/shops/${shopId}/products/${product.id}/images/${imageId}`, { method: "DELETE" });
      onUpdated({ ...product, images: product.images.filter((i) => i.id !== imageId) });
    } catch { /* silent */ }
  }

  return (
    <div>
      <p style={{ fontSize: 12, fontWeight: 600, color: "var(--ink-faint)", margin: "0 0 8px", textTransform: "uppercase", letterSpacing: ".05em" }}>
        Photos ({product.images.length}/{maxImagesPerProduct})
      </p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {product.images.map((img) => (
          <div key={img.id} style={{ position: "relative" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={img.url}
              alt="product"
              style={{ width: 64, height: 64, objectFit: "cover", borderRadius: 8, border: "1px solid var(--line)" }}
            />
            <button
              type="button"
              onClick={() => void handleDeleteImg(img.id)}
              style={{
                position: "absolute", top: -6, right: -6,
                width: 18, height: 18, borderRadius: "50%",
                background: "var(--clay)", color: "var(--white)",
                border: "none", fontSize: 10, cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}
              title="Remove"
            >×</button>
          </div>
        ))}
        {!atImgLimit && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            style={{
              width: 64, height: 64, borderRadius: 8,
              border: "1.5px dashed var(--line)", background: "var(--paper-2)",
              cursor: uploading ? "not-allowed" : "pointer",
              fontSize: 20, color: "var(--ink-faint)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}
          >
            {uploading ? "…" : "+"}
          </button>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        style={{ display: "none" }}
        onChange={handleFile}
        disabled={uploading}
      />
      {error && <p style={{ fontSize: 12, color: "var(--clay)", margin: "6px 0 0" }}>{error}</p>}
    </div>
  );
}

// ── Edit Product Form ───────────────────────────────────────────────────────

function EditProductForm({
  product,
  shopId,
  onUpdated,
  onCancel,
}: {
  product: Product;
  shopId: string;
  onUpdated: (p: Product) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(product.name);
  const [description, setDescription] = useState(product.description ?? "");
  const [priceMin, setPriceMin] = useState(product.priceMin?.toString() ?? "");
  const [priceMax, setPriceMax] = useState(product.priceMax?.toString() ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/shops/${shopId}/products/${product.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || null,
          priceMin: priceMin ? parseFloat(priceMin) : null,
          priceMax: priceMax ? parseFloat(priceMax) : null,
        }),
      });
      const json = await res.json() as { ok: boolean; data?: Product; error?: string };
      if (!res.ok || !json.ok || !json.data) {
        setError(json.error ?? "Failed to save");
        return;
      }
      onUpdated(json.data);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <p style={{ fontWeight: 600, fontSize: 14, color: "var(--ink)", margin: 0 }}>Edit Product</p>
      <input
        type="text" value={name} onChange={(e) => setName(e.target.value)}
        placeholder="Product name *" required maxLength={120}
        style={inputStyle}
      />
      <textarea
        value={description} onChange={(e) => setDescription(e.target.value)}
        placeholder="Description (optional)" maxLength={1000} rows={2}
        style={{ ...inputStyle, resize: "vertical" }}
      />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <input
          type="number" value={priceMin} onChange={(e) => setPriceMin(e.target.value)}
          placeholder="Min price (PKR)" min="0" step="any" style={inputStyle}
        />
        <input
          type="number" value={priceMax} onChange={(e) => setPriceMax(e.target.value)}
          placeholder="Max price (PKR)" min="0" step="any" style={inputStyle}
        />
      </div>
      {error && <p style={{ fontSize: 12, color: "var(--clay)", margin: 0 }}>{error}</p>}
      <div style={{ display: "flex", gap: 8 }}>
        <button type="submit" disabled={saving || !name.trim()} style={primaryBtnStyle}>
          {saving ? "Saving…" : "Save changes"}
        </button>
        <button type="button" onClick={onCancel} style={ghostBtnStyle}>Cancel</button>
      </div>
    </form>
  );
}

// ── Shared styles ───────────────────────────────────────────────────────────

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "9px 12px",
  border: "1.5px solid var(--line)",
  borderRadius: 8,
  fontSize: 14,
  fontFamily: "var(--body)",
  color: "var(--ink)",
  background: "var(--white)",
  outline: "none",
  boxSizing: "border-box",
};

const primaryBtnStyle: React.CSSProperties = {
  padding: "8px 18px",
  background: "var(--clay)",
  color: "var(--white)",
  border: "none",
  borderRadius: 8,
  fontSize: 13,
  fontWeight: 600,
  fontFamily: "var(--body)",
  cursor: "pointer",
};

const ghostBtnStyle: React.CSSProperties = {
  padding: "8px 14px",
  background: "transparent",
  color: "var(--ink-soft)",
  border: "1px solid var(--line)",
  borderRadius: 8,
  fontSize: 13,
  fontWeight: 500,
  fontFamily: "var(--body)",
  cursor: "pointer",
};

const addBtnStyle: React.CSSProperties = {
  padding: "7px 14px",
  background: "var(--clay)",
  color: "var(--white)",
  border: "none",
  borderRadius: 8,
  fontSize: 13,
  fontWeight: 600,
  fontFamily: "var(--body)",
  cursor: "pointer",
};
