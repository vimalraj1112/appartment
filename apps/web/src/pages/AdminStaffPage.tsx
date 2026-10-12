import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  DomesticWorkType,
  StaffAvailability,
  VisitorEntryDirection,
} from "@superlink/shared";
import {
  createDomesticStaff,
  createStaffEntry,
  createStaffProfile,
  listDomesticStaff,
  listStaffEntries,
  listStaffProfiles,
  listStaffUsers,
  updateDomesticStaff,
  updateStaffProfile,
} from "../features/staff/staff-api";
import { listGateFlats } from "../features/visitors/visitor-api";
import { formatDateTime } from "../features/complaints/components";
import { Alert } from "../components/ui/alert";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { PageHeader } from "../components/ui/page-header";
import { Select } from "../components/ui/select";

const AVAILABILITIES: StaffAvailability[] = ["AVAILABLE", "BUSY", "OFF"];
const DIRECTIONS: VisitorEntryDirection[] = ["IN", "OUT"];
const WORK_TYPES: DomesticWorkType[] = ["MAID", "COOK", "DRIVER", "NANNY", "GARDENER", "OTHER"];

export function AdminStaffPage() {
  const queryClient = useQueryClient();
  const [profile, setProfile] = useState({ userId: "", trade: "", availability: "AVAILABLE" as StaffAvailability, phone: "" });
  const [entry, setEntry] = useState({ staffUserId: "", direction: "IN" as VisitorEntryDirection });
  const [domestic, setDomestic] = useState({ flatId: "", name: "", workType: "MAID" as DomesticWorkType, phone: "" });

  const users = useQuery({ queryKey: ["staff", "users"], queryFn: listStaffUsers });
  const profiles = useQuery({ queryKey: ["staff", "profiles"], queryFn: () => listStaffProfiles({ limit: 100 }) });
  const entries = useQuery({ queryKey: ["staff", "entries"], queryFn: () => listStaffEntries({ limit: 30 }) });
  const domesticStaff = useQuery({ queryKey: ["staff", "domestic"], queryFn: () => listDomesticStaff({ limit: 50 }) });
  const flats = useQuery({ queryKey: ["visitors", "gate-flats"], queryFn: listGateFlats });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["staff"] });

  const addProfile = useMutation({
    mutationFn: () =>
      createStaffProfile({
        userId: profile.userId,
        trade: profile.trade.trim(),
        availability: profile.availability,
        phone: profile.phone.trim() || undefined,
      }),
    onSuccess: () => {
      setProfile({ userId: "", trade: "", availability: "AVAILABLE", phone: "" });
      void invalidate();
    },
  });
  const setAvailability = useMutation({
    mutationFn: ({ id, availability }: { id: string; availability: StaffAvailability }) =>
      updateStaffProfile(id, { availability }),
    onSuccess: invalidate,
  });
  const logEntry = useMutation({
    mutationFn: () => createStaffEntry({ staffUserId: entry.staffUserId, direction: entry.direction }),
    onSuccess: () => {
      setEntry({ staffUserId: "", direction: "IN" });
      void invalidate();
    },
  });
  const addDomestic = useMutation({
    mutationFn: () =>
      createDomesticStaff({
        flatId: domestic.flatId,
        name: domestic.name.trim(),
        workType: domestic.workType,
        phone: domestic.phone.trim() || undefined,
      }),
    onSuccess: () => {
      setDomestic({ flatId: "", name: "", workType: "MAID", phone: "" });
      void invalidate();
    },
  });
  const toggleDomestic = useMutation({
    mutationFn: ({ id, status }: { id: string; status: "ACTIVE" | "INACTIVE" }) =>
      updateDomesticStaff(id, { status }),
    onSuccess: invalidate,
  });

  const staffUserOptions = users.data ?? [];

  return (
    <div className="space-y-6">
      <PageHeader title="Staff" subtitle="Community staff, gate entries and domestic help." />

      <Card>
        <CardHeader>
          <CardTitle>Staff profiles</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <form
            className="grid gap-3 sm:grid-cols-5"
            onSubmit={(event) => {
              event.preventDefault();
              if (profile.userId && profile.trade.trim()) addProfile.mutate();
            }}
          >
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Staff member</Label>
              <Select
                required
                value={profile.userId}
                onChange={(event) => setProfile({ ...profile, userId: event.target.value })}
              >
                <option value="">Select staff</option>
                {staffUserOptions.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.firstName} {user.lastName} ({user.email})
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Trade</Label>
              <Input
                required
                placeholder="Electrician"
                value={profile.trade}
                onChange={(event) => setProfile({ ...profile, trade: event.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Availability</Label>
              <Select
                value={profile.availability}
                onChange={(event) =>
                  setProfile({ ...profile, availability: event.target.value as StaffAvailability })
                }
              >
                {AVAILABILITIES.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </Select>
            </div>
            <div className="flex items-end">
              <Button type="submit" loading={addProfile.isPending}>
                Add profile
              </Button>
            </div>
          </form>

          {profile.userId === "" && staffUserOptions.length === 0 && (
            <Alert>Invite staff members from the Residents page before creating profiles.</Alert>
          )}

          {profiles.data && profiles.data.data.length > 0 ? (
            <ul className="divide-y divide-[var(--color-border)]">
              {profiles.data.data.map((item) => (
                <li key={item.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <div>
                    <p className="font-medium">
                      {item.user.firstName} {item.user.lastName}
                    </p>
                    <p className="text-xs text-[var(--color-muted-foreground)]">
                      {item.trade} · {item.user.email}
                        {item.phone ? ` · ${item.phone}` : ""}
                    </p>
                  </div>
                  <Select
                    value={item.availability}
                    className="h-8 max-w-[10rem]"
                    onChange={(event) =>
                      setAvailability.mutate({
                        id: item.id,
                        availability: event.target.value as StaffAvailability,
                      })
                    }
                  >
                    {AVAILABILITIES.map((value) => (
                      <option key={value} value={value}>
                        {value}
                      </option>
                    ))}
                  </Select>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-[var(--color-muted-foreground)]">No staff profiles yet.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Gate entries</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <form
            className="grid gap-3 sm:grid-cols-4"
            onSubmit={(event) => {
              event.preventDefault();
              if (entry.staffUserId) logEntry.mutate();
            }}
          >
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Staff member</Label>
              <Select
                required
                value={entry.staffUserId}
                onChange={(event) => setEntry({ ...entry, staffUserId: event.target.value })}
              >
                <option value="">Select staff</option>
                {staffUserOptions.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.firstName} {user.lastName}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Direction</Label>
              <Select
                value={entry.direction}
                onChange={(event) =>
                  setEntry({ ...entry, direction: event.target.value as VisitorEntryDirection })
                }
              >
                {DIRECTIONS.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </Select>
            </div>
            <div className="flex items-end">
              <Button type="submit" loading={logEntry.isPending}>
                Log entry
              </Button>
            </div>
          </form>

          {entries.data && entries.data.data.length > 0 ? (
            <ul className="divide-y divide-[var(--color-border)]">
              {entries.data.data.map((item) => (
                <li key={item.id} className="flex items-center justify-between py-2 text-sm">
                  <span>
                    {item.staff.firstName} {item.staff.lastName}
                  </span>
                  <div className="flex items-center gap-2">
                    <Badge variant={item.direction === "IN" ? "success" : "muted"}>{item.direction}</Badge>
                    <span className="text-xs text-[var(--color-muted-foreground)]">
                      {formatDateTime(item.createdAt)}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-[var(--color-muted-foreground)]">No gate entries yet.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Domestic staff</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <form
            className="grid gap-3 sm:grid-cols-5"
            onSubmit={(event) => {
              event.preventDefault();
              if (domestic.flatId && domestic.name.trim()) addDomestic.mutate();
            }}
          >
            <div className="space-y-1.5">
              <Label>Flat</Label>
              <Select
                required
                value={domestic.flatId}
                onChange={(event) => setDomestic({ ...domestic, flatId: event.target.value })}
              >
                <option value="">Select flat</option>
                {flats.data?.map((flat) => (
                  <option key={flat.id} value={flat.id}>
                    {flat.code}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Name</Label>
              <Input
                required
                value={domestic.name}
                onChange={(event) => setDomestic({ ...domestic, name: event.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Work</Label>
              <Select
                value={domestic.workType}
                onChange={(event) =>
                  setDomestic({ ...domestic, workType: event.target.value as DomesticWorkType })
                }
              >
                {WORK_TYPES.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Phone</Label>
              <Input
                value={domestic.phone}
                onChange={(event) => setDomestic({ ...domestic, phone: event.target.value })}
              />
            </div>
            <div className="flex items-end">
              <Button type="submit" loading={addDomestic.isPending}>
                Register
              </Button>
            </div>
          </form>

          {domesticStaff.data && domesticStaff.data.data.length > 0 ? (
            <ul className="divide-y divide-[var(--color-border)]">
              {domesticStaff.data.data.map((item) => (
                <li key={item.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <div>
                    <p className="font-medium">
                      {item.name} · {item.workType}
                    </p>
                    <p className="text-xs text-[var(--color-muted-foreground)]">
                      Flat {item.flat?.code ?? "—"}
                      {item.phone ? ` · ${item.phone}` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={item.status === "ACTIVE" ? "success" : "muted"}>{item.status}</Badge>
                    <Button
                      size="sm"
                      variant="outline"
                      loading={toggleDomestic.isPending}
                      onClick={() =>
                        toggleDomestic.mutate({
                          id: item.id,
                          status: item.status === "ACTIVE" ? "INACTIVE" : "ACTIVE",
                        })
                      }
                    >
                      {item.status === "ACTIVE" ? "Disable" : "Enable"}
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-[var(--color-muted-foreground)]">No domestic staff registered.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
