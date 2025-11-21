import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { 
  ThumbsUp, 
  ThumbsDown, 
  TrendingUp, 
  Users, 
  Clock,
  CheckCircle,
  AlertCircle,
  Plus,
  Loader2
} from 'lucide-react';
import { usePi } from '@/contexts/PiContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Feature {
  id: string;
  title: string;
  description: string;
  category: string;
  status: 'proposed' | 'in_progress' | 'completed' | 'rejected';
  created_by: string;
  created_at: string;
  updated_at: string;
  upvotes: number;
  downvotes: number;
  total_votes: number;
  user_vote?: 'upvote' | 'downvote' | null;
  profile_name?: string;
}

const VotingSystem: React.FC = () => {
  const { isAuthenticated, piUser } = usePi();
  const [features, setFeatures] = useState<Feature[]>([]);
  const [loading, setLoading] = useState(true);
  const [newFeature, setNewFeature] = useState({ title: '', description: '', category: 'feature' });
  const [showAddFeature, setShowAddFeature] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [userProfile, setUserProfile] = useState<any>(null);

  // Load user profile for voting
  useEffect(() => {
    const loadUserProfile = async () => {
      if (isAuthenticated && piUser?.username) {
        try {
          const { data } = await supabase
            .from('profiles')
            .select('id, pi_username')
            .eq('pi_username', piUser.username)
            .single();
          setUserProfile(data);
        } catch (error) {
          console.error('Error loading user profile:', error);
        }
      }
    };
    loadUserProfile();
  }, [isAuthenticated, piUser]);

  // Load features with vote counts and user votes
  const loadFeatures = async () => {
    try {
      setLoading(true);
      
      // First get all feature requests
      const { data: featuresData, error: featuresError } = await supabase
        .from('feature_requests')
        .select(`
          *,
          profiles!feature_requests_created_by_fkey(pi_username)
        `)
        .order('created_at', { ascending: false });

      if (featuresError) throw featuresError;

      if (!featuresData || featuresData.length === 0) {
        // Insert some default features if none exist
        await insertDefaultFeatures();
        return loadFeatures();
      }

      // Get vote counts for each feature
      const featuresWithVotes = await Promise.all(
        featuresData.map(async (feature) => {
          const { data: votes, error: votesError } = await supabase
            .from('feature_votes')
            .select('vote_type, user_id')
            .eq('feature_id', feature.id);

          if (votesError) {
            console.error('Error loading votes:', votesError);
            return {
              ...feature,
              upvotes: 0,
              downvotes: 0,
              total_votes: 0,
              user_vote: null,
              profile_name: feature.profiles?.pi_username || 'Anonymous'
            };
          }

          const upvotes = votes?.filter(v => v.vote_type === 'upvote').length || 0;
          const downvotes = votes?.filter(v => v.vote_type === 'downvote').length || 0;
          const userVote = userProfile 
            ? votes?.find(v => v.user_id === userProfile.id)?.vote_type || null
            : null;

          return {
            ...feature,
            upvotes,
            downvotes,
            total_votes: upvotes + downvotes,
            user_vote: userVote,
            profile_name: feature.profiles?.pi_username || 'Anonymous'
          };
        })
      );

      setFeatures(featuresWithVotes);
    } catch (error) {
      console.error('Error loading features:', error);
      toast.error('Failed to load features');
    } finally {
      setLoading(false);
    }
  };

  // Insert default features if database is empty
  const insertDefaultFeatures = async () => {
    const defaultFeatures = [
      {
        title: 'Dark Mode Theme',
        description: 'Add a beautiful dark mode theme option for better user experience in low-light environments',
        category: 'ui',
        status: 'proposed'
      },
      {
        title: 'Mobile App',
        description: 'Create native mobile apps for iOS and Android to manage bio pages on the go',
        category: 'platform',
        status: 'in_progress'
      },
      {
        title: 'Advanced Analytics Dashboard', 
        description: 'Enhanced analytics with real-time visitor tracking, geographic data, and device information',
        category: 'analytics',
        status: 'proposed'
      },
      {
        title: 'Social Media Auto-Posting',
        description: 'Automatically share updates across multiple social media platforms when you update your bio',
        category: 'integration',
        status: 'proposed'
      },
      {
        title: 'Custom Themes & Branding',
        description: 'Advanced customization options with custom CSS, fonts, and brand colors',
        category: 'customization',
        status: 'proposed'
      },
      {
        title: 'Team Collaboration',
        description: 'Allow multiple team members to manage and collaborate on bio pages',
        category: 'collaboration',
        status: 'proposed'
      }
    ];

    try {
      // Get admin profile or create a system user
      let adminProfile;
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id')
        .eq('pi_username', 'admin')
        .single();

      if (!profiles) {
        // For now, use the first available profile or null
        const { data: firstProfile } = await supabase
          .from('profiles')
          .select('id')
          .limit(1)
          .single();
        adminProfile = firstProfile;
      } else {
        adminProfile = profiles;
      }

      const { error } = await supabase
        .from('feature_requests')
        .insert(
          defaultFeatures.map(feature => ({
            ...feature,
            created_by: adminProfile?.id || null
          }))
        );

      if (error) throw error;
      toast.success('Default features added to voting system');
    } catch (error) {
      console.error('Error inserting default features:', error);
    }
  };

  // Handle voting with one vote per user constraint
  const handleVote = async (featureId: string, voteType: 'upvote' | 'downvote') => {
    if (!isAuthenticated || !piUser?.username || !userProfile) {
      toast.error('Please sign in with Pi Network to vote');
      return;
    }

    try {
      // Check if user already voted
      const { data: existingVote } = await supabase
        .from('feature_votes')
        .select('vote_type')
        .eq('feature_id', featureId)
        .eq('user_id', userProfile.id)
        .single();

      if (existingVote) {
        if (existingVote.vote_type === voteType) {
          // Remove vote if clicking the same vote type
          const { error } = await supabase
            .from('feature_votes')
            .delete()
            .eq('feature_id', featureId)
            .eq('user_id', userProfile.id);

          if (error) throw error;
          toast.success('Vote removed');
        } else {
          // Update vote type if different
          const { error } = await supabase
            .from('feature_votes')
            .update({ vote_type: voteType })
            .eq('feature_id', featureId)
            .eq('user_id', userProfile.id);

          if (error) throw error;
          toast.success(`Vote changed to ${voteType}`);
        }
      } else {
        // Create new vote
        const { error } = await supabase
          .from('feature_votes')
          .insert({
            feature_id: featureId,
            user_id: userProfile.id,
            vote_type: voteType
          });

        if (error) throw error;
        toast.success(`${voteType === 'upvote' ? 'Upvoted' : 'Downvoted'}!`);
      }

      // Refresh features to show updated vote counts
      await loadFeatures();
    } catch (error) {
      console.error('Error voting:', error);
      toast.error('Failed to vote');
    }
  };

  // Submit new feature request
  const submitFeature = async () => {
    if (!isAuthenticated || !piUser?.username || !userProfile) {
      toast.error('Please sign in with Pi Network to submit features');
      return;
    }

    if (!newFeature.title.trim() || !newFeature.description.trim()) {
      toast.error('Please fill in all fields');
      return;
    }

    try {
      setSubmitting(true);
      
      const { error } = await supabase
        .from('feature_requests')
        .insert({
          title: newFeature.title.trim(),
          description: newFeature.description.trim(),
          category: newFeature.category,
          created_by: userProfile.id
        });

      if (error) throw error;

      toast.success('Feature request submitted successfully!');
      setNewFeature({ title: '', description: '', category: 'feature' });
      setShowAddFeature(false);
      
      // Reload features to show the new one
      await loadFeatures();
    } catch (error) {
      console.error('Error submitting feature:', error);
      toast.error('Failed to submit feature request');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'proposed': return 'bg-blue-100 text-blue-800';
      case 'in_progress': return 'bg-yellow-100 text-yellow-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Load features on component mount and when user profile changes
  useEffect(() => {
    if (userProfile !== null || !isAuthenticated) {
      loadFeatures();
    }
  }, [userProfile, isAuthenticated]);

  if (!isAuthenticated) {
    return (
      <Card className="border-amber-200 bg-amber-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-amber-800">
            <Users className="h-5 w-5" />
            Community Voting
          </CardTitle>
          <CardDescription className="text-amber-700">
            Sign in with Pi Network to vote on features and submit requests
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Please authenticate with Pi Network to access the voting system and submit feature requests.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="bg-white shadow-md border border-gray-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Feature Voting System
          </CardTitle>
          <CardDescription>
            Vote on proposed features and submit your own ideas to help shape DropLink's future
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button 
            onClick={() => setShowAddFeature(!showAddFeature)}
            className="w-full sm:w-auto"
            disabled={!userProfile}
          >
            <Plus className="h-4 w-4 mr-2" />
            {showAddFeature ? 'Cancel' : 'Submit Feature Request'}
          </Button>
        </CardContent>
      </Card>

      {/* Add Feature Form */}
      {showAddFeature && (
        <Card className="bg-white shadow-md border border-gray-200">
          <CardHeader>
            <CardTitle>Submit Feature Request</CardTitle>
            <CardDescription>
              Describe a feature you'd like to see in DropLink
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium">Title</label>
              <Input
                type="text"
                value={newFeature.title}
                onChange={(e) => setNewFeature(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Feature title..."
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Description</label>
              <Textarea
                value={newFeature.description}
                onChange={(e) => setNewFeature(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Describe the feature in detail..."
                className="mt-1 min-h-[100px]"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Category</label>
              <select
                value={newFeature.category}
                onChange={(e) => setNewFeature(prev => ({ ...prev, category: e.target.value }))}
                className="w-full mt-1 p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="feature">New Feature</option>
                <option value="ui">UI/UX Improvement</option>
                <option value="integration">Integration</option>
                <option value="analytics">Analytics</option>
                <option value="customization">Customization</option>
                <option value="platform">Platform</option>
                <option value="collaboration">Collaboration</option>
                <option value="bug">Bug Fix</option>
              </select>
            </div>
            <Button 
              onClick={submitFeature} 
              className="w-full"
              disabled={submitting}
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                'Submit Request'
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Features List */}
      {loading ? (
        <Card>
          <CardContent className="py-8">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
              <p>Loading features...</p>
            </div>
          </CardContent>
        </Card>
      ) : features.length === 0 ? (
        <Card>
          <CardContent className="py-8">
            <div className="text-center">
              <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No feature requests yet. Be the first to submit one!</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {features.map((feature) => {
            const votePercentage = feature.total_votes > 0 
              ? (feature.upvotes / feature.total_votes) * 100 
              : 0;

            return (
              <Card key={feature.id} className="border-l-4 border-l-primary bg-white shadow-md border border-gray-200">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg">{feature.title}</CardTitle>
                      <CardDescription className="mt-1">
                        {feature.description}
                      </CardDescription>
                    </div>
                    <Badge className={getStatusColor(feature.status)}>
                      {feature.status.replace('_', ' ')}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Vote Progress */}
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span>{feature.upvotes} upvotes</span>
                        <span>{feature.total_votes} total votes</span>
                        <span>{feature.downvotes} downvotes</span>
                      </div>
                      <Progress value={votePercentage} className="h-2" />
                    </div>

                    {/* Vote Buttons */}
                    <div className="flex gap-2">
                      <Button
                        variant={feature.user_vote === 'upvote' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => handleVote(feature.id, 'upvote')}
                        className="flex items-center gap-1"
                      >
                        <ThumbsUp className="h-4 w-4" />
                        {feature.upvotes}
                      </Button>
                      <Button
                        variant={feature.user_vote === 'downvote' ? 'destructive' : 'outline'}
                        size="sm"
                        onClick={() => handleVote(feature.id, 'downvote')}
                        className="flex items-center gap-1"
                      >
                        <ThumbsDown className="h-4 w-4" />
                        {feature.downvotes}
                      </Button>
                    </div>

                    {/* Metadata */}
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {new Date(feature.created_at).toLocaleDateString()}
                      </span>
                      <Badge variant="secondary">
                        {feature.category}
                      </Badge>
                      <span className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {feature.profile_name}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default VotingSystem;