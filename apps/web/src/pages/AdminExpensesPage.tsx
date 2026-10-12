import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createExpense,
  createExpenseCategory,
  deleteExpense,
  listExpenseCategories,
  listExpenses,
} from "../features/billing/billing-api";
import { formatDate, formatInr } from "../features/billing/components";
import { Alert } from "../components/ui/alert";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Icon } from "../components/ui/icons";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { PageHeader } from "../components/ui/page-header";
import { Select } from "../components/ui/select";
import { Spinner } from "../components/ui/spinner";

export function AdminExpensesPage() {
  const queryClient = useQueryClient();

  const categories = useQuery({
    queryKey: ["billing", "expense-categories"],
    queryFn: () => listExpenseCategories(),
  });
  const expenses = useQuery({
    queryKey: ["billing", "expenses"],
    queryFn: () => listExpenses({ limit: 50 }),
  });

  const [categoryName, setCategoryName] = useState("");
  const addCategory = useMutation({
    mutationFn: () => createExpenseCategory({ name: categoryName.trim() }),
    onSuccess: () => {
      setCategoryName("");
      void queryClient.invalidateQueries({ queryKey: ["billing", "expense-categories"] });
    },
  });

  const [form, setForm] = useState({
    title: "",
    amountInr: "",
    categoryId: "",
    vendor: "",
    note: "",
    spentAt: "",
  });
  const addExpense = useMutation({
    mutationFn: () =>
      createExpense({
        title: form.title.trim(),
        amountInr: Number(form.amountInr),
        categoryId: form.categoryId || undefined,
        vendor: form.vendor.trim() || undefined,
        note: form.note.trim() || undefined,
        spentAt: form.spentAt ? new Date(form.spentAt).toISOString() : undefined,
      }),
    onSuccess: () => {
      setForm({ title: "", amountInr: "", categoryId: "", vendor: "", note: "", spentAt: "" });
      void queryClient.invalidateQueries({ queryKey: ["billing"] });
    },
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteExpense(id),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["billing"] }),
  });

  const rows = expenses.data?.data ?? [];
  const total = rows.reduce((sum, expense) => sum + expense.amountInr, 0);

  return (
    <div className="space-y-6">
      <PageHeader title="Expenses" subtitle="Track community spending by category." />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Add expense</CardTitle>
          </CardHeader>
          <CardContent>
            <form
              className="grid gap-4 sm:grid-cols-2"
              onSubmit={(event) => {
                event.preventDefault();
                addExpense.mutate();
              }}
            >
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  required
                  minLength={2}
                  value={form.title}
                  onChange={(event) => setForm({ ...form, title: event.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="amount">Amount (₹)</Label>
                <Input
                  id="amount"
                  type="number"
                  min={1}
                  required
                  value={form.amountInr}
                  onChange={(event) => setForm({ ...form, amountInr: event.target.value })}
                />
              </div>
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
                <Label htmlFor="vendor">Vendor</Label>
                <Input
                  id="vendor"
                  value={form.vendor}
                  onChange={(event) => setForm({ ...form, vendor: event.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="spentAt">Date</Label>
                <Input
                  id="spentAt"
                  type="date"
                  value={form.spentAt}
                  onChange={(event) => setForm({ ...form, spentAt: event.target.value })}
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="note">Note</Label>
                <Input
                  id="note"
                  value={form.note}
                  onChange={(event) => setForm({ ...form, note: event.target.value })}
                />
              </div>
              {addExpense.isError && (
                <Alert variant="destructive" className="sm:col-span-2">
                  {(addExpense.error as Error).message || "Could not add the expense."}
                </Alert>
              )}
              <div className="sm:col-span-2">
                <Button type="submit" loading={addExpense.isPending}>
                  Add expense
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Categories</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <form
              className="flex items-end gap-2"
              onSubmit={(event) => {
                event.preventDefault();
                addCategory.mutate();
              }}
            >
              <div className="flex-1 space-y-1.5">
                <Label htmlFor="categoryName">New category</Label>
                <Input
                  id="categoryName"
                  required
                  value={categoryName}
                  onChange={(event) => setCategoryName(event.target.value)}
                />
              </div>
              <Button type="submit" size="sm" loading={addCategory.isPending}>
                Add
              </Button>
            </form>
            {addCategory.isError && (
              <Alert variant="destructive">{(addCategory.error as Error).message}</Alert>
            )}
            <div className="flex flex-wrap gap-2">
              {categories.data?.map((category) => (
                <span
                  key={category.id}
                  className="rounded-full bg-[var(--color-muted)] px-3 py-1 text-xs font-medium"
                >
                  {category.name}
                </span>
              ))}
              {categories.data?.length === 0 && (
                <p className="text-sm text-[var(--color-muted-foreground)]">No categories yet.</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>Expenses</CardTitle>
          <span className="text-sm text-[var(--color-muted-foreground)]">Total {formatInr(total)}</span>
        </CardHeader>
        <CardContent>
          {expenses.isLoading ? (
            <div className="flex justify-center py-8">
              <Spinner className="h-5 w-5" />
            </div>
          ) : rows.length === 0 ? (
            <Alert>No expenses recorded yet.</Alert>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-xs uppercase text-[var(--color-muted-foreground)]">
                  <tr>
                    <th className="py-2">Title</th>
                    <th className="py-2">Category</th>
                    <th className="py-2">Vendor</th>
                    <th className="py-2">Amount</th>
                    <th className="py-2">Date</th>
                    <th className="py-2" />
                  </tr>
                </thead>
                <tbody>
                  {rows.map((expense) => (
                    <tr key={expense.id} className="border-t border-[var(--color-border)]">
                      <td className="py-2 font-medium">{expense.title}</td>
                      <td className="py-2">{expense.category?.name ?? "—"}</td>
                      <td className="py-2">{expense.vendor ?? "—"}</td>
                      <td className="py-2">{formatInr(expense.amountInr)}</td>
                      <td className="py-2">{formatDate(expense.spentAt)}</td>
                      <td className="py-2 text-right">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => remove.mutate(expense.id)}
                          disabled={remove.isPending}
                        >
                          <Icon name="trash" className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
