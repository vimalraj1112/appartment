import { Card, CardContent } from "../components/ui/card";
import { Icon } from "../components/ui/icons";
import { PageHeader } from "../components/ui/page-header";

export function PlaceholderPage({
  title,
  description = "This module is coming in a later phase.",
}: {
  title: string;
  description?: string;
}) {
  return (
    <div className="space-y-6">
      <PageHeader title={title} />
      <Card>
        <CardContent className="flex flex-col items-center gap-3 p-12 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-muted)] text-[var(--color-muted-foreground)]">
            <Icon name="package" />
          </span>
          <p className="text-sm text-[var(--color-muted-foreground)]">{description}</p>
        </CardContent>
      </Card>
    </div>
  );
}
