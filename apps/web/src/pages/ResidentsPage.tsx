import { useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { OccupantRelation, UserStatus } from "@superlink/shared";
import {
  createInvitation,
  createResident,
  listInvitations,
  listResidents,
  revokeInvitation,
  type Resident,
} from "../features/residents/resident-api";
import { listFlats } from "../features/structure/structure-api";
import { ApiError } from "../lib/api";
import { Alert } from "../components/ui/alert";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Icon } from "../components/ui/icons";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { PageHeader } from "../components/ui/page-header";
import { Select } from "../components/ui/select";
import { Spinner } from "../components/ui/spinner";

const STATUS_VARIANT: Record<UserStatus, "success" | "warning" | "muted"> = {
  ACTIVE: "success",
  INVITED: "warning",
  DISABLED: "muted",
};

function errorText(error: unknown, fallback: string): string {
  return error instanceof ApiError ? error.message : fallback;
}

export function ResidentsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [flatId, setFlatId] = useState("");
  const [relation, setRelation] = useState<OccupantRelation>("OWNER");

  const residentsQuery = useQuery({
    queryKey: ["residents", search],
    queryFn: () => listResidents({ q: search || undefined, limit: 100 }),
  });
  const flatsQuery = useQuery({ queryKey: ["flats-for-select"], queryFn: () => listFlats({ limit: 100 }) });
  const invitationsQuery = useQuery({ queryKey: ["invitations"], queryFn: listInvitations });

  const createMutation = useMutation({
    mutationFn: () =>
      createResident({
        email: email.trim(),
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phone: phone.trim() || undefined,
        flatId: flatId || undefined,
        relation: flatId ? relation : undefined,
      }),
    onSuccess: () => {
      setEmail("");
      setFirstName("");
      setLastName("");
      setPhone("");
      setFlatId("");
      queryClient.invalidateQueries({ queryKey: ["residents"] });
    },
  });

  const inviteMutation = useMutation({
    mutationFn: (resident: Resident) =>
      createInvitation({
        email: resident.email,
        role: "RESIDENT",
        flatId: resident.flatOccupancies[0]?.flat.id,
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["invitations"] }),
  });

  const revokeMutation = useMutation({
    mutationFn: (id: string) => revokeInvitation(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["invitations"] }),
  });

  const onCreate = (event: FormEvent) => {
    event.preventDefault();
    if (!email.trim() || !firstName.trim() || !lastName.trim()) return;
    createMutation.mutate();
  };

  const residents = residentsQuery.data?.data ?? [];
  const flats = flatsQuery.data?.data ?? [];
  const invitations = invitationsQuery.data ?? [];

  return (
    <div className="space-y-6">
      <PageHeader title="Residents" subtitle="Add residents, assign flats and send invitations." />

      <Card>
        <CardHeader>
          <CardTitle>Add a resident</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3" onSubmit={onCreate}>
            <div className="space-y-2">
              <Label htmlFor="r-first">First name</Label>
              <Input id="r-first" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="r-last">Last name</Label>
              <Input id="r-last" value={lastName} onChange={(e) => setLastName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="r-email">Email</Label>
              <Input id="r-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="r-phone">Phone</Label>
              <Input id="r-phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="r-flat">Flat</Label>
              <Select id="r-flat" value={flatId} onChange={(e) => setFlatId(e.target.value)}>
                <option value="">Unassigned</option>
                {flats.map((flat) => (
                  <option key={flat.id} value={flat.id}>
                    {flat.code}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="r-relation">Relation</Label>
              <Select
                id="r-relation"
                value={relation}
                onChange={(e) => setRelation(e.target.value as OccupantRelation)}
                disabled={!flatId}
              >
                <option value="OWNER">Owner</option>
                <option value="TENANT">Tenant</option>
              </Select>
            </div>
            <div className="sm:col-span-2 lg:col-span-3">
              <Button type="submit" loading={createMutation.isPending}>
                <Icon name="plus" className="h-4 w-4" />
                Add resident
              </Button>
            </div>
          </form>
          {createMutation.error && (
            <Alert variant="destructive" className="mt-3">
              {errorText(createMutation.error, "Could not add resident.")}
            </Alert>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle>Resident directory</CardTitle>
          <div className="relative w-64">
            <Icon
              name="search"
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-muted-foreground)]"
            />
            <Input
              className="pl-9"
              placeholder="Search residents"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {residentsQuery.isLoading && <Spinner />}
          {residents.length === 0 && !residentsQuery.isLoading && (
            <p className="text-sm text-[var(--color-muted-foreground)]">No residents found.</p>
          )}
          {residents.map((resident) => {
            const primary = resident.flatOccupancies[0];
            return (
              <div
                key={resident.id}
                className="flex flex-wrap items-center gap-3 rounded-md border border-[var(--color-border)] p-3"
              >
                <div className="min-w-[10rem] flex-1">
                  <p className="font-medium">
                    {resident.firstName} {resident.lastName}
                  </p>
                  <p className="flex items-center gap-1 text-xs text-[var(--color-muted-foreground)]">
                    <Icon name="mail" className="h-3.5 w-3.5" />
                    {resident.email}
                  </p>
                </div>
                <div className="text-sm text-[var(--color-muted-foreground)]">
                  {primary ? (
                    <span>
                      {primary.flat.code} · {primary.relation.toLowerCase()}
                    </span>
                  ) : (
                    <span>Unassigned</span>
                  )}
                </div>
                <Badge variant={STATUS_VARIANT[resident.status]}>{resident.status.toLowerCase()}</Badge>
                <Button
                  variant="outline"
                  size="sm"
                  loading={inviteMutation.isPending}
                  onClick={() => inviteMutation.mutate(resident)}
                >
                  Send invite
                </Button>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Invitations</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {invitations.length === 0 && (
            <p className="text-sm text-[var(--color-muted-foreground)]">No invitations yet.</p>
          )}
          {invitations.map((invitation) => {
            const expired = !invitation.acceptedAt && new Date(invitation.expiresAt) < new Date();
            return (
              <div
                key={invitation.id}
                className="flex flex-wrap items-center gap-3 rounded-md border border-[var(--color-border)] p-3 text-sm"
              >
                <span className="min-w-[10rem] flex-1 font-medium">{invitation.email ?? invitation.phone}</span>
                <span className="text-xs text-[var(--color-muted-foreground)]">
                  {invitation.role.toLowerCase().replace(/_/g, " ")}
                </span>
                {invitation.acceptedAt ? (
                  <Badge variant="success">Accepted</Badge>
                ) : expired ? (
                  <Badge variant="destructive">Expired</Badge>
                ) : (
                  <Badge variant="warning">Pending</Badge>
                )}
                {!invitation.acceptedAt && (
                  <Button
                    variant="ghost"
                    size="sm"
                    loading={revokeMutation.isPending}
                    onClick={() => revokeMutation.mutate(invitation.id)}
                  >
                    Revoke
                  </Button>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
