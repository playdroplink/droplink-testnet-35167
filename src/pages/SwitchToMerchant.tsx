import React from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Store } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";

const SwitchToMerchant: React.FC = () => {
  const navigate = useNavigate();
  return (
    <>
      <PageHeader 
        title="Become a Merchant" 
        description="Switch to merchant mode and create a store"
        icon={<Store />}
      />
      <div className="flex flex-col items-center justify-center min-h-screen p-4 pb-24">
      <h1 className="text-3xl font-bold mb-4">Switch to Merchant</h1>
      <p className="mb-6 text-center max-w-xl">
        Become a merchant and create your own online store! Set your store name, location, theme, and contact info. Add products, manage your menu, and start selling to customers who can browse, add to cart, and buy your items with Pi.
      </p>
      <button
        className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
        onClick={() => navigate("/merchant-setup")}
      >
        Become a Merchant
      </button>
      </div>
    </>
  );
};

export default SwitchToMerchant;
