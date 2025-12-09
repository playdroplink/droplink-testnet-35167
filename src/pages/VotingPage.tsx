import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import FeatureVote from '@/components/FeatureVote';
import VotingSystem from '@/components/VotingSystem';
import { ArrowLeft, Vote, Lightbulb } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function VotingPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Button 
            variant="outline" 
            onClick={() => navigate(-1)}
            className="gap-2 mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </Button>
          
          <div className="space-y-2">
            <h1 className="text-4xl font-bold flex items-center gap-3">
              <Vote className="w-8 h-8 text-sky-500" />
              Feature Voting
            </h1>
            <p className="text-lg text-gray-600">
              Vote for features you want to see next and help shape the future of DropLink
            </p>
          </div>
        </div>

        {/* Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <Card className="bg-sky-50 border-sky-200">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Vote className="w-5 h-5 text-sky-500" />
                Vote for Features
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-700">
                Cast your vote for features you'd like to see implemented. Each vote helps us prioritize development.
              </p>
            </CardContent>
          </Card>

          <Card className="bg-green-50 border-green-200">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Lightbulb className="w-5 h-5 text-green-600" />
                Earn Rewards
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-700">
                Earn 1 DROP token when voted features are released. Your voice matters!
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Voting Systems */}
        <Tabs defaultValue="quick" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="quick">Quick Vote</TabsTrigger>
            <TabsTrigger value="detailed">Detailed Voting</TabsTrigger>
          </TabsList>

          <TabsContent value="quick" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Vote for Upcoming Features</CardTitle>
                <CardDescription>
                  Select a feature and submit your vote. Quick and simple.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <FeatureVote />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="detailed" className="space-y-4">
            <VotingSystem />
          </TabsContent>
        </Tabs>

        {/* Feature Info */}
        <Card className="mt-8 bg-gray-50">
          <CardHeader>
            <CardTitle className="text-lg">How Voting Works</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-gray-700">
            <div className="flex gap-3">
              <div className="w-6 h-6 rounded-full bg-sky-500 text-white flex items-center justify-center flex-shrink-0 text-xs font-bold">1</div>
              <div>
                <p className="font-medium">Select a Feature</p>
                <p className="text-gray-600">Browse and choose from upcoming features you'd like to see</p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="w-6 h-6 rounded-full bg-sky-500 text-white flex items-center justify-center flex-shrink-0 text-xs font-bold">2</div>
              <div>
                <p className="font-medium">Submit Your Vote</p>
                <p className="text-gray-600">Click the vote button to register your preference</p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="w-6 h-6 rounded-full bg-sky-500 text-white flex items-center justify-center flex-shrink-0 text-xs font-bold">3</div>
              <div>
                <p className="font-medium">Earn Rewards</p>
                <p className="text-gray-600">Get 1 DROP token when your voted feature is released</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
