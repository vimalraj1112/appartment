import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import type { ComplaintPriority } from "@superlink/shared";
import { Link, useNavigate } from "react-router-dom";
import { createComplaint, listCategories } from "../features/complaints/complaint-api";
import { Alert } from "../components/ui/alert";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { PageHeader } from "../components/ui/page-header";
import { Select } from "../components/ui/select";

const PRIORITIES: ComplaintPriority[] = ["LOW", "MEDIUM", "HIGH", "URGENT"];

export function NewComplaintPage() {
  const navigate = useNavigate();
  const categories = useQuery({ queryKey: ["complaints", "categories"], queryFn: () => listCategories() });
  const [form, setForm] = useState({
    title: "",
    description: "",
    categoryId: "",
    priority: "MEDIUM" as ComplaintPriority,
    location: "",
  });

  const mutation = useMutation({
    mutationFn: () =>
      createComplaint({
        title: form.title.trim(),
        description: form.description.trim(),
        categoryId: form.categoryId || undefined,
        priority: form.priority,
        location: form.location.trim() || undefined,
      }),
    onSuccess: (complaint) => navigate(`/app/complaints/${complaint.id}`),
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="New complaint"
        subtitle="Describe the issue and we will route it to the right team."
        actions={
          <Link to="/app/complaints">
            <Button variant="ghost" size="sm">
              Back
            </Button>
          </Link>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>Complaint details</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              mutation.mutate();
            }}
          >
            <div className="space-y-1.5">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                required
                minLength={3}
                value={form.title}
                onChange={(event) => setForm({ ...form, title: event.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="description">Description</Label>
              <textarea
                id="description"
                required
                minLength={5}
                rows={4}
                value={form.description}
                onChange={(event) => setForm({ ...form, description: event.target.value })}
                className="w-full rounded-md border border-[var(--color-input)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]"
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label htmlFor="category">Category</Label>
                <Select
                  id="category"
                  value={form.categoryId}
                  onChange={(event) => setForm({ ...form, categoryId: event.target.value })}
                >
                  <option value="">Uncategorised</option>
                  {categories.data?.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="priority">Priority</Label>
                <Select
                  id="priority"
                  value={form.priority}
                  onChange={(event) =>
                    setForm({ ...form, priority: event.target.value as ComplaintPriority })
                  }
                >
                  {PRIORITIES.map((value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  placeholder="Kitchen, lift, parking…"
                  value={form.location}
                  onChange={(event) => setForm({ ...form, location: event.target.value })}
                />
              </div>
            </div>

            {mutation.isError && (
              <Alert variant="destructive">Could not raise the complaint. Please try again.</Alert>
            )}

            <Button type="submit" loading={mutation.isPending}>
              Submit complaint
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
