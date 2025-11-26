
import React, { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface Product {
  id?: string;
  name: string;
  price: number;
  description: string;
}

const MerchantProductManager: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [form, setForm] = useState<Product>({ name: "", price: 0, description: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [profileId, setProfileId] = useState<string | null>(null);

  useEffect(() => {
    // Get current user's profile ID
    const fetchProfileId = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("id")
          .eq("user_id", user.id)
          .maybeSingle();
        if (profile) setProfileId(profile.id);
      }
    };
    fetchProfileId();
  }, []);

  useEffect(() => {
    if (profileId) {
      fetchProducts();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileId]);

  const fetchProducts = async () => {
    setLoading(true);
    setError(null);
    if (!profileId) return;
    const { data, error } = await supabase
      .from("drop_products")
      .select("id, name, price, description")
      .eq("seller_id", profileId)
      .order("created_at", { ascending: false });
    if (error) setError(error.message);
    else setProducts(data || []);
    setLoading(false);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileId) return;
    setLoading(true);
    setError(null);
    const { error } = await supabase.from("drop_products").insert({
      name: form.name,
      price: Number(form.price),
      description: form.description,
      product_link: "", // Add logic for product link if needed
      seller_id: profileId,
    });
    if (error) setError(error.message);
    setForm({ name: "", price: 0, description: "" });
    fetchProducts();
    setLoading(false);
  };

  return (
    <div className="max-w-2xl mx-auto mt-10 p-6 bg-white rounded shadow">
      <h2 className="text-2xl font-bold mb-4">Manage Products</h2>
      <form onSubmit={handleAddProduct} className="space-y-4 mb-8">
        <input
          type="text"
          name="name"
          placeholder="Product Name"
          value={form.name}
          onChange={handleChange}
          className="w-full border p-2 rounded"
          required
        />
        <input
          type="number"
          name="price"
          placeholder="Price (in Pi)"
          value={form.price}
          onChange={handleChange}
          className="w-full border p-2 rounded"
          min="0"
          required
        />
        <textarea
          name="description"
          placeholder="Product Description"
          value={form.description}
          onChange={handleChange}
          className="w-full border p-2 rounded"
        />
        <button type="submit" className="w-full bg-green-600 text-white py-2 rounded hover:bg-green-700 transition" disabled={loading}>
          {loading ? "Adding..." : "Add Product"}
        </button>
      </form>
      {error && <div className="text-red-600 mb-2">{error}</div>}
      <div>
        <h3 className="text-xl font-semibold mb-2">Product List</h3>
        {loading ? (
          <p>Loading...</p>
        ) : products.length === 0 ? (
          <p>No products added yet.</p>
        ) : (
          <ul className="space-y-2">
            {products.map((product) => (
              <li key={product.id} className="border p-3 rounded flex flex-col">
                <span className="font-bold">{product.name}</span>
                <span>Price: {product.price} Pi</span>
                <span className="text-sm text-gray-600">{product.description}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default MerchantProductManager;
