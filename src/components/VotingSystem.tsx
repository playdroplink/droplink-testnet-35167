import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { 
  ThumbsUp, 
  ThumbsDown, 
  TrendingUp, 
  Users, 
  Clock,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { usePi } from '@/contexts/PiContext';
import { toast } from 'sonner';

interface Feature {
  id: string;
  title: string;
  description: string;
  category: string;
  status: 'proposed' | 'in_progress' | 'completed' | 'rejected';
  created_by: string;
  created_at: string;
  upvotes: number;
  downvotes: number;
  total_votes: number;
  user_vote?: 'upvote' | 'downvote' | null;
}

const VotingSystem: React.FC = () => {
  const { isAuthenticated, piUser } = usePi();
  const [features, setFeatures] = useState<Feature[]>([
    {
      id: '1',
      title: 'Dark Mode Theme',
      description: 'Add a beautiful dark mode theme option for better user experience in low-light environments',
      category: 'feature',
      status: 'completed',
      created_by: 'admin',
      created_at: '2024-11-15T10:00:00Z',
      upvotes: 45,
      downvotes: 3,
      total_votes: 48,
      user_vote: null
    },
    {
      id: '2',
      title: 'AI-Powered Analytics',
      description: 'Integrate AI to provide intelligent insights about visitor behavior and content performance',
      category: 'feature',
      status: 'in_progress',
      created_by: 'admin',
      created_at: '2024-11-16T14:30:00Z',
      upvotes: 67,
      downvotes: 8,
      total_votes: 75,
      user_vote: null
    },
    {
      id: '3',
      title: 'Custom Domain Support',
      description: 'Allow users to connect their own custom domains for a more professional appearance',
      category: 'feature',
      status: 'completed',
      created_by: 'admin',
      created_at: '2024-11-14T09:15:00Z',
      upvotes: 89,
      downvotes: 5,
      total_votes: 94,
      user_vote: null
    },
    {
      id: '4',
      title: 'Mobile App',
      description: 'Create native mobile apps for iOS and Android to manage bio pages on the go',
      category: 'feature',
      status: 'proposed',
      created_by: 'community',
      created_at: '2024-11-17T16:45:00Z',
      upvotes: 156,
      downvotes: 12,
      total_votes: 168,
      user_vote: null
    },
    {
      id: '5',
      title: 'Advanced Analytics Dashboard',
      description: 'Enhanced analytics with real-time visitor tracking, geographic data, and device information',
      category: 'improvement',
      status: 'in_progress',
      created_by: 'admin',
      created_at: '2024-11-18T11:20:00Z',
      upvotes: 72,
      downvotes: 6,
      total_votes: 78,
      user_vote: null
    },
    {
      id: '6',
      title: 'Social Media Scheduling',
      description: 'Schedule posts across multiple social media platforms directly from DropLink',
      category: 'feature',
      status: 'proposed',
      created_by: 'community',
      created_at: '2024-11-19T08:00:00Z',
      upvotes: 34,
      downvotes: 15,
      total_votes: 49,
      user_vote: null
    }
  ]);
  const [newFeature, setNewFeature] = useState({ title: '', description: '', category: 'feature' });
  const [showAddFeature, setShowAddFeature] = useState(false);

  const handleVote = async (featureId: string, voteType: 'upvote' | 'downvote') => {
    if (!isAuthenticated || !piUser?.username) {
      toast.error('Please sign in with Pi Network to vote');
      return;
    }

    setFeatures(prevFeatures => 
      prevFeatures.map(feature => {
        if (feature.id !== featureId) return feature;

        let newUpvotes = feature.upvotes;
        let newDownvotes = feature.downvotes;
        let newUserVote: 'upvote' | 'downvote' | null = voteType;

        // Remove previous vote if exists
        if (feature.user_vote === 'upvote') newUpvotes--;
        if (feature.user_vote === 'downvote') newDownvotes--;

        // Add new vote or remove if same
        if (feature.user_vote === voteType) {
          newUserVote = null;
          toast.success('Vote removed');
        } else {
          if (voteType === 'upvote') newUpvotes++;
          if (voteType === 'downvote') newDownvotes++;
          toast.success(`${voteType === 'upvote' ? 'Upvoted' : 'Downvoted'}!`);
        }

        return {
          ...feature,
          upvotes: newUpvotes,
          downvotes: newDownvotes,
          total_votes: newUpvotes + newDownvotes,
          user_vote: newUserVote
        };
      })
    );
  };

  const submitFeature = async () => {
    if (!isAuthenticated || !piUser?.username) {
      toast.error('Please sign in with Pi Network to submit features');
      return;
    }

    if (!newFeature.title.trim() || !newFeature.description.trim()) {
      toast.error('Please fill in all fields');
      return;
    }

    const feature: Feature = {
      id: Date.now().toString(),
      title: newFeature.title,
      description: newFeature.description,
      category: newFeature.category,
      status: 'proposed',
      created_by: piUser.username,
      created_at: new Date().toISOString(),
      upvotes: 1, // Auto-upvote from creator
      downvotes: 0,
      total_votes: 1,
      user_vote: 'upvote'
    };

    setFeatures(prev => [feature, ...prev]);
    toast.success('Feature request submitted!');
    setNewFeature({ title: '', description: '', category: 'feature' });
    setShowAddFeature(false);
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
          >
            {showAddFeature ? 'Cancel' : 'Submit Feature Request'}
          </Button>
        </CardContent>
      </Card>

      {/* Add Feature Form */}
      {showAddFeature && (
        <Card className="bg-white shadow-md border border-gray-200">
          <CardHeader>
            <CardTitle>Submit Feature Request</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium">Title</label>
              <input
                type="text"
                value={newFeature.title}
                onChange={(e) => setNewFeature(prev => ({ ...prev, title: e.target.value }))}
                className="w-full mt-1 p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Feature title..."
              />
            </div>
            <div>
              <label className="text-sm font-medium">Description</label>
              <textarea
                value={newFeature.description}
                onChange={(e) => setNewFeature(prev => ({ ...prev, description: e.target.value }))}
                className="w-full mt-1 p-2 border border-gray-300 rounded-md h-24 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Describe the feature..."
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
                <option value="improvement">Improvement</option>
                <option value="bug">Bug Fix</option>
                <option value="integration">Integration</option>
              </select>
            </div>
            <Button onClick={submitFeature} className="w-full">
              Submit Request
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Features List */}
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
                    {feature.created_by !== 'admin' && (
                      <span className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        Community
                      </span>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default VotingSystem;