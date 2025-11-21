import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { usePi } from '@/contexts/PiContext';

const SAMPLE_FEATURES = [
  { key: 'feature-ads-improvements', title: 'Improved Ad Rewards' },
  { key: 'feature-profile-badges', title: 'Profile Badges & Achievements' },
  { key: 'feature-merchant-dashboard', title: 'Merchant Dashboard' },
  { key: 'feature-analytics', title: 'Creator Analytics' }
];

export default function FeatureVote() {
  const pi = usePi();
  const [selected, setSelected] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [note, setNote] = useState('');

  const handleVote = async () => {
    if (!pi || !pi.piUser) {
      toast({ title: 'Auth required', description: 'Please sign in with Pi to vote.' });
      return;
    }
    if (!selected) {
      toast({ title: 'Choose a feature', description: 'Select a feature to vote for.' });
      return;
    }

    setLoading(true);
    try {
      const payload: any = {
        feature_key: selected,
        user_pi_uid: pi.piUser.uid,
        username: pi.piUser.username || null,
        note: note || null,
        created_at: new Date().toISOString()
      };

      // Try to insert vote into Supabase table `feature_votes` (create table if missing on server)
      const { data, error } = await (supabase as any).from('feature_votes').insert([payload]);
      if (error) {
        console.warn('Vote insert error', error);
        toast({ title: 'Vote Error', description: 'Unable to record vote on server. Try again later.' });
      } else {
        toast({ title: 'Thanks!', description: 'Your vote was recorded. You will receive 1 Drop when released.' });

        // Reward 1 drop (1 drop unit = 10 DROP tokens)
        try {
          await pi.requestDropTokens(10);
        } catch (err) {
          console.warn('Rewarding failed', err);
        }
      }
    } catch (err) {
      console.error('Vote failed', err);
      toast({ title: 'Error', description: 'Failed to submit vote.' });
    } finally {
      setLoading(false);
    }
  };

  const resetLocal = () => {
    try {
      localStorage.removeItem('feature_votes');
      toast({ title: 'Reset', description: 'Local vote cache cleared' });
    } catch (e) {
      console.warn('Reset local votes failed', e);
      toast({ title: 'Error', description: 'Failed to reset' });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Future Features — Vote & Earn</CardTitle>
        <CardDescription>Vote for features you want to see next — earn 1 Drop when it's released.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid gap-2">
          {SAMPLE_FEATURES.map(f => (
            <label key={f.key} className="flex items-center gap-2 p-2 border rounded cursor-pointer">
              <input
                type="radio"
                name="feature_vote"
                value={f.key}
                checked={selected === f.key}
                onChange={() => setSelected(f.key)}
              />
              <div className="flex-1">
                <div className="font-medium">{f.title}</div>
                <div className="text-xs text-muted-foreground">Vote to prioritize this feature</div>
              </div>
            </label>
          ))}
        </div>

        <div className="space-y-2">
          <Label>Optional note</Label>
          <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Why do you want this feature?" />
        </div>

        <div className="flex gap-2">
          <Button onClick={handleVote} disabled={loading}>{loading ? 'Voting...' : 'Vote & Earn 1 Drop'}</Button>
          <Button variant="ghost" onClick={resetLocal}>Reset Local</Button>
        </div>
      </CardContent>
    </Card>
  );
}
