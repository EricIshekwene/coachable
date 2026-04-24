import { Link } from "react-router-dom";
import { FiCheck } from "react-icons/fi";
import NavBar from '../components/NavBar';

const TIERS = [
    {
        name: "Free",
        price: "$0",
        desc: "Perfect for getting started with simple play design.",
        features: [
            "Create up to 5 plays",
            "Basic drag & drop editor",
            "Standard play animations",
            "Export as image",
        ],
        cta: "Get Started",
        highlight: false,
    },
    {
        name: "Premium",
        price: "$12",
        desc: "For serious coaches building structured playbooks.",
        features: [
            "Unlimited plays",
            "Advanced animations",
            "Playbook folders",
            "Team sharing",
            "Export as video",
        ],
        cta: "Upgrade to Premium",
        highlight: true,
    },
    {
        name: "Pro",
        price: "$29",
        desc: "Built for full teams and advanced collaboration.",
        features: [
            "Everything in Premium",
            "Team collaboration tools",
            "Role permissions",
            "Cloud playbook library",
            "Priority support",
        ],
        cta: "Go Pro",
        highlight: false,
    },
];

export default function Product() {
    return (
        <div className="min-h-screen bg-BrandBlack text-white font-DmSans">
            <NavBar />
            <section className="mx-auto max-w-5xl px-6 pt-28 text-center">
                <h1 className="font-Manrope text-4xl font-bold md:text-6xl">
                    Clear pricing for <span className="text-BrandOrange">every coach</span>
                </h1>

                <p className="mx-auto mt-6 max-w-xl text-BrandGray">
                    Start designing plays for free. Upgrade when your team needs more power, collaboration, and complexity.
                </p>
            </section>

            <section className="mx-auto mt-16 grid max-w-6xl grid-cols-1 gap-6 px-6 pb-24 md:grid-cols-3">
                {TIERS.map((tier) => (
                    <div
                        key={tier.name}
                        className={`rounded-xl border p-8 transition
                            ${tier.highlight
                                ? "border-BrandOrange bg-BrandBlack2 scale-[1.03]"
                                : "border-BrandGray2/40 bg-BrandBlack2/50"
                            }`}
                    >
                        <h3 className="font-Manrope text-xl font-semibold">
                            {tier.name}
                        </h3>

                        <p className="mt-2 text-sm text-BrandGray">
                            {tier.desc}
                        </p>

                        <div className="mt-6 flex items-end gap-1">
                            <span className="text-4xl font-bold">{tier.price}</span>
                            <span className="text-sm text-BrandGray">/month</span>
                        </div>

                        <ul className="mt-6 space-y-3 text-sm">
                            {tier.features.map((f) => (
                                <li key={f} className="flex items-center gap-2 text-BrandGray">
                                    <FiCheck className="text-BrandOrange" />
                                    {f}
                                </li>
                            ))}
                        </ul>

                        <Link
                            to="/signup"
                            className={`mt-8 block rounded-lg px-4 py-3 text-center text-sm font-semibold transition
              ${tier.highlight
                                    ? "bg-BrandOrange text-white hover:brightness-110"
                                    : "border border-BrandGray2 text-BrandGray hover:text-white hover:border-BrandGray"
                                }`}
                        >
                            {tier.cta}
                        </Link>
                    </div>
                ))}
            </section >
        </div >
    )
}