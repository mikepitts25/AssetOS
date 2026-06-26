import { redirect } from "next/navigation";
import { Lightbulb, Sparkles, TrendingUp, TriangleAlert } from "lucide-react";

import { requireSessionContext } from "@/lib/auth";
import { isManager } from "@/lib/roles";
import { generateInsights, type Insight } from "@/lib/insights";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata = { title: "AI Insights · AssetOS" };

const SEVERITY: Record<
  Insight["severity"],
  { icon: typeof Lightbulb; badge: "default" | "success" | "warning"; label: string }
> = {
  info: { icon: Lightbulb, badge: "default", label: "Insight" },
  opportunity: { icon: TrendingUp, badge: "success", label: "Opportunity" },
  watch: { icon: TriangleAlert, badge: "warning", label: "Watch" },
};

export default async function AiInsightsPage() {
  const { profile, organization } = await requireSessionContext();
  if (!isManager(profile.role)) redirect("/app/dashboard");

  const insights = await generateInsights(organization.id);

  return (
    <div className="space-y-6">
      <PageHeader
        title="AI Insights"
        description="Recommendations generated from your parking data."
      />

      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="flex items-center gap-3 p-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-medium">
              AI-powered recommendations coming soon
            </p>
            <p className="text-sm text-muted-foreground">
              These insights are computed with deterministic rules today. A
              model-driven engine will replace them — same view, smarter
              suggestions.
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        {insights.map((insight, i) => {
          const meta = SEVERITY[insight.severity];
          const Icon = meta.icon;
          return (
            <Card key={i}>
              <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-lg bg-muted text-foreground">
                    <Icon className="h-4 w-4" />
                  </div>
                  <CardTitle className="text-base leading-snug">
                    {insight.title}
                  </CardTitle>
                </div>
                <Badge variant={meta.badge}>{meta.label}</Badge>
              </CardHeader>
              <CardContent>
                <CardDescription>{insight.detail}</CardDescription>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
