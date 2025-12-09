import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { usePi } from '@/contexts/PiContext';
import { ThumbsUp, AlertCircle } from 'lucide-react';

const SAMPLE_FEATURES = [
  { key: 'feature-ads-improvements', title: 'Improved Ad Rewards', emoji: '💰', description: 'Better rewards for watching ads' },
  { key: 'feature-profile-badges', title: 'Profile Badges & Achievements', emoji: '🏆', description: 'Display badges for milestones' },
  { key: 'feature-merchant-dashboard', title: 'Merchant Dashboard', emoji: '🛍️', description: 'Advanced store management tools' },
  { key: 'feature-analytics', title: 'Creator Analytics', emoji: '📊', description: 'Detailed performance metrics' },
  { key: 'feature-livestream', title: 'Live Stream Integration', emoji: '🎥', description: 'Stream directly from DropLink' },
  { key: 'feature-nft-support', title: 'NFT Marketplace', emoji: '🖼️', description: 'Buy and sell NFTs on DropLink' }
];

export default function FeatureVote() {
  const { piUser } = usePi() as any;
  const [selected, setSelected] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [note, setNote] = useState('');
  const [hasVoted, setHasVoted] = useState(false);

  const handleVote = async () => {
    if (!piUser) {
      toast.error('Auth required', {
        description: 'Please sign in with Pi to vote.'
      });
      return;
    }
    
    if (!selected) {
      toast.error('Choose a feature', {
        description: 'Select a feature to vote for.'
      });
      return;
    }

    setLoading(true);
    try {
      const payload: any = {
        feature_key: selected,
        user_pi_uid: piUser.uid,
        username: piUser.username || null,
        note: note || null,
        created_at: new Date().toISOString()
      };

      // Insert vote into Supabase table `feature_votes`
      const { error } = await supabase
        .from('feature_votes')
        .insert([payload]);
        
      if (error) {
        console.warn('Vote insert error', error);
        toast.error('Vote Error', {
          description: 'Unable to record vote. Please try again.'
        });
        setLoading(false);
        return;
      }

      toast.success('Vote recorded! 🎉', {
        description: 'You will earn 1 Drop when this feature is released.'
      });

      // Reset form
      setSelected(null);
      setNote('');
      setHasVoted(true);

      // Re-enable voting after 2 seconds
      setTimeout(() => setHasVoted(false), 2000);

    } catch (err) {
      console.error('Vote failed', err);
      toast.error('Error', {
        description: 'Failed to submit vote. Please try again.'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ThumbsUp className="w-5 h-5 text-sky-500" />
          Vote for Your Favorite Features
        </CardTitle>
        <CardDescription>
          Select a feature you'd like to see next. Earn 1 Drop when it's released!
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!piUser && (
          <div className="flex gap-3 p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-amber-800">
              <p className="font-medium mb-1">Sign in required</p>
              <p>Please sign in with Pi Network to vote for features</p>
            </div>
          </div>
        )}

        {hasVoted && (
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-sm text-green-800">
            ✓ Your vote has been recorded! Select another feature to vote again.
          </div>
        )}

        <div className="grid gap-3">
          {SAMPLE_FEATURES.map(f => (
            <label 
              key={f.key} 
              className={`flex items-start gap-3 p-4 border-2 rounded-lg cursor-pointer transition-all ${
                selected === f.key 
                  ? 'border-sky-500 bg-sky-50' 
                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
              }`}
            >
              <input
                type="radio"
                name="feature_vote"
                value={f.key}
                checked={selected === f.key}
                onChange={() => setSelected(f.key)}
                className="mt-1 flex-shrink-0"
              />
              <div className="flex-1 min-w-0">
                <div className="font-medium text-gray-900 flex items-center gap-2">
                  <span>{f.emoji}</span>
                  {f.title}
                </div>
                <p className="text-xs text-gray-600 mt-0.5">{f.description}</p>
              </div>
            </label>
          ))}
        </div>

        <div className="space-y-2">
          <Label htmlFor="vote-note" className="text-sm">Optional comment (max 200 chars)</Label>
          <Input 
            id="vote-note"
            value={note} 
            onChange={(e) => setNote(e.target.value.slice(0, 200))}
            placeholder="Why do you want this feature?" 
            maxLength={200}
            className="text-sm"
          />
          <p className="text-xs text-gray-500 text-right">{note.length}/200</p>
        </div>

        <Button 
          onClick={handleVote} 
          disabled={loading || !piUser || !selected}
          className="w-full gap-2"
        >
          <ThumbsUp className="w-4 h-4" />
          {loading ? 'Recording vote...' : 'Vote & Earn 1 Drop'}
        </Button>
      </CardContent>
    </Card>
  );
}
