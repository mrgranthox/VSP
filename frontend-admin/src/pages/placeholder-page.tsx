import { Construction, Rocket } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface PlaceholderPageProps {
  title: string;
  subtitle: string;
}

const PlaceholderPage = ({ title, subtitle }: PlaceholderPageProps) => (
  <div className="space-y-6">
    <PageHeader subtitle={subtitle} title={title} />
    <Card className="border-dashed">
      <CardHeader>
        <CardTitle>Page scaffold is ready</CardTitle>
        <CardDescription>This route is in the shell and permission system already. The detailed table or form flow is the next slice.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl bg-slate-50 p-5">
          <Construction className="h-5 w-5 text-blue-700" />
          <h3 className="mt-3 font-semibold text-slate-950">Frontend structure</h3>
          <p className="mt-2 text-sm text-slate-500">Routing, auth guard, shared shell, and backend API access are already live.</p>
        </div>
        <div className="rounded-2xl bg-slate-50 p-5">
          <Rocket className="h-5 w-5 text-violet-700" />
          <h3 className="mt-3 font-semibold text-slate-950">Next implementation step</h3>
          <p className="mt-2 text-sm text-slate-500">Replace this placeholder with the exact list/detail workflow from the admin prompt pack.</p>
        </div>
      </CardContent>
    </Card>
  </div>
);

export { PlaceholderPage };
