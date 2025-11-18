import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { 
  Info,
  Users,
  Zap,
  Shield,
  Globe,
  Heart,
  Code,
  Star,
  ExternalLink,
  Github,
  Twitter,
  Mail,
  Award,
  TrendingUp
} from "lucide-react";

interface AboutModalProps {
  children?: React.ReactNode;
}

export const AboutModal = ({ children }: AboutModalProps) => {
  const [open, setOpen] = useState(false);

  const appInfo = {
    name: "DropLink",
    version: "2.1.0",
    buildDate: new Date().toLocaleDateString(),
    description: "The ultimate Pi Network-powered bio link platform for creators and businesses"
  };

  const features = [
    {
      icon: <Zap className="w-5 h-5 text-yellow-500" />,
      title: "Pi Network Integration",
      description: "Earn Pi coins through profile views, donations, and engagement"
    },
    {
      icon: <Globe className="w-5 h-5 text-blue-500" />,
      title: "Custom Bio Pages",
      description: "Beautiful, responsive bio pages with custom domains"
    },
    {
      icon: <Users className="w-5 h-5 text-green-500" />,
      title: "Social Features",
      description: "Followers, comments, gifts, and community interaction"
    },
    {
      icon: <Shield className="w-5 h-5 text-purple-500" />,
      title: "Advanced Analytics",
      description: "Track visits, engagement, earnings, and performance"
    },
    {
      icon: <Code className="w-5 h-5 text-orange-500" />,
      title: "AI-Powered Support",
      description: "Smart assistance and automated optimization"
    },
    {
      icon: <Heart className="w-5 h-5 text-red-500" />,
      title: "Creator Economy",
      description: "Monetize your content through Pi Network ecosystem"
    }
  ];

  const team = [
    {
      name: "DropLink Dev Team",
      role: "Core Development",
      description: "Building the future of decentralized bio links"
    },
    {
      name: "Pi Network Community",
      role: "Beta Testers & Feedback",
      description: "Helping shape the platform through real usage"
    }
  ];

  const stats = [
    { label: "Active Users", value: "10K+", icon: <Users className="w-4 h-4" /> },
    { label: "Pi Earned", value: "50K+", icon: <Zap className="w-4 h-4" /> },
    { label: "Bio Pages", value: "25K+", icon: <Globe className="w-4 h-4" /> },
    { label: "Profile Views", value: "1M+", icon: <TrendingUp className="w-4 h-4" /> }
  ];

  const roadmapHighlights = [
    "Advanced AI content generation",
    "NFT marketplace integration",
    "Multi-language support",
    "Mobile app release",
    "Enterprise features",
    "Cross-chain crypto support"
  ];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button variant="ghost" size="sm">
            <Info className="w-4 h-4 mr-2" />
            About
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 text-2xl">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold">
              D
            </div>
            {appInfo.name}
            <Badge variant="secondary">v{appInfo.version}</Badge>
          </DialogTitle>
          <DialogDescription className="text-base">
            {appInfo.description}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* App Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Info className="w-5 h-5" />
                Application Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Version</p>
                  <p className="font-medium">{appInfo.version}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Build Date</p>
                  <p className="font-medium">{appInfo.buildDate}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Platform</p>
                  <p className="font-medium">Pi Network</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Status</p>
                  <Badge variant="outline" className="text-green-600 border-green-600">
                    <div className="w-2 h-2 rounded-full bg-green-600 mr-2" />
                    Active
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Statistics */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Platform Statistics
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {stats.map((stat) => (
                  <div key={stat.label} className="text-center p-4 rounded-lg bg-muted/50">
                    <div className="flex justify-center mb-2 text-blue-500">
                      {stat.icon}
                    </div>
                    <div className="text-2xl font-bold">{stat.value}</div>
                    <div className="text-sm text-muted-foreground">{stat.label}</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Features */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Star className="w-5 h-5" />
                Key Features
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-4">
                {features.map((feature, index) => (
                  <div key={index} className="flex gap-3 p-3 rounded-lg border">
                    <div className="mt-1">{feature.icon}</div>
                    <div>
                      <h4 className="font-medium">{feature.title}</h4>
                      <p className="text-sm text-muted-foreground">{feature.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Roadmap Highlights */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="w-5 h-5" />
                Coming Soon
              </CardTitle>
              <CardDescription>
                Exciting features in development
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-2">
                {roadmapHighlights.map((item, index) => (
                  <div key={index} className="flex items-center gap-2 text-sm">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                    {item}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Team */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Our Team
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {team.map((member, index) => (
                  <div key={index}>
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm">
                        {member.name.charAt(0)}
                      </div>
                      <div>
                        <h4 className="font-medium">{member.name}</h4>
                        <p className="text-sm text-blue-600">{member.role}</p>
                        <p className="text-sm text-muted-foreground">{member.description}</p>
                      </div>
                    </div>
                    {index < team.length - 1 && <Separator className="mt-4" />}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Contact & Links */}
          <Card>
            <CardHeader>
              <CardTitle>Connect With Us</CardTitle>
              <CardDescription>
                Join our community and stay updated
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" className="gap-2">
                  <Github className="w-4 h-4" />
                  GitHub
                  <ExternalLink className="w-3 h-3" />
                </Button>
                <Button variant="outline" size="sm" className="gap-2">
                  <Twitter className="w-4 h-4" />
                  Twitter
                  <ExternalLink className="w-3 h-3" />
                </Button>
                <Button variant="outline" size="sm" className="gap-2">
                  <Mail className="w-4 h-4" />
                  Support
                  <ExternalLink className="w-3 h-3" />
                </Button>
                <Button variant="outline" size="sm" className="gap-2">
                  <Zap className="w-4 h-4" />
                  Pi Network
                  <ExternalLink className="w-3 h-3" />
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Legal */}
          <div className="text-center text-sm text-muted-foreground space-y-2">
            <p>© 2024 DropLink. Built for the Pi Network ecosystem.</p>
            <p>
              <Button variant="link" size="sm" className="p-0 h-auto">Privacy Policy</Button>
              {" • "}
              <Button variant="link" size="sm" className="p-0 h-auto">Terms of Service</Button>
              {" • "}
              <Button variant="link" size="sm" className="p-0 h-auto">Pi Network Terms</Button>
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};