

interface Plan {
	name: string;
	monthlyPrice: number;
	yearlyPrice: number;
	features: string[];
	popular?: boolean;
	savings?: string;
}

const plans: Plan[] = [
	{
		name: "Free",
		monthlyPrice: 0,
		yearlyPrice: 0,
		features: [
			"1 custom link only",
			"1 social media link only",
			"Basic profile customization",
			"Basic QR code sharing",
			"Public bio page visibility",
			"DropLink watermark displayed",
			"Pi Ad Network banners shown",
			"Analytics require watching ads",
			"Limited theme options",
			"Community support only",
			"Watch ads to temporarily access premium features",
			"Earn DROP tokens by watching ads"
		]
	},
	{
		name: "Basic",
		monthlyPrice: 10,
		yearlyPrice: 96,
		features: [
			"Up to 5 custom links",
			"Up to 3 social media links",
			"Standard profile customization",
			"Standard QR code sharing",
			"No DropLink watermark",
			"Ad-free experience",
			"Access to analytics dashboard (basic)",
			"Email support (standard)",
			"More theme options (3+)",
			"Product listings (up to 3)",
			"Priority for new features"
		],
		savings: "20% savings on yearly"
	},
	{
		name: "Premium",
		monthlyPrice: 20,
		yearlyPrice: 192,
		features: [
			"Everything in Basic, plus:",
			"Unlimited custom links with icon selection",
			"Unlimited social media links",
			"YouTube video integration",
			"Custom themes & colors (6+ options)",
			"Advanced analytics dashboard",
			"Pi Network wallet integration",
			"DROP token receiving",
			"Product listings with pricing",
			"Priority email support",
			"Custom domain support (coming soon)"
		],
		popular: true,
		savings: "20% savings on yearly"
	},
	{
		name: "Pro",
		monthlyPrice: 30,
		yearlyPrice: 288,
		features: [
			"Everything in Premium, plus:",
			"AI-powered analytics insights",
			"Advanced visitor & location-based tracking",
			"A/B testing for links",
			"API access for integrations",
			"White-label solutions",
			"24/7 priority support",
			"Bulk link management",
			"Export analytics data",
			"Pi Payments integration (DropPay)",
			"Transaction history & management",
			"AI chat widget",
			"Multi-profile management"
		]
	}
];

const Subscription = () => {
	const [isYearly, setIsYearly] = useState(false);
	const [loading, setLoading] = useState(false);
	const [currentPlan, setCurrentPlan] = useState<string | null>(null);
	const [subscription, setSubscription] = useState<any>(null);
	const navigate = useNavigate();
	const { piUser, createPayment } = usePi();

	useEffect(() => {
		// Load current subscription from Supabase
		const fetchSubscription = async () => {
			if (!piUser) return;
			const { data, error } = await supabase
				.from("subscriptions")
				.select("*, profiles!inner(username)")
				.eq("profiles.username", piUser.username)
				.order("end_date", { ascending: false })
				.limit(1)
				.maybeSingle();
			if (data) {
				setSubscription(data);
				setCurrentPlan(data.plan_type === "pro" ? "Pro" : "Free");
			} else {
				setCurrentPlan("Free");
			}
		};
		fetchSubscription();
	}, [piUser]);

	const handleSubscribe = async (planName: string, price: number) => {
		if (!piUser) {
			toast.error("Please sign in with Pi Network first");
			return;
		}
		setLoading(true);
		try {
			// For free plan, just update subscription
			if (planName === "Free") {
				// ...existing code for free plan activation...
				toast.success("Free plan activated! 🎉");
				setCurrentPlan("Free");
				setSubscription({ plan_type: "free" });
				return;
			}
			// For paid plan, initiate Pi payment
			await createPayment(
				price,
				`Droplink ${planName} ${isYearly ? 'Yearly' : 'Monthly'} Subscription`,
				{
					subscriptionPlan: planName.toLowerCase(),
					billingPeriod: isYearly ? 'yearly' : 'monthly',
					username: piUser.username
				}
			);
			toast.success(`Successfully subscribed to ${planName} plan! 🎉`);
			setCurrentPlan(planName);
			setSubscription({ plan_type: planName.toLowerCase() });
		} catch (error: any) {
			toast.error(error.message || "Failed to process subscription. Please try again.");
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className="container mx-auto py-12">
			<div className="max-w-4xl mx-auto">
				<div className="mb-8 text-center">
					<h1 className="text-4xl font-bold mb-2">Choose Your Plan</h1>
					<p className="text-lg text-muted-foreground mb-2">
						Unlock more features and remove ads with a paid plan.
					</p>
					<p className="text-sm text-muted-foreground">
						All prices are in Pi (π) - Pi Network's native cryptocurrency
					</p>
				</div>

				<div className="flex items-center justify-center gap-4 mb-12">
					<Label htmlFor="billing-toggle" className={!isYearly ? "font-bold" : ""}>
						Monthly
					</Label>
					<Switch
						id="billing-toggle"
						checked={isYearly}
						onCheckedChange={setIsYearly}
					/>
					<Label htmlFor="billing-toggle" className={isYearly ? "font-bold" : ""}>
						Yearly <span className="text-primary">(Save 20%)</span>
					</Label>
				</div>

				<div className="grid grid-cols-1 md:grid-cols-2 gap-8">
					{plans.map((plan) => {
						const price = isYearly ? plan.yearlyPrice : plan.monthlyPrice;
						const period = isYearly ? "per year" : "per month";
						const isCurrent = currentPlan === plan.name;
						return (
							<Card key={plan.name} className={`relative ${plan.popular ? 'border-primary shadow-lg' : ''}`}>
								{plan.popular && (
									<div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground px-4 py-1 rounded-full text-sm font-medium">
										Most Popular
									</div>
								)}
								<CardHeader>
									<CardTitle className="text-2xl">{plan.name}</CardTitle>
									<CardDescription>
										<span className="text-3xl font-bold text-foreground">
											{price} Pi
										</span>
										<span className="text-muted-foreground">/{period}</span>
									</CardDescription>
								</CardHeader>
								<CardContent>
									<ul className="space-y-3 mb-6">
										{plan.features.map((feature, idx) => (
											<li key={idx} className="flex items-start gap-2">
												<Check className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
												<span className="text-sm">{feature}</span>
											</li>
										))}
									</ul>
									<Button
										className="w-full mb-2"
										variant={plan.popular ? "default" : "outline"}
										disabled={isCurrent || loading}
										onClick={() => handleSubscribe(plan.name, price)}
									>
										{isCurrent ? "Current Plan" : price === 0 ? "Current Plan" : "Subscribe with Pi"}
									</Button>
									{plan.name !== "Free" && (
										<div className="flex flex-col gap-2">
											<div className="flex items-center mb-1">
												<span className="text-sm font-medium">Pay with Drop</span>
											</div>
											<Button className="w-full" variant="secondary" disabled>
												{isDropAvailable ? `Pay with Drop (Coming Soon)` : `Drop Coming Soon (Mainnet Only)`}
											</Button>
										</div>
									)}
									{subscription && isCurrent && subscription.end_date && (
										<p className="text-xs text-center mt-2 text-muted-foreground">
											Renews on {new Date(subscription.end_date).toLocaleDateString()}
										</p>
									)}
								</CardContent>
							</Card>
						);
					})}
				</div>

				<div className="mt-12 text-center text-sm text-muted-foreground space-y-2">
					<p>All plans include a 14-day Pi-back guarantee.</p>
					<p>Payments are processed securely through Pi Network blockchain.</p>
					<p>Questions? Contact support@droplink.space</p>
				</div>
			</div>
		</div>
	);
};

export default Subscription;
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check, ArrowLeft, Info } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { usePi } from "@/contexts/PiContext";
import { PI_CONFIG, validateMainnetConfig } from "@/config/pi-config";
// Helper to check if Drop is available (mainnet only)
const isDropAvailable = validateMainnetConfig();

