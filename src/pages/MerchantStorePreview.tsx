import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import type { ProductItem, CartItem, Order } from "@/types/profile";

const MerchantStorePreview: React.FC = () => {
  const { merchantId } = useParams();
  const [store, setStore] = useState({
    name: "",
    location: "",
    theme: "",
    contact: "",
    textColor: "#222",
    backgroundColor: "#f5f5dc",
    products: [] as ProductItem[],
  });
  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showCart, setShowCart] = useState(false);
  const [order, setOrder] = useState<Order | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!merchantId) return;
    setLoading(true);
    setError(null);
    // Fetch store info and products for this merchant
    const fetchStore = async () => {
      // Fetch profile info (use correct columns)
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("id, username, theme_settings")
        .eq("id", merchantId)
        .maybeSingle();
      // Fetch products
      const { data: products, error: prodError } = await supabase
        .from("drop_products")
        .select("id, name, price, description, product_link")
        .eq("seller_id", merchantId)
        .order("created_at", { ascending: false });
      if (profileError) setError(profileError.message);
      if (prodError) setError(prodError.message);
      // Parse theme_settings if present
      let textColor = "#222";
      let backgroundColor = "#f5f5dc";
      let storeName = "Merchant Store";
      let contact = "";
      if (profile && typeof profile === "object" && !('message' in profile)) {
        if (profile.theme_settings) {
          try {
            const theme = typeof profile.theme_settings === "string" ? JSON.parse(profile.theme_settings) : profile.theme_settings;
            textColor = theme?.textColor || textColor;
            backgroundColor = theme?.backgroundColor || backgroundColor;
          } catch {}
        }
        storeName = profile.username || storeName;
        setUsername(profile.username || null);
      }
      setStore({
        name: storeName,
        location: "",
        theme: "",
        contact,
        textColor,
        backgroundColor,
        products: (products || []).map((p) => ({
          id: p.id,
          name: p.name,
          price: p.price,
          description: p.description,
          image: p.product_link || undefined,
        })),
      });
      setLoading(false);
    };
    fetchStore();
  }, [merchantId]);


  const addToCart = (product: ProductItem) => {
    setCart((prev) => {
      const found = prev.find((item) => item.id === product.id);
      if (found) {
        return prev.map((item) =>
          item.id === product.id ? { ...item, cartQuantity: item.cartQuantity + 1 } : item
        );
      }
      return [...prev, { ...product, cartQuantity: 1 }];
    });
  };

  const removeFromCart = (id: string) => {
    setCart((prev) => prev.filter((item) => item.id !== id));
  };

  const updateQuantity = (id: string, qty: number) => {
    setCart((prev) => prev.map((item) => item.id === id ? { ...item, cartQuantity: qty } : item));
  };

  const handleCheckout = () => {
    // Demo: create a fake order and clear cart
    const total = cart.reduce((sum, item) => sum + item.price * item.cartQuantity, 0);
    setOrder({
      id: Date.now().toString(),
      items: cart,
      total,
      status: "pending",
      createdAt: new Date().toISOString(),
      paymentLink: window.location.href + "?pay=1",
    });
    setCart([]);
    setShowCart(false);
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading store...</div>;
  }
  if (error) {
    return <div className="min-h-screen flex items-center justify-center text-red-600">{error}</div>;
  }
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-start p-6"
      style={{ background: store.backgroundColor, color: store.textColor }}
    >
      <div className="w-full max-w-lg bg-white/80 rounded shadow p-6 mb-8">
        {username && (
          <div className="flex justify-end mb-4">
            <button
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              onClick={() => navigate(`/u/${username}`)}
            >
              View Bio
            </button>
          </div>
        )}
        <h1 className="text-3xl font-bold mb-2">{store.name}</h1>
        <div className="mb-2 text-sm text-gray-600">{store.location}</div>
        <div className="mb-4 text-base">Theme: {store.theme}</div>
        <div className="mb-4">Contact: <a href={`mailto:${store.contact}`} className="text-blue-600 underline">{store.contact}</a></div>
        <div className="mb-6">
          <h2 className="text-xl font-semibold mb-2">Menu</h2>
          <ul className="space-y-2">
            {store.products.map((product) => (
              <li key={product.id} className="border rounded p-3 flex flex-col md:flex-row md:items-center gap-4">
                {product.image && (
                  <img src={product.image} alt={product.name} className="w-20 h-20 object-cover rounded" />
                )}
                <div className="flex-1">
                  <span className="font-bold text-lg">{product.name}</span>
                  <span className="block">Price: {product.price} Pi</span>
                  <span className="block text-sm text-gray-600">{product.description}</span>
                </div>
                <button
                  className="mt-2 px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700"
                  onClick={() => addToCart(product)}
                >
                  Add to Cart
                </button>
              </li>
            ))}
          </ul>
        </div>
        {/* Cart and order UI remain unchanged */}
        <div className="flex flex-col gap-2 mt-6">
          <div className="flex justify-between items-center">
            <span className="text-xs text-gray-500">Preview URL:</span>
            <input
              type="text"
              readOnly
              value={window.location.href}
              className="border px-2 py-1 rounded w-64 text-xs bg-gray-100"
              onFocus={e => e.target.select()}
            />
          </div>
          <div className="flex justify-between items-center">
            <span className="text-xs text-gray-500">Actual Store URL:</span>
            <input
              type="text"
              readOnly
              value={`${window.location.origin}/storefront/${merchantId || 'your-merchant-id'}`}
              className="border px-2 py-1 rounded w-64 text-xs bg-blue-50"
              onFocus={e => e.target.select()}
            />
          </div>
        </div>
        <div className="mt-6 flex justify-end">
          <button
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            onClick={() => setShowCart((v) => !v)}
          >
            {showCart ? "Hide Cart" : `View Cart (${cart.reduce((sum, i) => sum + i.cartQuantity, 0)})`}
          </button>
        </div>
        {showCart && (
          <div className="mt-4 p-4 border rounded bg-gray-50">
            <h3 className="font-semibold mb-2">Your Cart</h3>
            {cart.length === 0 ? (
              <p className="text-sm">Cart is empty.</p>
            ) : (
              <ul className="space-y-2">
                {cart.map((item) => (
                  <li key={item.id} className="flex items-center gap-2">
                    <span className="flex-1">{item.name}</span>
                    <input
                      type="number"
                      min={1}
                      max={99}
                      value={item.cartQuantity}
                      onChange={e => updateQuantity(item.id, Number(e.target.value))}
                      className="w-16 border rounded px-2 py-1 text-xs"
                    />
                    <span className="w-16 text-right">{item.price * item.cartQuantity} Pi</span>
                    <button
                      className="ml-2 text-red-600 hover:underline text-xs"
                      onClick={() => removeFromCart(item.id)}
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {cart.length > 0 && (
              <div className="mt-4 flex flex-col gap-2">
                <div className="flex justify-between font-bold">
                  <span>Total:</span>
                  <span>{cart.reduce((sum, i) => sum + i.price * i.cartQuantity, 0)} Pi</span>
                </div>
                <button
                  className="w-full bg-green-600 text-white py-2 rounded hover:bg-green-700"
                  onClick={handleCheckout}
                >
                  Checkout & Pay
                </button>
              </div>
            )}
          </div>
        )}
        {order && (
          <div className="mt-6 p-4 border rounded bg-green-50">
            <h3 className="font-semibold mb-2">Order Placed!</h3>
            <div className="text-sm mb-2">Order ID: {order.id}</div>
            <div className="text-sm mb-2">Status: {order.status}</div>
            <div className="text-sm mb-2">Total: {order.total} Pi</div>
            <div className="text-sm mb-2">Created: {new Date(order.createdAt).toLocaleString()}</div>
            <div className="text-sm mb-2">Payment Link: <a href={order.paymentLink} className="text-blue-600 underline">{order.paymentLink}</a></div>
            <ul className="mt-2 space-y-1">
              {order.items.map((item) => (
                <li key={item.id} className="text-xs">
                  {item.name} x {item.cartQuantity} = {item.price * item.cartQuantity} Pi
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

export default MerchantStorePreview;
