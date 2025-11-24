import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { usePi } from "@/contexts/PiContext";

export default function CreateDropProduct() {
  const { piUser } = usePi();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState(10);
  const [productLink, setProductLink] = useState("");
  const [creating, setCreating] = useState(false);
  const [publicUrl, setPublicUrl] = useState<string | null>(null);

  const handleCreate = async () => {
    setCreating(true);
    if (!piUser) return;
    const { data, error } = await supabase
      .from('drop_products')
      .insert({
        seller_id: piUser.uid,
        name,
        description,
        price,
        product_link: productLink
      })
      .select()
      .single();
    if (error) {
      alert('Error creating product: ' + error.message);
      setCreating(false);
      return;
    }
    setPublicUrl(`/pay/${data.id}`);
    setCreating(false);
  };

  return (
    <div className="max-w-xl mx-auto py-8">
      <Card>
        <CardHeader>
          <CardTitle>Create a Product (DropPay)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input placeholder="Item Name" value={name} onChange={e => setName(e.target.value)} />
          <Textarea placeholder="Description" value={description} onChange={e => setDescription(e.target.value)} />
          <Input type="number" min={1} placeholder="Price (Drop)" value={price} onChange={e => setPrice(Number(e.target.value))} />
          <Input placeholder="Product Link (download or delivery)" value={productLink} onChange={e => setProductLink(e.target.value)} />
          <Button className="w-full bg-sky-600 hover:bg-sky-700 text-white" onClick={handleCreate} disabled={creating}>
            {creating ? "Creating..." : "Create Product & Get Link"}
          </Button>
          {publicUrl && (
            <div className="mt-4 text-center">
              <div className="font-medium">Public Product Link:</div>
              <a href={publicUrl} className="text-sky-600 underline" target="_blank" rel="noopener noreferrer">{window.location.origin + publicUrl}</a>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
