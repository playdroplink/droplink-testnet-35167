import React, { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { usePi } from "@/contexts/PiContext";
import { toast } from "sonner";

const plans = ["all", "free", "basic", "premium", "pro"];
const categories = [
  { value: "all", label: "All Categories" },
  { value: "content_creator", label: "🎥 Content Creator" },
  { value: "business", label: "💼 Business" },
  { value: "gamer", label: "🎮 Gamer" },
  { value: "developer", label: "💻 Developer" },
  { value: "artist", label: "🎨 Artist" },
  { value: "musician", label: "🎵 Musician" },
  { value: "educator", label: "📚 Educator" },
  { value: "influencer", label: "⭐ Influencer" },
  { value: "entrepreneur", label: "🚀 Entrepreneur" },
  { value: "other", label: "📋 Other" }
];
const sortOptions = [
  { value: "username", label: "Username (A-Z)" },
  { value: "followers", label: "Most Followers" },
  { value: "recent", label: "Most Recent" },
];

const UserSearchPage = () => {
  const { piUser, isAuthenticated, signIn } = usePi();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  interface ProfileResult {
    id: string;
    username: string;
    logo?: string;
    created_at?: string;
    category?: string;
    follower_count?: number;
    is_admin?: boolean;
    avatar_url?: string;
    bio?: string;
    display_name?: string;
    business_name?: string;
    email?: string;
  }
  const [results, setResults] = useState<ProfileResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedPlan, setSelectedPlan] = useState("all");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [sortBy, setSortBy] = useState("username");
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [selectedProfile, setSelectedProfile] = useState<ProfileResult | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [showPiAuthModal, setShowPiAuthModal] = useState(false);
  const [signingIn, setSigningIn] = useState(false);

  // Real Pi Network sign-in
  const signInWithPiNetwork = async () => {
    setSigningIn(true);
    try {
      await signIn(['username', 'payments']);
      setShowPiAuthModal(false);
      toast.success('Signed in with Pi Network!');
    } catch (error) {
      console.error('Pi auth error:', error);
      toast.error('Failed to sign in with Pi Network');
    } finally {
      setSigningIn(false);
    }
  };
  
  const [followLoading, setFollowLoading] = useState<string | null>(null);
  const [highlight, setHighlight] = useState("");
  const [profileProducts, setProfileProducts] = useState<any[]>([]);
  const [showFollowedModal, setShowFollowedModal] = useState(false);
  const [followedUsername, setFollowedUsername] = useState<string | null>(null);
  const [userCount, setUserCount] = useState<number | null>(null);
  const [viewAll, setViewAll] = useState(false); // Only declare once

  // Reset viewAll if query changes and is not empty
  useEffect(() => {
    if (query.trim() !== "") {
      setViewAll(false);
    }
  }, [query]);

  // Re-run search when filters change
  useEffect(() => {
    if (query.trim() && results.length > 0) {
      handleSearch();
    }
  }, [selectedCategory, selectedPlan, sortBy]);
  // Fetch total user count and subscribe to changes
  useEffect(() => {
    let subscription: any;
    const fetchCount = async () => {
      const { count } = await supabase
        .from("profiles")
        .select("id", { count: "exact", head: true });
      setUserCount(count || 0);
    };
    fetchCount();
    // Real-time subscription for new/deleted users
    subscription = supabase
      .channel('public:profiles')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => {
        fetchCount();
      })
      .subscribe();
    return () => {
      if (subscription) supabase.removeChannel(subscription);
    };
  }, []);

  // Fetch all users when 'View All' is clicked
  const handleViewAll = async () => {
    setLoading(true);
    setViewAll(true);
    // Fetch all profile fields from Supabase (only existing columns)
    let query = supabase
      .from("profiles")
      .select("id, username, logo, created_at");
    
    // Category filter - uncomment after running add-followers-and-views.sql migration
    // if (selectedCategory !== "all") {
    //   query = query.eq("category", selectedCategory);
    // }
    
    // Plan filter - uncomment if you have a plan column in profiles table
    // if (selectedPlan !== "all") {
    //   query = query.eq("plan", selectedPlan);
    // }
    
    const { data, error } = await query;
    if (!error && data) {
      // Manually fetch follower counts for each profile
      let enrichedData = await Promise.all(data.map(async (profile: any) => {
        const { count } = await supabase
          .from('followers')
          .select('id', { count: 'exact', head: true })
          .eq('following_profile_id', profile.id);
        return { ...profile, follower_count: count || 0 };
      }));
      
      // Apply sorting
      let sortedData = enrichedData;
      if (sortBy === "followers") {
        sortedData = enrichedData.sort((a: any, b: any) => (b.follower_count || 0) - (a.follower_count || 0));
      } else if (sortBy === "recent") {
        sortedData = enrichedData.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      } else {
        sortedData = enrichedData.sort((a: any, b: any) => a.username.localeCompare(b.username));
      }
      setResults(sortedData);
    } else {
      setResults([]);
      setError(error?.message || "Failed to fetch profiles");
    }
    setLoading(false);
  };

  useEffect(() => {
    const stored = localStorage.getItem("droplink_recent_searches");
    if (stored) setRecentSearches(JSON.parse(stored));
  }, []);

    // Removed duplicate declaration of viewAll and setViewAll
  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!query.trim()) return;
    setViewAll(false); // Reset viewAll when searching
    setLoading(true);
    setError("");
    setResults([]);
    setHighlight(query.replace(/^@/, ""));
    try {
      let data = null;
      // If query starts with @, fetch from droplink.space
      if (query.trim().startsWith("@")) {
        const username = query.trim().replace(/^@/, "");
        const resp = await fetch(`https://droplink.space/@${username}`);
        if (resp.ok) {
          let profile: ProfileResult;
          try {
            const json = await resp.json();
            // If we have a profile id, fetch full profile from Supabase
            let fullProfile = null;
            if (json.id) {
              const { data: supaProfile, error: supaError } = await supabase
                .from("profiles")
                  .select("id, username, created_at, logo, business_name")
                .eq("id", json.id)
                .maybeSingle();
              if (!supaError && supaProfile) fullProfile = supaProfile;
            }
            profile = {
              id: json.id || username,
              username: json.username || username,
              follower_count: json.follower_count,
              created_at: json.created_at,
              avatar_url: json.avatar_url,
              bio: json.bio,
              display_name: json.display_name,
              ...json,
              ...fullProfile
            };
          } catch {
            profile = { id: username, username };
          }
          // Fetch follower count from Supabase if we have an id
          if (profile.id) {
            const { count } = await supabase
              .from("followers")
              .select("*", { count: "exact", head: true })
              .eq("following_profile_id", profile.id);
            if (count !== null) {
              profile.follower_count = count;
            }
          }
          data = [profile];
        } else {
          throw new Error("User not found");
        }
      } else {
        let search = supabase
          .from("profiles")
          .select("id, username, logo, created_at")
          .ilike("username", `%${query.replace(/^@/, "")}%`);
        // Plan filter - uncomment if you have a plan column in profiles table
        // if (selectedPlan !== "all") (search as any) = (search as any).eq("plan", selectedPlan);
        // Category filter - uncomment after running add-followers-and-views.sql migration
        // if (selectedCategory !== "all") (search as any) = (search as any).eq("category", selectedCategory);
        let result = await search;
        if (result.error) throw result.error;
        data = result.data;
        
        // Manually fetch follower counts for each profile
        if (data && data.length > 0) {
          data = await Promise.all(data.map(async (profile: any) => {
            const { count } = await supabase
              .from('followers')
              .select('id', { count: 'exact', head: true })
              .eq('following_profile_id', profile.id);
            return { ...profile, follower_count: count || 0 };
          }));
        }
        // Follower count will be available after running SQL migration
        // Sorting
        // Follower sorting - uncomment after running SQL migration
        if (sortBy === "followers") {
          data = data.sort((a: any, b: any) => (b.follower_count || 0) - (a.follower_count || 0));
        } else if (sortBy === "recent") {
          data = data.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        } else {
          data = data.sort((a: any, b: any) => a.username.localeCompare(b.username));
        }
      }
      setResults(data || []);
      // Save to recent searches
      const newRecent = [query, ...recentSearches.filter((q) => q !== query)].slice(0, 5);
      setRecentSearches(newRecent);
      localStorage.setItem("droplink_recent_searches", JSON.stringify(newRecent));
    } catch (err: any) {
      setError("Failed to search profiles.");
    } finally {
      setLoading(false);
    }
  };

  // Check Pi Auth status
  const isPiAuthenticated = () => {
    return isAuthenticated && piUser !== null;
  };

  const handleFollow = async (profile: any) => {
    if (!isPiAuthenticated()) {
      setShowPiAuthModal(true);
      return;
    }
    setFollowLoading(profile.id);
    // Save follow relationship to Supabase
    try {
      // Get current user id from Pi context
      if (!piUser?.uid) {
        throw new Error("User not authenticated");
      }
      
      // Insert into followers table: follower_profile_id (current user), following_profile_id (profile.id)
      const { error } = await supabase
        .from("followers")
        .insert([{
          follower_profile_id: piUser.uid,
          following_profile_id: profile.id,
        }]);
      
      if (error) throw error;
      
      setFollowedUsername(profile.username);
      setShowFollowedModal(true);
      toast.success(`Following @${profile.username}!`);
    } catch (err: any) {
      console.error('Follow error:', err);
      toast.error(err.message || 'Failed to follow user');
    } finally {
      setFollowLoading(null);
    }
  };

  const highlightText = (text: string) => {
    if (!highlight) return text;
    const regex = new RegExp(`(${highlight})`, "gi");
    return text.split(regex).map((part, i) =>
      regex.test(part) ? <span key={i} className="bg-yellow-200 rounded px-1">{part}</span> : part
    );
  };

  useEffect(() => {
    // Fetch products when a profile is selected
    const fetchProducts = async () => {
      if (selectedProfile && selectedProfile.id) {
        const { data, error } = await supabase
          .from("products")
          .select("id, title, price, image, description")
          .eq("profile_id", selectedProfile.id);
        if (!error && data) setProfileProducts(data);
        else setProfileProducts([]);
      } else {
        setProfileProducts([]);
      }
    };
    fetchProducts();
  }, [selectedProfile]);

  return (
    <div className="min-h-screen bg-sky-100 flex flex-col items-center py-4 px-1 sm:py-8 sm:px-2">
      <Card className="w-full max-w-2xl p-2 sm:p-6 shadow-lg rounded-xl">
        {/* User Count and View All */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-4">
          {!viewAll && (
            <div className="text-lg font-semibold text-sky-700">
              {userCount !== null ? `${userCount} Droplink Users` : 'Loading user count...'}
            </div>
          )}
          <Button
            size="sm"
            className="bg-sky-500 hover:bg-sky-600 text-white"
            onClick={handleViewAll}
            disabled={loading || viewAll}
          >
            View All
          </Button>
        </div>
        <h1 className="text-xl sm:text-2xl font-bold mb-4 text-sky-700 text-center">Search Droplink Profiles</h1>
        <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-2 mb-4 w-full">
          <Input
            type="text"
            className="flex-1"
            placeholder="Search by @username"
            value={query}
            onChange={e => setQuery(e.target.value)}
            autoFocus
          />
          <Button type="submit" className="bg-sky-500 hover:bg-sky-600 text-white font-semibold">Search</Button>
        </form>
        <div className="flex flex-col sm:flex-row flex-wrap gap-2 mb-4 w-full">
          {/* Plan filter - uncomment when you have a plan column */}
          {/* <select
            className="border rounded px-2 py-1 text-sm w-full sm:w-auto"
            value={selectedPlan}
            onChange={e => setSelectedPlan(e.target.value)}
          >
            {plans.map(plan => (
              <option key={plan} value={plan}>{plan.charAt(0).toUpperCase() + plan.slice(1)}</option>
            ))}
          </select> */}
          <select
            className="border rounded px-2 py-1 text-sm w-full sm:w-auto"
            value={selectedCategory}
            onChange={e => setSelectedCategory(e.target.value)}
          >
            {categories.map(cat => (
              <option key={cat.value} value={cat.value}>{cat.label}</option>
            ))}
          </select>
          <select
            className="border rounded px-2 py-1 text-sm w-full sm:w-auto"
            value={sortBy}
            onChange={e => setSortBy(e.target.value)}
          >
            {sortOptions.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
        {recentSearches.length > 0 && (
          <div className="mb-4">
            <div className="text-xs text-gray-500 mb-1">Recent searches:</div>
            <div className="flex flex-wrap gap-2 w-full">
              {recentSearches.map((q, i) => (
                <Button key={i} size="sm" variant="outline" onClick={() => { setQuery(q); setTimeout(() => handleSearch(), 0); }}>{q}</Button>
              ))}
            </div>
          </div>
        )}
        {loading && (
          <div className="space-y-2 mt-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="animate-pulse bg-sky-200/60 rounded-lg h-20 w-full" />
            ))}
          </div>
        )}
        {error && <div className="text-red-500 mt-2">{error}</div>}
        {!loading && results.length === 0 && query && !error && (
          <div className="text-gray-500 mt-4 text-center">No profiles found.</div>
        )}
        {!loading && results.length > 0 && (
          <div className="grid gap-4 mt-2">
            {results
              .filter((profile: ProfileResult) =>
                ![
                  "angrlobasit2020@gmail.com",
                  "angelobasit2022@gmail.com",
                  "angelobasit2020@gmail.com"
                ].includes(profile.username)
              )
              .map((profile: ProfileResult) => {
                // VIP team members list - these users get all features unlocked without a plan
                const vipTeamMembers = [
                  'jomarikun',
                  'airdropio2024',
                  'flappypi_fun',
                  'Wain2020',
                  'airdropio2024@gmail.com',
                  'flappypi.fun@gmail.com'
                ];
                
                // Check if user is admin (from database, Gmail email, or VIP team member)
                const isVipTeamMember = vipTeamMembers.includes(profile.username) || 
                                       vipTeamMembers.includes(profile.email || '');
                const isGmailAdmin = profile.username?.endsWith('@gmail.com') || 
                                    profile.email?.endsWith('@gmail.com') ||
                                    (profile as any).user_email?.endsWith('@gmail.com');
                const isAdmin = profile.is_admin === true || isGmailAdmin || isVipTeamMember;
                
                return (
              <Card 
                key={profile.id} 
                className={`flex flex-col sm:flex-row items-center gap-2 sm:gap-4 p-2 sm:p-4 hover:shadow-xl transition cursor-pointer bg-white ${
                  isAdmin ? 'border-2 border-yellow-500 shadow-lg shadow-yellow-200/50' : 'border border-sky-200'
                }`}
                onClick={() => { setSelectedProfile(profile); setShowModal(true); }}
              >
                <div className="relative">
                  <img
                    src={profile.logo || `https://api.dicebear.com/7.x/identicon/svg?seed=${profile.username}`}
                    alt={profile.username || "User"}
                    className={`w-12 h-12 sm:w-14 sm:h-14 rounded-full object-cover ${
                      isAdmin ? 'border-3 border-yellow-500 ring-2 ring-yellow-300' : 'border-2 border-sky-300'
                    }`}
                  />
                  {isAdmin && (
                    <div className="absolute -top-1 -right-1 bg-gradient-to-r from-yellow-400 to-yellow-600 rounded-full p-1 shadow-lg">
                      <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0 w-full">
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className={`font-semibold text-lg ${isAdmin ? 'text-yellow-600' : 'text-sky-700'}`}>
                      {highlightText("@" + (profile.username || ""))}
                    </div>
                    {isAdmin && (
                      <span className="bg-gradient-to-r from-yellow-400 to-yellow-600 text-white text-xs font-bold px-2 py-0.5 rounded-full shadow-sm">
                        VIP
                      </span>
                    )}
                  </div>
                  <div className="flex gap-2 mt-1 text-xs flex-wrap">
                    <span className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full">{profile.follower_count || 0} followers</span>
                    {/* Category badge - uncomment after running add-followers-and-views.sql migration */}
                    {/* {profile.category && profile.category !== 'other' && (
                      <span className="bg-sky-100 text-sky-700 px-2 py-0.5 rounded-full">
                        {categories.find(c => c.value === profile.category)?.label || profile.category}
                      </span>
                    )} */}
                  </div>

                </div>
                <div className="flex gap-2 mt-2 sm:mt-0">
                  <Button
                    size="sm"
                    className="bg-sky-400 hover:bg-sky-500 text-white min-w-[60px] sm:min-w-[72px]"
                    style={{height: 32, minWidth: 60}}
                    onClick={e => { e.stopPropagation(); setSelectedProfile(profile); setShowModal(true); }}
                  >
                    View
                  </Button>
                  <Button
                    size="sm"
                    className="bg-sky-500 hover:bg-sky-600 text-white min-w-[60px] sm:min-w-[72px]"
                    style={{height: 32, minWidth: 60}}
                    disabled={followLoading === profile.id}
                    onClick={e => { e.stopPropagation(); handleFollow(profile); }}
                  >
                    {followLoading === profile.id ? "Following..." : "Follow"}
                  </Button>
                </div>
              </Card>
            );
              })}
          </div>
        )}
      </Card>

      {/* Profile Preview Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Profile Preview</DialogTitle>
          </DialogHeader>
          {selectedProfile && (
            <div className="flex flex-col items-center gap-3">
              <img
                src={selectedProfile.logo || `https://api.dicebear.com/7.x/identicon/svg?seed=${selectedProfile.username}`}
                alt={selectedProfile.username || "User"}
                className="w-20 h-20 rounded-full border-2 border-sky-300 object-cover"
              />
              <div className="font-semibold text-lg text-sky-700">@{selectedProfile.username || ""}</div>
              <div className="flex gap-2 mt-1 text-xs">
                <span className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full">{selectedProfile.follower_count || 0} followers</span>
              </div>

              <Button className="w-full bg-sky-500 hover:bg-sky-600 text-white" onClick={() => { setShowModal(false); navigate(`/@${selectedProfile.username}`); }}>View Full Profile</Button>

              {/* Products Section */}
              {profileProducts.length > 0 && (
                <div className="w-full mt-4">
                  <div className="font-semibold text-sky-700 mb-2">Products</div>
                  <div className="grid gap-2">
                    {profileProducts.map(product => (
                      <div key={product.id} className="border rounded p-2 flex gap-2 items-center bg-sky-50">
                        {product.image && <img src={product.image} alt={product.title} className="w-10 h-10 object-cover rounded" />}
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sky-800 truncate">{product.title}</div>
                          {product.description && <div className="text-xs text-gray-600 truncate">{product.description}</div>}
                        </div>
                        <div className="text-sky-600 font-bold text-sm">{product.price}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Pi Network Auth Required Modal */}
      <Dialog open={showPiAuthModal} onOpenChange={setShowPiAuthModal}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Sign in Required</DialogTitle>
          </DialogHeader>
          <div className="py-4 text-center">
            <p className="mb-4">You must be signed in with <span className="font-semibold text-sky-600">Pi Network</span> to follow users.</p>
            <Button
              className="w-full bg-sky-600 hover:bg-sky-700 text-white mb-2"
              onClick={signInWithPiNetwork}
              disabled={signingIn}
            >
              {signingIn ? "Signing in..." : "Sign in with Pi Network"}
            </Button>
            <Button className="w-full bg-gray-200 hover:bg-gray-300 text-gray-700" variant="outline" onClick={() => setShowPiAuthModal(false)} disabled={signingIn}>
              Cancel
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    {/* Followed Modal for any user */}
    <Dialog open={showFollowedModal} onOpenChange={setShowFollowedModal}>
      <DialogContent className="max-w-xs">
        <DialogHeader>
          <DialogTitle>Followed!</DialogTitle>
        </DialogHeader>
        <div className="py-4 text-center">
          <p className="mb-2">You have followed <span className="font-semibold text-sky-600">@{followedUsername}</span>!</p>
          <Button className="w-full bg-sky-500 hover:bg-sky-600 text-white" onClick={() => setShowFollowedModal(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
    </div>
  );
};

export default UserSearchPage;
