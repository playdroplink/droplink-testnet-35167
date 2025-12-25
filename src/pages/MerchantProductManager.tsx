import React, { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { usePi } from "@/contexts/PiContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import { Eye, Trash2, Edit2, TrendingUp } from "lucide-react";

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

  const handleDeleteProduct = async (productId: string) => {
    if (!confirm("Are you sure you want to delete this product?")) return;
    
    setLoading(true);
    const { error } = await supabase.from("products").delete().eq("id", productId);
    
    if (error) {
      toast.error("Failed to delete product");
    } else {
      toast.success("Product deleted successfully!");
      fetchProducts();
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">Product Dashboard</h1>
            <p className="text-slate-400">Create and manage your digital products</p>
          </div>
          <Link to="/sales-earnings">
            <Button className="bg-green-600 hover:bg-green-700 flex items-center gap-2">
              <TrendingUp size={18} />
              View Sales & Earnings
            </Button>
          </Link>
        </div>

        {/* Add Product Form */}
        <Card className="mb-8 bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white">Add New Product</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAddProduct} className="space-y-4">
              <Input
                type="text"
                name="title"
                placeholder="Product Title"
                value={form.title}
                onChange={handleChange}
                required
                className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-400"
              />
              <Input
                type="text"
                name="price"
                placeholder="Price (in Pi)"
                value={form.price}
                onChange={handleChange}
                required
                className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-400"
              />
              <Textarea
                name="description"
                placeholder="Product Description"
                value={form.description}
                onChange={handleChange}
                className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-400"
              />
              <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700" disabled={loading}>
                {loading ? "Adding..." : "Add Product"}
              </Button>
            </form>
            {error && <div className="text-red-400 mt-2">{error}</div>}
          </CardContent>
        </Card>

        {/* Products Dashboard */}
        <div>
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-white mb-2">Your Products ({products.length})</h2>
            <div className="h-1 w-16 bg-blue-600 rounded"></div>
          </div>

          {loading && products.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-slate-400">Loading products...</p>
            </div>
          ) : products.length === 0 ? (
            <Card className="bg-slate-800 border-slate-700">
              <CardContent className="py-12 text-center">
                <p className="text-slate-400">No products added yet. Create your first product above!</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {products.map((product) => (
                <Card key={product.id} className="bg-slate-800 border-slate-700 hover:border-blue-500 transition-colors">
                  <CardHeader>
                    <CardTitle className="text-white text-lg truncate">{product.title}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <p className="text-slate-400 text-sm mb-1">Price</p>
                      <p className="text-2xl font-bold text-blue-400">{product.price} π</p>
                    </div>
                    {product.description && (
                      <div>
                        <p className="text-slate-400 text-sm mb-1">Description</p>
                        <p className="text-slate-300 text-sm line-clamp-2">{product.description}</p>
                      </div>
                    )}
                    <div className="flex gap-2 pt-4">
                      <Link to={`/product/${product.id}`} className="flex-1">
                        <Button className="w-full bg-green-600 hover:bg-green-700 flex items-center justify-center gap-2">
                          <Eye size={16} />
                          View
                        </Button>
                      </Link>
                      <Button 
                        className="flex-1 bg-slate-700 hover:bg-slate-600 flex items-center justify-center gap-2"
                        disabled={loading}
                      >
                        <Edit2 size={16} />
                        Edit
                      </Button>
                      <Button 
                        className="flex-1 bg-red-600 hover:bg-red-700 flex items-center justify-center gap-2"
                        onClick={() => handleDeleteProduct(product.id)}
                        disabled={loading}
                      >
                        <Trash2 size={16} />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MerchantProductManager;
