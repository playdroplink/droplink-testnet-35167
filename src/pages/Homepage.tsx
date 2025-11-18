import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useNavigate } from "react-router-dom";
import { 
  ArrowRight, 
  Zap, 
  Users, 
  Globe, 
  Smartphone, 
  Shield, 
  TrendingUp, 
  Star,
  PlayCircle,
  CheckCircle,
  Sparkles,
  Heart,
  DollarSign,
  Award,
  BarChart3,
  Link
} from "lucide-react";

export const Homepage = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");

  const features = [
    {
      icon: <Zap className="w-8 h-8 text-yellow-500" />,
      title: "Pi Network Powered",
      description: "Earn Pi coins through profile views, donations, and social engagement. Turn your online presence into passive income.",
      highlight: "Earn Pi Coins"
    },
    {
      icon: <Globe className="w-8 h-8 text-blue-500" />,
      title: "Custom Bio Links",
      description: "Create beautiful, professional bio pages with custom domains. Perfect for creators, businesses, and influencers.",
      highlight: "Professional Pages"
    },
    {
      icon: <Users className="w-8 h-8 text-green-500" />,
      title: "Social Community",
      description: "Build your following with likes, comments, and direct messages. Engage with your audience like never before.",
      highlight: "Build Community"
    },
    {
      icon: <BarChart3 className="w-8 h-8 text-purple-500" />,
      title: "Advanced Analytics",
      description: "Track clicks, views, earnings, and engagement. Make data-driven decisions to grow your presence.",
      highlight: "Data Insights"
    },
    {
      icon: <Shield className="w-8 h-8 text-orange-500" />,
      title: "Secure & Reliable",
      description: "Built on robust infrastructure with enterprise-grade security. Your data and earnings are always protected.",
      highlight: "Enterprise Security"
    },
    {
      icon: <Sparkles className="w-8 h-8 text-pink-500" />,
      title: "AI-Powered Features",
      description: "Smart content optimization, automated responses, and intelligent insights powered by advanced AI.",
      highlight: "AI Enhancement"
    }
  ];

  const stats = [
    { value: "10K+", label: "Active Creators", icon: <Users className="w-5 h-5" /> },
    { value: "50K+", label: "Pi Coins Earned", icon: <Zap className="w-5 h-5" /> },
    { value: "1M+", label: "Profile Views", icon: <TrendingUp className="w-5 h-5" /> },
    { value: "25K+", label: "Bio Pages Created", icon: <Globe className="w-5 h-5" /> }
  ];

  const testimonials = [
    {
      name: "Sarah Chen",
      role: "Content Creator",
      avatar: "S",
      content: "DropLink transformed my online presence. I've earned over 500 Pi coins just from profile views and donations!",
      earned: "500+ Pi"
    },
    {
      name: "Mike Rodriguez",
      role: "Small Business Owner",
      avatar: "M",
      content: "The analytics are incredible. I can see exactly what content drives engagement and Pi earnings.",
      earned: "300+ Pi"
    },
    {
      name: "Lisa Park",
      role: "Influencer",
      avatar: "L",
      content: "The community features are amazing. My followers love the interactive elements and Pi rewards.",
      earned: "750+ Pi"
    }
  ];

  const pricingPlans = [
    {
      name: "Free",
      price: "0",
      period: "Forever",
      description: "Perfect for getting started with DropLink",
      features: [
        "Custom bio page",
        "Basic analytics",
        "Pi Network integration",
        "Up to 10 links",
        "Community features"
      ],
      popular: false,
      cta: "Get Started Free"
    },
    {
      name: "Pro",
      price: "9.99",
      period: "per month",
      description: "Advanced features for serious creators",
      features: [
        "Everything in Free",
        "Custom domain",
        "Advanced analytics",
        "Unlimited links",
        "Premium themes",
        "AI-powered insights",
        "Priority support"
      ],
      popular: true,
      cta: "Upgrade to Pro"
    },
    {
      name: "Business",
      price: "19.99",
      period: "per month",
      description: "Enterprise solutions for businesses",
      features: [
        "Everything in Pro",
        "Team collaboration",
        "White-label options",
        "API access",
        "Advanced security",
        "Custom integrations",
        "Dedicated support"
      ],
      popular: false,
      cta: "Contact Sales"
    }
  ];

  const handleGetStarted = () => {
    navigate("/dashboard");
  };

  const handleEmailSignup = () => {
    if (email) {
      // Store email for later use or send to newsletter
      console.log("Email signup:", email);
      setEmail("");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="border-b border-border px-4 lg:px-8 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold">
              D
            </div>
            <span className="text-xl font-bold text-sky-500">DropLink</span>
            <Badge variant="secondary" className="ml-2">Pi Network</Badge>
          </div>
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => navigate("/dashboard")}>
              Dashboard
            </Button>
            <Button onClick={handleGetStarted}>
              Get Started <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="px-4 lg:px-8 py-16 lg:py-24">
        <div className="max-w-7xl mx-auto text-center">
          <Badge variant="outline" className="mb-4 text-yellow-600 border-yellow-600">
            <Zap className="w-3 h-3 mr-1" />
            Powered by Pi Network
          </Badge>
          <h1 className="text-4xl lg:text-6xl font-bold mb-6 bg-gradient-to-r from-blue-600 via-purple-600 to-blue-600 bg-clip-text text-transparent">
            Your Bio Link,<br />
            <span className="text-yellow-500">Powered by Pi</span>
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Create stunning bio pages, connect with your audience, and earn Pi cryptocurrency 
            through every interaction. The future of creator monetization is here.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
            <Button size="lg" onClick={handleGetStarted} className="text-lg px-8">
              Start Earning Pi <Zap className="w-5 h-5 ml-2" />
            </Button>
            <Button variant="outline" size="lg" className="text-lg px-8">
              <PlayCircle className="w-5 h-5 mr-2" />
              Watch Demo
            </Button>
          </div>
          
          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mt-16">
            {stats.map((stat, index) => (
              <div key={index} className="text-center">
                <div className="flex justify-center mb-2 text-blue-500">
                  {stat.icon}
                </div>
                <div className="text-3xl font-bold">{stat.value}</div>
                <div className="text-sm text-muted-foreground">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="px-4 lg:px-8 py-16 bg-muted/50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-5xl font-bold mb-4">
              Everything You Need to <span className="text-yellow-500">Earn Pi</span>
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              DropLink combines the power of professional bio links with Pi Network's 
              revolutionary cryptocurrency ecosystem.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <Card key={index} className="border-border/50 hover:border-blue-500/50 transition-all duration-300 hover:shadow-lg">
                <CardHeader>
                  <div className="flex items-center gap-4 mb-2">
                    {feature.icon}
                    <Badge variant="outline" className="text-yellow-600 border-yellow-600">
                      {feature.highlight}
                    </Badge>
                  </div>
                  <CardTitle className="text-xl">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="px-4 lg:px-8 py-16">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-5xl font-bold mb-4">
              How It <span className="text-blue-500">Works</span>
            </h2>
            <p className="text-xl text-muted-foreground">
              Start earning Pi in just three simple steps
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-blue-500 text-white flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                1
              </div>
              <h3 className="text-xl font-semibold mb-2">Create Your Page</h3>
              <p className="text-muted-foreground">
                Sign up and customize your bio page with links, content, and branding. 
                Make it uniquely yours.
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-purple-500 text-white flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                2
              </div>
              <h3 className="text-xl font-semibold mb-2">Share & Engage</h3>
              <p className="text-muted-foreground">
                Share your DropLink everywhere. Every view, click, and interaction 
                earns you Pi cryptocurrency.
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-yellow-500 text-white flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                3
              </div>
              <h3 className="text-xl font-semibold mb-2">Earn Pi Rewards</h3>
              <p className="text-muted-foreground">
                Watch your Pi balance grow as your audience engages with your content. 
                Real cryptocurrency, real value.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="px-4 lg:px-8 py-16 bg-muted/50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-5xl font-bold mb-4">
              Creators Love <span className="text-purple-500">DropLink</span>
            </h2>
            <p className="text-xl text-muted-foreground">
              Join thousands of creators already earning Pi
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <Card key={index} className="border-border/50">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold">
                      {testimonial.avatar}
                    </div>
                    <div>
                      <div className="font-semibold">{testimonial.name}</div>
                      <div className="text-sm text-muted-foreground">{testimonial.role}</div>
                    </div>
                    <Badge variant="outline" className="ml-auto text-yellow-600 border-yellow-600">
                      {testimonial.earned}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground italic">\"{testimonial.content}\"</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="px-4 lg:px-8 py-16">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-5xl font-bold mb-4">
              Choose Your <span className="text-green-500">Plan</span>
            </h2>
            <p className="text-xl text-muted-foreground">
              Start for free, upgrade when you're ready to unlock more earning potential
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            {pricingPlans.map((plan, index) => (
              <Card key={index} className={`relative ${plan.popular ? 'border-blue-500 shadow-lg scale-105' : 'border-border/50'}`}>
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    <Badge className="bg-blue-500">Most Popular</Badge>
                  </div>
                )}
                <CardHeader>
                  <CardTitle className="text-2xl">{plan.name}</CardTitle>
                  <div className="text-3xl font-bold">
                    ${plan.price}
                    <span className="text-lg text-muted-foreground font-normal">/{plan.period}</span>
                  </div>
                  <CardDescription>{plan.description}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    {plan.features.map((feature, featureIndex) => (
                      <div key={featureIndex} className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                        <span className="text-sm">{feature}</span>
                      </div>
                    ))}
                  </div>
                  <Button 
                    className="w-full" 
                    variant={plan.popular ? "default" : "outline"}
                    onClick={handleGetStarted}
                  >
                    {plan.cta}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Newsletter */}
      <section className="px-4 lg:px-8 py-16 bg-gradient-to-r from-blue-600 to-purple-600">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl lg:text-4xl font-bold text-white mb-4">
            Stay Updated with DropLink
          </h2>
          <p className="text-xl text-blue-100 mb-8">
            Get the latest updates on new features, Pi earning opportunities, and platform news.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 max-w-md mx-auto">
            <Input
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="bg-white/10 border-white/20 text-white placeholder:text-white/70"
            />
            <Button onClick={handleEmailSignup} variant="secondary">
              Subscribe
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border px-4 lg:px-8 py-12">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm">
                  D
                </div>
                <span className="text-lg font-bold text-sky-500">DropLink</span>
              </div>
              <p className="text-sm text-muted-foreground">
                The Pi Network-powered platform for creators and businesses to monetize their online presence.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Product</h4>
              <div className="space-y-2 text-sm text-muted-foreground">
                <div>Features</div>
                <div>Pricing</div>
                <div>API</div>
                <div>Integrations</div>
              </div>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Company</h4>
              <div className="space-y-2 text-sm text-muted-foreground">
                <div>About</div>
                <div>Blog</div>
                <div>Careers</div>
                <div>Contact</div>
              </div>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Support</h4>
              <div className="space-y-2 text-sm text-muted-foreground">
                <div>Help Center</div>
                <div>Privacy Policy</div>
                <div>Terms of Service</div>
                <div>Pi Network Terms</div>
              </div>
            </div>
          </div>
          <div className="border-t border-border mt-8 pt-8 text-center text-sm text-muted-foreground">
            © 2024 DropLink. Built for the Pi Network ecosystem. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
};