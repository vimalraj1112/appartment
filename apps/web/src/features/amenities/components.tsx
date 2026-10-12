import type { BookingStatus, ParkingSlotStatus, VehicleType } from "@superlink/shared";
import { Badge } from "../../components/ui/badge";

type Variant = "default" | "success" | "warning" | "destructive" | "muted";

const BOOKING_VARIANT: Record<BookingStatus, Variant> = {
  BOOKED: "success",
  WAITLISTED: "warning",
  CANCELLED: "muted",
};

const SLOT_VARIANT: Record<ParkingSlotStatus, Variant> = {
  AVAILABLE: "success",
  OCCUPIED: "default",
  RESERVED: "warning",
  MAINTENANCE: "destructive",
};

const VEHICLE_LABEL: Record<VehicleType, string> = {
  CAR: "Car",
  BIKE: "Bike",
  EV: "EV",
  BICYCLE: "Bicycle",
};

export function BookingStatusBadge({ status }: { status: BookingStatus }) {
  return <Badge variant={BOOKING_VARIANT[status]}>{status}</Badge>;
}

export function ParkingSlotStatusBadge({ status }: { status: ParkingSlotStatus }) {
  return <Badge variant={SLOT_VARIANT[status]}>{status}</Badge>;
}

export function vehicleTypeLabel(type: VehicleType): string {
  return VEHICLE_LABEL[type];
}

export function formatInr(value: number | null | undefined): string {
  if (value === null || value === undefined) return "—";
  if (value === 0) return "Free";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-IN", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function formatTime(value: string | null | undefined): string {
  if (!value) return "—";
  return new Date(value).toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

export function formatTimeRange(start: string, end: string): string {
  return `${formatTime(start)} – ${formatTime(end)}`;
}

export function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}
