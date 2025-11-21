import React, { useState } from "react";

const MerchantStoreSetup: React.FC = () => {
  const [store, setStore] = useState({
    name: "",
    location: "",
    theme: "",
    contact: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setStore({ ...store, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Save store info to backend or state
    alert("Store created! (Demo)");
  };

  return (
    <div className="max-w-md mx-auto mt-10 p-6 bg-white rounded shadow">
      <h2 className="text-2xl font-bold mb-4">Create Your Store</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="text"
          name="name"
          placeholder="Store Name"
          value={store.name}
          onChange={handleChange}
          className="w-full border p-2 rounded"
          required
        />
        <input
          type="text"
          name="location"
          placeholder="Store Location"
          value={store.location}
          onChange={handleChange}
          className="w-full border p-2 rounded"
        />
        <input
          type="text"
          name="theme"
          placeholder="Store Theme (e.g. Coffee, Bakery)"
          value={store.theme}
          onChange={handleChange}
          className="w-full border p-2 rounded"
        />
        <input
          type="text"
          name="contact"
          placeholder="Contact Info (email, phone, etc.)"
          value={store.contact}
          onChange={handleChange}
          className="w-full border p-2 rounded"
        />
        <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 transition">
          Create Store
        </button>
      </form>
    </div>
  );
};

export default MerchantStoreSetup;
