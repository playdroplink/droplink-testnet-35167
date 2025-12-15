import React, { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const plans = ["all", "free", "basic", "premium", "pro"];
const sortOptions = [
  { value: "username", label: "Username (A-Z)" },
  { value: "followers", label: "Most Followers" },
  { value: "recent", label: "Most Recent" },
];

const UserSearchPage = () => {
  const [query, setQuery] = useState("");
  interface ProfileResult {
    id: string;
    username: string;
    logo?: string;
    follower_count?: number;
    created_at?: string;
    avatar_url?: string;
    bio?: string;
    display_name?: string;
  }
  const [results, setResults] = useState<ProfileResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedPlan, setSelectedPlan] = useState("all");
  const [sortBy, setSortBy] = useState("username");
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [selectedProfile, setSelectedProfile] = useState<ProfileResult | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [showPiAuthModal, setShowPiAuthModal] = useState(false);
  const [signingIn, setSigningIn] = useState(false);

  // Placeholder for Pi Network sign-in
  const signInWithPiNetwork = async () => {
    setSigningIn(true);
    // Simulate sign-in delay
    setTimeout(() => {
      // Here you would integrate with Pi Network auth
      setSigningIn(false);
      setShowPiAuthModal(false);
      // Optionally, set auth token in localStorage or context
      localStorage.setItem("pi_auth_token", "dummy_token");
    }, 1200);
  };
  const [followLoading, setFollowLoading] = useState<string | null>(null);
  const [highlight, setHighlight] = useState("");
  const [profileProducts, setProfileProducts] = useState<any[]>([]);
  const [showFollowedModal, setShowFollowedModal] = useState(false);
  const [followedUsername, setFollowedUsername] = useState<string | null>(null);
  const [userCount, setUserCount] = useState<number | null>(null);
  const [viewAll, setViewAll] = useState(false); // Only declare once
  const navigate = useNavigate();
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
    const { data, error } = await supabase
      .from("profiles")
      .select("id, username, logo, created_at, avatar_url, bio, display_name"); // follower_count removed
    if (!error && data) {
      // If follower_count is needed, fetch it separately for each profile
      const withFollowers = await Promise.all(data.map(async (profile: any) => {
        if (profile.id) {
          const { count, error: countError } = await supabase
            .from("followers")
            .select("*", { count: "exact", head: true })
            .eq("following_profile_id", profile.id);
          if (!countError) profile.follower_count = count || 0;
        }
        return profile;
      }));
      setResults(withFollowers);
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
                .select("id, username, follower_count, created_at, avatar_url, bio, display_name, plan, logo, business_name")
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
            const { count, error: countError } = await supabase
              .from("followers")
              .select("*", { count: "exact", head: true })
              .eq("following_profile_id", profile.id);
            if (!countError) profile.follower_count = count || 0;
          }
          data = [profile];
        } else {
          throw new Error("User not found");
        }
      } else {
        let search = supabase
          .from("profiles")
          .select("id, username, logo, follower_count, created_at, avatar_url, bio, display_name")
          .ilike("username", `%${query.replace(/^@/, "")}%`);
        if (selectedPlan !== "all") (search as any) = (search as any).eq("plan", selectedPlan);
        let result = await search;
        if (result.error) throw result.error;
        data = result.data;
        // Fetch follower count for each profile if not present
        if (Array.isArray(data)) {
          data = await Promise.all(data.map(async (profile: ProfileResult) => {
            if (profile.id && (profile.follower_count === undefined || profile.follower_count === null)) {
              const { count, error: countError } = await supabase
                .from("followers")
                .select("*", { count: "exact", head: true })
                .eq("following_profile_id", profile.id);
              if (!countError) profile.follower_count = count || 0;
            }
            return profile;
          }));
        }
        // Sorting
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

  // Add Pi Auth check (pseudo, replace with your real auth logic)
  const isPiAuthenticated = () => {
    // Example: check for a token in localStorage or context
    return Boolean(localStorage.getItem("pi_auth_token"));
  };

  const handleFollow = async (profile: any) => {
    if (!isPiAuthenticated()) {
      setShowPiAuthModal(true);
      return;
    }
    setFollowLoading(profile.id);
    // Save follow relationship to Supabase
    try {
      // Get current user id (assuming it's stored in localStorage or context)
      const currentUserId = localStorage.getItem("pi_user_id");
      if (!currentUserId) throw new Error("User not authenticated");
      // Insert into followers table: follower_profile_id (current user), following_profile_id (profile.id)
      const { error } = await supabase
        .from("followers")
        .insert([
          {
            follower_profile_id: currentUserId,
            following_profile_id: profile.id,
          },
        ]);
      if (error) throw error;
    } catch (err) {
      // Optionally handle error (show message, etc)
    }
    setTimeout(() => {
      setFollowLoading(null);
      setFollowedUsername(profile.username);
      setShowFollowedModal(true);
    }, 800);
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
          <div className="text-lg font-semibold text-sky-700">
            {userCount !== null ? `${userCount} Droplink Users` : 'Loading user count...'}
          </div>
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
          <select
            className="border rounded px-2 py-1 text-sm w-full sm:w-auto"
            value={selectedPlan}
            onChange={e => setSelectedPlan(e.target.value)}
          >
            {plans.map(plan => (
              <option key={plan} value={plan}>{plan.charAt(0).toUpperCase() + plan.slice(1)}</option>
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
              .map((profile: ProfileResult) => (
              <Card key={profile.id} className="flex flex-col sm:flex-row items-center gap-2 sm:gap-4 p-2 sm:p-4 hover:shadow-xl transition cursor-pointer border border-sky-200 bg-white" onClick={() => { setSelectedProfile(profile); setShowModal(true); }}>
                <img
                  src={profile.logo || profile.avatar_url || `https://api.dicebear.com/7.x/identicon/svg?seed=${profile.username}`}
                  alt={profile.username || "User"}
                  className="w-12 h-12 sm:w-14 sm:h-14 rounded-full border-2 border-sky-300 object-cover"
                />
                <div className="flex-1 min-w-0 w-full">
                  <div className="font-semibold text-lg text-sky-700">{highlightText("@" + (profile.username || ""))}</div>
                  <div className="flex gap-2 mt-1 text-xs">
                    <span className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full">{profile.follower_count ?? 0} followers</span>
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
            ))}
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
                src={selectedProfile.logo || selectedProfile.avatar_url || `https://api.dicebear.com/7.x/identicon/svg?seed=${selectedProfile.username}`}
                alt={selectedProfile.username || "User"}
                className="w-20 h-20 rounded-full border-2 border-sky-300 object-cover"
              />
              <div className="font-semibold text-lg text-sky-700">@{selectedProfile.username || ""}</div>
              <div className="flex gap-2 mt-1 text-xs">
                <span className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full">{selectedProfile.follower_count ?? 0} followers</span>
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
