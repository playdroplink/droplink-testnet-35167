import React, { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { usePi } from "@/contexts/PiContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

interface Product {
  id: string;
  title: string;
  price: string;
  description: string | null;
}

const MerchantProductManager: React.FC = () => {
  const { piUser } = usePi();
  const [products, setProducts] = useState<Product[]>([]);
  const [form, setForm] = useState({ title: "", price: "", description: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [profileId, setProfileId] = useState<string | null>(null);

  useEffect(() => {
    const fetchProfileId = async () => {
      if (!piUser?.username) return;
      
      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("username", piUser.username)
        .maybeSingle();
        
      if (profile) setProfileId(profile.id);
    };
    fetchProfileId();
  }, [piUser]);

  useEffect(() => {
    if (profileId) {
      fetchProducts();
    }
  }, [profileId]);

  const fetchProducts = async () => {
    if (!profileId) return;
    
    setLoading(true);
    setError(null);
    
    const { data, error } = await supabase
      .from("products")
      .select("id, title, price, description")
      .eq("profile_id", profileId)
      .order("created_at", { ascending: false });
      
    if (error) {
      setError(error.message);
    } else {
      setProducts(data || []);
    }
    setLoading(false);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileId) {
      toast.error("Please sign in first");
      return;
    }
    
    setLoading(true);
    setError(null);
    
    const { error } = await supabase.from("products").insert({
      title: form.title,
      price: form.price,
      description: form.description,
      profile_id: profileId,
    });
    
    if (error) {
      setError(error.message);
      toast.error("Failed to add product");
    } else {
      toast.success("Product added successfully!");
      setForm({ title: "", price: "", description: "" });
      fetchProducts();
    }
    setLoading(false);
  };

  return (
    <div className="max-w-2xl mx-auto mt-10 p-6">
      <Card>
        <CardHeader>
          <CardTitle>Manage Products</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAddProduct} className="space-y-4 mb-8">
            <Input
              type="text"
              name="title"
              placeholder="Product Title"
              value={form.title}
              onChange={handleChange}
              required
            />
            <Input
              type="text"
              name="price"
              placeholder="Price (in Pi)"
              value={form.price}
              onChange={handleChange}
              required
            />
            <Textarea
              name="description"
              placeholder="Product Description"
              value={form.description}
              onChange={handleChange}
            />
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Adding..." : "Add Product"}
            </Button>
          </form>
          
          {error && <div className="text-destructive mb-2">{error}</div>}
          
          <div>
            <h3 className="text-xl font-semibold mb-4">Product List</h3>
            {loading ? (
              <p className="text-muted-foreground">Loading...</p>
            ) : products.length === 0 ? (
              <p className="text-muted-foreground">No products added yet.</p>
            ) : (
              <ul className="space-y-2">
                {products.map((product) => (
                  <li key={product.id} className="border p-3 rounded flex flex-col">
                    <span className="font-bold">{product.title}</span>
                    <span>Price: {product.price} Pi</span>
                    <span className="text-sm text-muted-foreground">{product.description}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default MerchantProductManager;
