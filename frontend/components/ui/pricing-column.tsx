import { cva, type VariantProps } from "class-variance-authority";
import { Check } from "lucide-react";
import Link from "next/link";
import { ReactNode } from "react";

import { cn } from "@/lib/utils";

import { Button } from "./button";

const pricingColumnVariants = cva(
  "max-w-container relative flex flex-col gap-6 overflow-hidden rounded-2xl p-8 shadow-xl",
  {
    variants: {
      variant: {
        default: "glass-1 to-transparent dark:glass-3",
        glow: "glass-2 to-transparent dark:glass-3 after:content-[''] after:absolute after:-top-[128px] after:left-1/2 after:h-[128px] after:w-[100%] after:max-w-[960px] after:-translate-x-1/2 after:rounded-[50%] dark:after:bg-foreground/30 after:blur-[72px]",
        "glow-brand":
          "glass-3 from-card/100 to-card/100 dark:glass-4 after:content-[''] after:absolute after:-top-[128px] after:left-1/2 after:h-[128px] after:w-[100%] after:max-w-[960px] after:-translate-x-1/2 after:rounded-[50%] after:bg-brand-foreground/70 after:blur-[72px]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface PricingFeature {
  label: string;
  description?: string;
  link?: { label: string; href: string };
}

export interface PricingColumnProps
  extends
    Omit<React.HTMLAttributes<HTMLDivElement>, "onChange">,
    VariantProps<typeof pricingColumnVariants> {
  name: string;
  icon?: ReactNode;
  description: string;
  price: number;
  annualPrice?: number;
  priceNote: string;
  period: string;
  featuresHeading: string;
  billingToggle?: boolean;
  billingPeriod?: "monthly" | "annual";
  onBillingPeriodChange?: (period: "monthly" | "annual") => void;
  cta: {
    variant: "glow" | "default";
    label: string;
    href: string;
  };
  features: PricingFeature[];
}

export function PricingColumn({
  name,
  icon,
  description,
  price,
  annualPrice,
  priceNote,
  cta,
  features,
  featuresHeading,
  variant,
  className,
  period,
  billingToggle,
  billingPeriod = "monthly",
  onBillingPeriodChange,
  ...props
}: PricingColumnProps) {
  const displayPrice =
    billingToggle && billingPeriod === "annual" && annualPrice !== undefined
      ? annualPrice
      : price;

  return (
    <div
      className={cn(pricingColumnVariants({ variant, className }))}
      {...props}
    >
      <hr
        className={cn(
          "via-foreground/60 absolute top-0 left-[10%] h-[1px] w-[80%] border-0 bg-linear-to-r from-transparent to-transparent",
          variant === "glow-brand" && "via-brand",
        )}
      />

      <div className="flex flex-col gap-6">
        <header className="flex items-center justify-between gap-2">
          <h2 className="flex items-center gap-2 font-bold">
            {icon && (
              <span className="text-muted-foreground flex items-center gap-2">
                {icon}
              </span>
            )}
            {name}
          </h2>

          {billingToggle && (
            <div className="bg-muted flex items-center rounded-full p-1 text-xs font-medium">
              <button
                type="button"
                onClick={() => onBillingPeriodChange?.("monthly")}
                className={cn(
                  "cursor-pointer rounded-full px-2.5 py-1 transition-colors",
                  billingPeriod === "monthly"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                Mensuel
              </button>
              <button
                type="button"
                onClick={() => onBillingPeriodChange?.("annual")}
                className={cn(
                  "cursor-pointer rounded-full px-2.5 py-1 transition-colors",
                  billingPeriod === "annual"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                Annuel
              </button>
            </div>
          )}
        </header>

        <section className="flex flex-col gap-1">
          <div className="flex items-baseline gap-1">
            {price > 0 ? (
              <>
                <span className="text-muted-foreground text-2xl font-bold">
                  $
                </span>
                <span className="text-5xl font-bold">{displayPrice}</span>
              </>
            ) : price < 0 ? (
              <span className="text-5xl font-bold"></span>
            ) : (
              <span className="text-5xl font-bold">Gratuit</span>
            )}
          </div>
          <p className="text-muted-foreground text-sm">{period}</p>
        </section>

        <p className="text-muted-foreground max-w-[220px] text-sm">
          {description}
        </p>

        <Button variant={cta.variant} size="lg" className="w-full" asChild>
          <Link href={cta.href}>{cta.label}</Link>
        </Button>

        <p className="text-muted-foreground min-h-[40px] max-w-[220px] text-sm">
          {priceNote}
        </p>

        <hr className="border-input" />
      </div>

      <div className="flex flex-col gap-4">
        <p className="text-sm font-medium">{featuresHeading}</p>
        <ul className="flex flex-col gap-3">
          {features.map((feature, index) => (
            <li
              key={`${feature.label}-${index}`}
              className="flex items-start gap-2 text-sm"
            >
              <Check className="text-muted-foreground mt-0.5 size-4 shrink-0" />
              <div className="flex flex-col">
                <span>{feature.label}</span>
                {feature.description && (
                  <span className="text-muted-foreground text-xs">
                    {feature.description}
                  </span>
                )}
                {feature.link && (
                  <Link
                    href={feature.link.href}
                    className="text-brand-foreground text-xs underline underline-offset-2"
                  >
                    {feature.link.label}
                  </Link>
                )}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export { pricingColumnVariants };
