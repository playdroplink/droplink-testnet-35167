import React, { useState } from "react";

interface Product {
  name: string;
  price: number;
  description: string;
}

const MerchantProductManager: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [form, setForm] = useState<Product>({ name: "", price: 0, description: "" });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleAddProduct = (e: React.FormEvent) => {
    e.preventDefault();
    setProducts([...products, { ...form, price: Number(form.price) }]);
    setForm({ name: "", price: 0, description: "" });
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
        <button type="submit" className="w-full bg-green-600 text-white py-2 rounded hover:bg-green-700 transition">
          Add Product
        </button>
      </form>
      <div>
        <h3 className="text-xl font-semibold mb-2">Product List</h3>
        {products.length === 0 ? (
          <p>No products added yet.</p>
        ) : (
          <ul className="space-y-2">
            {products.map((product, idx) => (
              <li key={idx} className="border p-3 rounded flex flex-col">
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
