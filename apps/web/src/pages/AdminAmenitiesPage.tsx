import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  cancelBooking,
  createAmenity,
  listAmenities,
  listBookings,
  updateAmenity,
} from "../features/amenities/amenities-api";
import { BookingStatusBadge, formatDate, formatInr, formatTime } from "../features/amenities/components";
import { Alert } from "../components/ui/alert";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { PageHeader } from "../components/ui/page-header";
import { Spinner } from "../components/ui/spinner";

const EMPTY = {
  name: "",
  capacity: 1,
  slotMinutes: 60,
  openTime: "06:00",
  closeTime: "22:00",
  feeInr: 0,
};

export function AdminAmenitiesPage() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState(EMPTY);

  const amenities = useQuery({
    queryKey: ["amenities", "all"],
    queryFn: () => listAmenities(),
  });
  const bookings = useQuery({
    queryKey: ["bookings", "admin"],
    queryFn: () => listBookings({ limit: 50 }),
  });

  const create = useMutation({
    mutationFn: () => createAmenity(form),
    onSuccess: () => {
      setForm(EMPTY);
      queryClient.invalidateQueries({ queryKey: ["amenities"] });
    },
  });
  const toggle = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) => updateAmenity(id, { isActive }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["amenities"] }),
  });
  const cancel = useMutation({
    mutationFn: (id: string) => cancelBooking(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["bookings"] }),
  });

  return (
    <div className="space-y-6">
      <PageHeader title="Amenities" subtitle="Configure community facilities and manage bookings." />

      <Card>
        <CardHeader>
          <CardTitle>Add an amenity</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              create.mutate();
            }}
          >
            {create.isError && <Alert variant="destructive">{create.error.message}</Alert>}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div className="space-y-1.5">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  required
                  value={form.name}
                  onChange={(event) => setForm({ ...form, name: event.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="capacity">Capacity per slot</Label>
                <Input
                  id="capacity"
                  type="number"
                  min={1}
                  value={form.capacity}
                  onChange={(event) => setForm({ ...form, capacity: Number(event.target.value) })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="slotMinutes">Slot length (min)</Label>
                <Input
                  id="slotMinutes"
                  type="number"
                  min={15}
                  step={15}
                  value={form.slotMinutes}
                  onChange={(event) => setForm({ ...form, slotMinutes: Number(event.target.value) })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="openTime">Opens</Label>
                <Input
                  id="openTime"
                  type="time"
                  value={form.openTime}
                  onChange={(event) => setForm({ ...form, openTime: event.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="closeTime">Closes</Label>
                <Input
                  id="closeTime"
                  type="time"
                  value={form.closeTime}
                  onChange={(event) => setForm({ ...form, closeTime: event.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="feeInr">Fee (INR)</Label>
                <Input
                  id="feeInr"
                  type="number"
                  min={0}
                  value={form.feeInr}
                  onChange={(event) => setForm({ ...form, feeInr: Number(event.target.value) })}
                />
              </div>
            </div>
            <Button type="submit" loading={create.isPending}>
              Add amenity
            </Button>
          </form>
        </CardContent>
      </Card>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold">Facilities</h2>
        {amenities.isLoading ? (
          <div className="flex justify-center py-12">
            <Spinner className="h-6 w-6" />
          </div>
        ) : (amenities.data?.data.length ?? 0) === 0 ? (
          <Alert>No amenities configured yet.</Alert>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {(amenities.data?.data ?? []).map((amenity) => (
              <Card key={amenity.id}>
                <CardContent className="space-y-3 p-5">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-medium">{amenity.name}</p>
                      <p className="text-xs text-[var(--color-muted-foreground)]">
                        {amenity.openTime}–{amenity.closeTime} · {amenity.slotMinutes} min · cap {amenity.capacity} ·{" "}
                        {formatInr(amenity.feeInr)}
                      </p>
                    </div>
                    <Badge variant={amenity.isActive ? "success" : "muted"}>
                      {amenity.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    loading={toggle.isPending}
                    onClick={() => toggle.mutate({ id: amenity.id, isActive: !amenity.isActive })}
                  >
                    {amenity.isActive ? "Disable" : "Enable"}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      <CardsBookingsSection
        bookings={bookings.data?.data ?? []}
        isLoading={bookings.isLoading}
        onCancel={(id) => cancel.mutate(id)}
        cancelling={cancel.isPending}
      />
    </div>
  );
}

function CardsBookingsSection({
  bookings,
  isLoading,
  onCancel,
  cancelling,
}: {
  bookings: Array<{
    id: string;
    date: string;
    slotStart: string;
    status: "BOOKED" | "WAITLISTED" | "CANCELLED";
    amenity: { name: string };
    flat: { code: string };
    user: { firstName: string; lastName: string };
  }>;
  isLoading: boolean;
  onCancel: (id: string) => void;
  cancelling: boolean;
}) {
  return (
    <section className="space-y-3">
      <h2 className="text-sm font-semibold">Bookings</h2>
      {isLoading ? (
        <div className="flex justify-center py-12">
          <Spinner className="h-6 w-6" />
        </div>
      ) : bookings.length === 0 ? (
        <Alert>No bookings yet.</Alert>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {bookings.map((booking) => (
            <Card key={booking.id}>
              <CardContent className="flex items-center justify-between gap-3 p-5">
                <div className="space-y-1">
                  <p className="font-medium">{booking.amenity.name}</p>
                  <p className="text-xs text-[var(--color-muted-foreground)]">
                    Flat {booking.flat.code} · {formatDate(booking.date)} · {formatTime(booking.slotStart)}
                  </p>
                  <p className="text-xs text-[var(--color-muted-foreground)]">
                    {booking.user.firstName} {booking.user.lastName}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <BookingStatusBadge status={booking.status} />
                  {booking.status !== "CANCELLED" && (
                    <Button size="sm" variant="outline" loading={cancelling} onClick={() => onCancel(booking.id)}>
                      Cancel
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </section>
  );
}
