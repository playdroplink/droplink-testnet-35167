import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { MembershipTier, Product, Order, EmailLead } from '@/types/features';

export const useMonetization = (profileId: string | null) => {
  const [tiers, setTiers] = useState<MembershipTier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [leads, setLeads] = useState<EmailLead[]>([]);
  const [loading, setLoading] = useState(true);

  // Load membership tiers
  useEffect(() => {
    if (!profileId) return;
    const loadTiers = async () => {
      try {
        const { data } = await supabase
          .from('membership_tiers')
          .select('*')
          .eq('profile_id', profileId)
          .order('sort_order');
        setTiers(data || []);
      } catch (e) {
        console.error('Failed to load tiers:', e);
      }
    };
    loadTiers();
  }, [profileId]);

  // Load products
  useEffect(() => {
    if (!profileId) return;
    const loadProducts = async () => {
      try {
        const { data } = await supabase
          .from('products')
          .select('*')
          .eq('profile_id', profileId)
          .eq('status', 'active');
        setProducts(data || []);
      } catch (e) {
        console.error('Failed to load products:', e);
      }
    };
    loadProducts();
  }, [profileId]);

  // Load orders for dashboard
  useEffect(() => {
    if (!profileId) return;
    const loadOrders = async () => {
      try {
        const { data } = await supabase
          .from('orders')
          .select('*')
          .eq('profile_id', profileId)
          .order('created_at', { ascending: false });
        setOrders(data || []);
      } catch (e) {
        console.error('Failed to load orders:', e);
      }
    };
    loadOrders();
  }, [profileId]);

  // Load email leads
  useEffect(() => {
    if (!profileId) return;
    const loadLeads = async () => {
      try {
        const { data } = await supabase
          .from('email_leads')
          .select('*')
          .eq('profile_id', profileId)
          .order('created_at', { ascending: false });
        setLeads(data || []);
        setLoading(false);
      } catch (e) {
        console.error('Failed to load leads:', e);
        setLoading(false);
      }
    };
    loadLeads();
  }, [profileId]);

  // Create/update tier
  const saveTier = async (tier: Partial<MembershipTier> & { profile_id: string }) => {
    try {
      if (tier.id) {
        const { data } = await supabase
          .from('membership_tiers')
          .update(tier)
          .eq('id', tier.id)
          .select();
        if (data?.[0]) setTiers(t => t.map(x => x.id === tier.id ? data[0] : x));
      } else {
        const { data } = await supabase
          .from('membership_tiers')
          .insert([tier])
          .select();
        if (data?.[0]) setTiers(t => [...t, data[0]]);
      }
    } catch (e) {
      console.error('Failed to save tier:', e);
    }
  };

  // Create/update product
  const saveProduct = async (product: Partial<Product> & { profile_id: string }) => {
    try {
      if (product.id) {
        const { data } = await supabase
          .from('products')
          .update(product)
          .eq('id', product.id)
          .select();
        if (data?.[0]) setProducts(p => p.map(x => x.id === product.id ? data[0] : x));
      } else {
        const { data } = await supabase
          .from('products')
          .insert([product])
          .select();
        if (data?.[0]) setProducts(p => [...p, data[0]]);
      }
    } catch (e) {
      console.error('Failed to save product:', e);
    }
  };

  // Delete tier
  const deleteTier = async (tierId: string) => {
    try {
      await supabase.from('membership_tiers').delete().eq('id', tierId);
      setTiers(t => t.filter(x => x.id !== tierId));
    } catch (e) {
      console.error('Failed to delete tier:', e);
    }
  };

  // Delete product
  const deleteProduct = async (productId: string) => {
    try {
      await supabase.from('products').delete().eq('id', productId);
      setProducts(p => p.filter(x => x.id !== productId));
    } catch (e) {
      console.error('Failed to delete product:', e);
    }
  };

  // Create order (tip/purchase)
  const createOrder = async (order: Omit<Order, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const { data } = await supabase
        .from('orders')
        .insert([order])
        .select();
      if (data?.[0]) {
        setOrders(o => [data[0], ...o]);
        return data[0];
      }
    } catch (e) {
      console.error('Failed to create order:', e);
    }
  };

  // Capture lead
  const captureLead = async (lead: Omit<EmailLead, 'id' | 'created_at'>) => {
    try {
      const { data } = await supabase
        .from('email_leads')
        .insert([lead])
        .select();
      if (data?.[0]) {
        setLeads(l => [data[0], ...l]);
        return data[0];
      }
    } catch (e) {
      console.error('Failed to capture lead:', e);
    }
  };

  // Export leads as CSV
  const exportLeads = () => {
    const csv = [
      ['Email', 'Source', 'Created At'],
      ...leads.map(l => [l.email, l.source || '', new Date(l.created_at).toISOString()])
    ].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `leads-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  return {
    tiers,
    products,
    orders,
    leads,
    loading,
    saveTier,
    saveProduct,
    deleteTier,
    deleteProduct,
    createOrder,
    captureLead,
    exportLeads
  };
};
