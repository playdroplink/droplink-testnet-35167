
import React, { useState } from "react";
import StoreCustomizer from "../components/StoreCustomizer";
import ProductCategoryManager from "../components/ProductCategoryManager";
import ThemeCustomizer from "../components/ThemeCustomizer";

const getStoreUrl = () => {
  if (typeof window === "undefined") return "";
  const { origin, pathname } = window.location;
  const match = pathname.match(/\/storefront\/([^/]+)/);
  const storeId = match ? match[1] : "your-store-id";
  return `${origin}/storefront/${storeId}`;
};

const StoreFront: React.FC = () => {
  const [showPreview, setShowPreview] = useState(true);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="px-4 py-4 shadow-sm border-b border-border bg-background">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-semibold text-sky-500">Store Dashboard</h1>
            <span className="text-xs text-muted-foreground">Your Storefront</span>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={getStoreUrl()}
              readOnly
              className="border p-2 rounded bg-gray-100 text-xs w-64"
              onFocus={e => e.target.select()}
            />
            <button
              type="button"
              className="bg-blue-600 text-white px-3 py-1 rounded text-xs"
              onClick={() => {
                navigator.clipboard.writeText(getStoreUrl());
                window.alert("Store URL copied!");
              }}
            >Copy</button>
            <button
              className={`ml-2 px-4 py-2 rounded ${showPreview ? 'bg-gray-400' : 'bg-green-600 text-white'} text-xs`}
              onClick={() => setShowPreview(p => !p)}
            >{showPreview ? 'Hide Preview' : 'Show Preview'}</button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex flex-col lg:flex-row h-[calc(100vh-73px)]">
        {/* Editor Panel */}
        <div className={`flex-1 overflow-y-auto p-4 lg:p-8 glass-card m-2 rounded-xl ${showPreview ? 'hidden lg:block' : 'block'}`}>
          <div className="max-w-2xl mx-auto space-y-8">
            <div className="bg-card border border-border rounded-lg p-6 mb-6">
              <h2 className="text-lg font-semibold mb-4">Store Customization</h2>
              <StoreCustomizer />
            </div>
            <div className="bg-card border border-border rounded-lg p-6 mb-6">
              <h2 className="text-lg font-semibold mb-4">Product Categories</h2>
              <ProductCategoryManager />
            </div>
            <div className="bg-card border border-border rounded-lg p-6 mb-6">
              <h2 className="text-lg font-semibold mb-4">Theme & Appearance</h2>
              <ThemeCustomizer />
            </div>
          </div>
        </div>

        {/* Preview Panel */}
        <div className={`lg:w-[400px] xl:w-[500px] ${showPreview ? 'flex' : 'hidden lg:flex'} bg-background border-l border-border/30 p-6 lg:p-8 flex-col items-center`}>
          <div className="mb-4 flex items-center justify-between w-full">
            <h3 className="text-sm font-medium text-muted-foreground">Preview</h3>
            <button
              className="bg-blue-600 text-white px-3 py-1 rounded text-xs"
              onClick={() => {
                navigator.clipboard.writeText(getStoreUrl());
                window.alert("Store URL copied!");
              }}
            >Copy link</button>
          </div>
          {/* Replace below with your actual store preview component */}
          <div className="w-full h-full flex items-center justify-center bg-white border rounded-xl shadow-inner min-h-[400px]">
            <span className="text-muted-foreground">[Store Preview Here]</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StoreFront;
