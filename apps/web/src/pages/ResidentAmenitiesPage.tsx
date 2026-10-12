import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  cancelBooking,
  createBooking,
  getAvailability,
  listAmenities,
  listBookings,
} from "../features/amenities/amenities-api";
import {
  BookingStatusBadge,
  formatDate,
  formatInr,
  formatTime,
  formatTimeRange,
  todayIso,
} from "../features/amenities/components";
import { Alert } from "../components/ui/alert";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { PageHeader } from "../components/ui/page-header";
import { Spinner } from "../components/ui/spinner";

export function ResidentAmenitiesPage() {
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [date, setDate] = useState(todayIso());

  const amenities = useQuery({
    queryKey: ["amenities", "active"],
    queryFn: () => listAmenities({ activeOnly: true }),
  });

  const list = amenities.data?.data ?? [];
  const activeId = selectedId ?? list[0]?.id ?? null;

  const availability = useQuery({
    queryKey: ["amenities", "availability", activeId, date],
    queryFn: () => getAvailability(activeId as string, date),
    enabled: Boolean(activeId),
  });

  const bookings = useQuery({
    queryKey: ["bookings", "mine"],
    queryFn: () => listBookings({ mine: true }),
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["amenities", "availability"] });
    queryClient.invalidateQueries({ queryKey: ["bookings"] });
  };

  const book = useMutation({
    mutationFn: (slotStart: string) =>
      createBooking({ amenityId: activeId as string, date, slotStart }),
    onSuccess: invalidate,
  });
  const cancel = useMutation({ mutationFn: (id: string) => cancelBooking(id), onSuccess: invalidate });

  const mySlots = new Map(
    (availability.data?.myBookings ?? []).map((booking) => [booking.slotStart, booking.status]),
  );
  const myBookings = bookings.data?.data ?? [];

  return (
    <div className="space-y-6">
      <PageHeader title="Amenities" subtitle="Book community facilities and manage your reservations." />

      {amenities.isLoading ? (
        <div className="flex justify-center py-12">
          <Spinner className="h-6 w-6" />
        </div>
      ) : list.length === 0 ? (
        <Alert>No amenities are available for booking right now.</Alert>
      ) : (
        <div className="flex flex-wrap gap-2">
          {list.map((amenity) => (
            <button
              key={amenity.id}
              type="button"
              onClick={() => setSelectedId(amenity.id)}
              className={
                "rounded-md border px-4 py-2 text-sm transition-colors " +
                (activeId === amenity.id
                  ? "border-[var(--color-primary)] bg-[var(--color-primary)]/10 font-medium"
                  : "border-[var(--color-border)] hover:bg-[var(--color-muted)]/50")
              }
            >
              {amenity.name}
            </button>
          ))}
        </div>
      )}

      {selectedId && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0">
            <CardTitle>{availability.data?.amenity.name ?? "Availability"}</CardTitle>
            <div className="w-40 space-y-1">
              <Label htmlFor="date">Date</Label>
              <Input id="date" type="date" value={date} onChange={(event) => setDate(event.target.value)} />
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {availability.data && (
              <p className="text-xs text-[var(--color-muted-foreground)]">
                {availability.data.amenity.openTime}–{availability.data.amenity.closeTime} ·{" "}
                {availability.data.slotMinutes} min slots · capacity {availability.data.capacity} ·{" "}
                {formatInr(availability.data.amenity.feeInr)}
              </p>
            )}

            {book.isError && <Alert variant="destructive">{book.error.message}</Alert>}

            {availability.isLoading ? (
              <div className="flex justify-center py-8">
                <Spinner className="h-5 w-5" />
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {(availability.data?.slots ?? []).map((slot) => {
                  const mine = mySlots.get(slot.slotStart);
                  const full = slot.available <= 0;
                  return (
                    <button
                      key={slot.slotStart}
                      type="button"
                      disabled={Boolean(mine) || book.isPending}
                      onClick={() => book.mutate(slot.slotStart)}
                      className={
                        "rounded-md border px-3 py-2 text-left text-xs transition-colors disabled:cursor-not-allowed " +
                        (mine
                          ? "border-[var(--color-success)]/40 bg-[var(--color-success)]/10"
                          : full
                            ? "border-[var(--color-warning)]/40 hover:bg-[var(--color-warning)]/10"
                            : "border-[var(--color-border)] hover:bg-[var(--color-muted)]/50")
                      }
                    >
                      <span className="block font-medium">{formatTime(slot.slotStart)}</span>
                      <span className="text-[var(--color-muted-foreground)]">
                        {mine ?? (full ? "Waitlist" : `${slot.available} left`)}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <section className="space-y-3">
        <h2 className="text-sm font-semibold">My bookings</h2>
        {myBookings.length === 0 ? (
          <Alert>You have no bookings yet.</Alert>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {myBookings.map((booking) => (
              <Card key={booking.id}>
                <CardContent className="flex items-center justify-between gap-3 p-5">
                  <div className="space-y-1">
                    <p className="font-medium">{booking.amenity.name}</p>
                    <p className="text-xs text-[var(--color-muted-foreground)]">
                      {formatDate(booking.date)} · {formatTimeRange(booking.slotStart, booking.slotEnd)} · Flat{" "}
                      {booking.flat.code}
                    </p>
                    {booking.waitlistPosition && (
                      <p className="text-xs text-[var(--color-warning)]">
                        Waitlist #{booking.waitlistPosition}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <BookingStatusBadge status={booking.status} />
                    {booking.status !== "CANCELLED" && (
                      <Button
                        size="sm"
                        variant="outline"
                        loading={cancel.isPending}
                        onClick={() => cancel.mutate(booking.id)}
                      >
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
    </div>
  );
}
