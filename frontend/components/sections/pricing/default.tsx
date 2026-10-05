"use client";

import {
  Building2,
  Check,
  Cloud,
  Crown,
  ShieldCheck,
  Sparkles,
  User,
  Users,
  Zap,
} from "lucide-react";
import { useState } from "react";

import { siteConfig } from "@/config/site";
import { cn } from "@/lib/utils";

import { PricingColumn, PricingColumnProps } from "../../ui/pricing-column";
import { Section } from "../../ui/section";

interface PricingProps {
  title?: string | false;
  description?: string | false;
  className?: string;
}

export default function Pricing({
  title = "Une offre adaptée à  votre établissement",
  description = "De l'école privée d'un seul site au grand réseau scolaire multi-campus : choisissez la formule qui accompagne votre croissance.",
  className = "",
}: PricingProps) {
  const [billingPeriod, setBillingPeriod] = useState<"monthly" | "annual">(
    "monthly",
  );

  const plans: PricingColumnProps[] = [
    {
      name: "One Target",
      icon: <Sparkles className="size-4" />,
      description:
        "La solution idéale pour gérer simplement un établissement avec une seule section.",
      price: 100,
      annualPrice: 90,
      period:
        billingPeriod === "annual"
          ? "Par mois, facturé annuellement"
          : "Facturé mensuellement",
      priceNote:
        "Une solution simple et accessible pour démarrer la digitalisation de votre établissement.",
      featuresHeading: "Inclus dans One Target :",
      billingToggle: true,
      billingPeriod,
      onBillingPeriodChange: setBillingPeriod,
      cta: {
        variant: "glow",
        label: "Commencer One Target",
        href: siteConfig.getStartedUrl,
      },
      features: [
        { label: "1 section scolaire" },
        { label: "1 compte administrateur" },
        { label: "1 comptes utilisateur" },
        { label: "Jusqu'à 300 élèves inscrits" },
        { label: "Gestion des élèves et du personnel" },
        { label: "Gestion des classes" },
        { label: "Gestion des paiements et frais scolaires" },
        { label: "Gestion des inscriptions" },
        {
          label: "Journal d'activité",
          description: "Rétention 1 jour",
        },
      ],
      variant: "default",
    },

    {
      name: "Pro",
      icon: <Crown className="size-4" />,
      description:
        "Une solution complète pour piloter un complexe scolaire composé de plusieurs niveaux.",
      price: 200,
      annualPrice: 190,
      period:
        billingPeriod === "annual"
          ? "Par mois, facturé annuellement"
          : "Facturé mensuellement",
      priceNote:
        "Toutes les fonctionnalités essentielles pour gérer efficacement votre établissement.",
      featuresHeading: "Tout One Target, plus :",
      billingToggle: true,
      billingPeriod,
      onBillingPeriodChange: setBillingPeriod,
      cta: {
        variant: "default",
        label: "Choisir Pro",
        href: siteConfig.pricing.pro,
      },
      features: [
        {
          label: "Jusqu'à 1 000 élèves inscrits",
          description: "Élève supplémentaire : 0,02 $/mois",
          link: { label: "Voir les tarifs par palier", href: "#pricing" },
        },
        { label: "4 comptes utilisateurs" },
        { label: "1 section maternelle" },
        { label: "1 section primaire" },
        { label: "1 section secondaire" },
        {
          label: "Sauvegardes cloud",
          description: "3 sauvegardes par mois",
        },
        { label: "Gestion complète du personnel" },
        { label: "Gestion des paiements et frais scolaires" },
        { label: "Rapports et statistiques" },
      ],
      variant: "glow-brand",
    },

    {
      name: "Pro Team",
      icon: <Users className="size-4" />,
      description:
        "La solution premium pour les établissements multi-sites et les équipes qui souhaitent collaborer en temps réel.",
      price: 350,
      annualPrice: 320,
      period:
        billingPeriod === "annual"
          ? "Par mois, facturé annuellement"
          : "Facturé mensuellement",
      priceNote:
        "Collaborez avec toute votre équipe et centralisez la gestion de vos établissements.",
      featuresHeading: "Tout Pro, plus :",
      billingToggle: true,
      billingPeriod,
      onBillingPeriodChange: setBillingPeriod,
      cta: {
        variant: "default",
        label: "Passer à Pro Team",
        href: siteConfig.pricing.team,
      },
      features: [
        {
          label: "Jusqu'à 1 000 sauvegardes cloud",
        },
        { label: "Configuration sur réseau local" },
        { label: "Collaboration en temps réel" },

        { label: "Comptes utilisateurs pour toute votre équipe" },
        { label: "Application mobile iOS & Android" },
        { label: "Accès depuis tablette et smartphone" },
        { label: "Synchronisation des données" },
        { label: "Gestion centralisée de votre personnel" },
        { label: "Support prioritaire" },
      ],
      variant: "glow",
    },

    {
      name: "Réseau scolaire",
      icon: <Building2 className="size-4" />,
      description:
        "Solutions et accompagnement sur mesure pour les grands réseaux scolaires et provinces éducatives.",
      price: -1,
      period: "Facturation annuelle uniquement",
      priceNote:
        "Contactez-nous pour une configuration adaptée à votre réseau d'établissements.",
      featuresHeading: "Tout Pro Team, plus :",
      cta: {
        variant: "default",
        label: "Contacter notre équipe",
        href: "#contact",
      },
      features: [
        { label: "Remises sur engagement annuel" },
        { label: "Disponibilité garantie 99,9 %" },
        { label: "Authentification unique (SSO)" },
        {
          label: "Support dédié",
          description: "Canal WhatsApp prioritaire",
        },
        { label: "Gestion de plusieurs établissements" },
        {
          label: "Journal d'activité",
          description: "Rétention personnalisée",
        },
        { label: "Formation et accompagnement au déploiement" },
        {
          label: "Questionnaires de sécurité",
          link: { label: "Sur demande", href: "#contact" },
        },
      ],
      variant: "default",
    },
  ];

  return (
    <Section className={cn(className)} id="pricing">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-12">
        {/* Header */}
        {(title || description) && (
          <div className="flex max-w-3xl flex-col items-center gap-5 px-4 text-center">
            {title && (
              <div className="flex flex-col items-center gap-3">
                <span className="inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-sm font-medium">
                  <Zap className="size-4" />
                  Des offres simples et transparentes
                </span>

                <h2 className="text-3xl leading-tight font-semibold sm:text-5xl sm:leading-tight">
                  {title}
                </h2>
              </div>
            )}

            {description && (
              <p className="text-md text-muted-foreground max-w-[700px] font-medium sm:text-xl">
                {description}
              </p>
            )}

            <div className="text-muted-foreground mt-2 flex flex-wrap items-center justify-center gap-x-6 gap-y-3 text-sm">
              <span className="flex items-center gap-2">
                <Check className="size-4" />
                Paiement mensuel ou annuel
              </span>
              <span className="flex items-center gap-2">
                <ShieldCheck className="size-4" />
                Données de vos élèves sécurisées
              </span>
              <span className="flex items-center gap-2">
                <Cloud className="size-4" />
                Sauvegarde cloud
              </span>
            </div>
          </div>
        )}

        {/* Pricing Cards */}
        <div className="max-w-container mx-auto grid w-full grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {plans.map((plan) => (
            <PricingColumn key={plan.name} {...plan} />
          ))}
        </div>

        {/* Bottom message */}
        <div className="flex max-w-2xl flex-col items-center gap-3 px-4 text-center">
          <div className="flex items-center gap-2 text-sm font-medium">
            <User className="size-4" />
            Besoin d'une configuration personnalisée ?
          </div>

          <p className="text-muted-foreground text-sm">
            Contactez-nous pour discuter de vos besoins spécifiques, notamment
            pour les établissements ayant plusieurs sites ou une organisation
            particulière (réseau confessionnel, province éducationnelle, etc.).
          </p>
        </div>
      </div>
    </Section>
  );
}
