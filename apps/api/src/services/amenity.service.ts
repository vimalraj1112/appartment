import type { Prisma } from "@prisma/client";
import { prisma } from "../config/prisma.js";
import { AppError } from "../errors/AppError.js";
import type { AuthContext } from "../tenant/context.js";
import { paginate, paginationMeta } from "../utils/pagination.js";
import { authContextOrThrow } from "../middleware/rbac.js";
import { writeAudit } from "./audit.service.js";
import { createNotification } from "./notification.service.js";

const BOOKING_INCLUDE = {
  amenity: { select: { id: true, name: true, icon: true, slotMinutes: true, feeInr: true } },
  flat: { select: { id: true, code: true } },
  user: { select: { id: true, firstName: true, lastName: true } },
} as const;

function isAdmin(auth: AuthContext): boolean {
  return auth.role === "SUPER_ADMIN" || auth.role === "COMMUNITY_ADMIN";
}

async function myFlatIds(userId: string): Promise<string[]> {
  const occupancies = await prisma.flatOccupant.findMany({
    where: { userId, movedOutAt: null },
    select: { flatId: true },
  });
  return occupancies.map((occupancy) => occupancy.flatId);
}

function toDateOnly(date: string): Date {
  return new Date(`${date}T00:00:00.000Z`);
}

function minutesOf(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return (hours ?? 0) * 60 + (minutes ?? 0);
}

function slotStartFor(date: string, minutes: number): Date {
  const start = toDateOnly(date);
  return new Date(start.getTime() + minutes * 60_000);
}

async function notifyFlatOccupants(flatId: string, title: string, body: string, data: Record<string, unknown>) {
  const occupants = await prisma.flatOccupant.findMany({
    where: { flatId, movedOutAt: null },
    select: { userId: true },
  });
  await Promise.all(
    occupants.map((occupant) =>
      createNotification({ userId: occupant.userId, type: "GENERAL", title, body, data }),
    ),
  );
}

// ---------- Amenities ----------

export async function listAmenities(query: { activeOnly?: boolean; q?: string; page: number; limit: number }) {
  const auth = authContextOrThrow();
  const { skip, take } = paginate(query.page, query.limit);
  const where: Prisma.AmenityWhereInput = {};
  if (!isAdmin(auth) || query.activeOnly) where.isActive = true;
  if (query.q) where.name = { contains: query.q, mode: "insensitive" };

  const [total, items] = await Promise.all([
    prisma.amenity.count({ where }),
    prisma.amenity.findMany({ where, skip, take, orderBy: { name: "asc" } }),
  ]);
  return { items, meta: paginationMeta(query.page, query.limit, total) };
}

export async function getAmenity(id: string) {
  const amenity = await prisma.amenity.findFirst({ where: { id } });
  if (!amenity) throw AppError.notFound("We could not find that amenity.");
  return amenity;
}

export async function createAmenity(input: {
  name: string;
  icon?: string;
  description?: string;
  slotMinutes: number;
  capacity: number;
  openTime: string;
  closeTime: string;
  feeInr: number;
  rules?: string;
  isActive: boolean;
}) {
  if (minutesOf(input.closeTime) <= minutesOf(input.openTime)) {
    throw AppError.validation("Closing time must be after opening time.");
  }
  const amenity = await prisma.amenity.create({ data: { communityId: "", ...input } });
  await writeAudit({ action: "AMENITY.CREATE", resource: "Amenity", resourceId: amenity.id });
  return amenity;
}

export async function updateAmenity(
  id: string,
  input: Partial<{
    name: string;
    icon: string | null;
    description: string | null;
    slotMinutes: number;
    capacity: number;
    openTime: string;
    closeTime: string;
    feeInr: number;
    rules: string | null;
    isActive: boolean;
  }>,
) {
  const existing = await prisma.amenity.findFirst({ where: { id } });
  if (!existing) throw AppError.notFound("We could not find that amenity.");
  const openTime = input.openTime ?? existing.openTime;
  const closeTime = input.closeTime ?? existing.closeTime;
  if (minutesOf(closeTime) <= minutesOf(openTime)) {
    throw AppError.validation("Closing time must be after opening time.");
  }
  const amenity = await prisma.amenity.update({ where: { id }, data: input });
  await writeAudit({ action: "AMENITY.UPDATE", resource: "Amenity", resourceId: id });
  return amenity;
}

export async function getAmenityAvailability(amenityId: string, date: string) {
  const auth = authContextOrThrow();
  const amenity = await getAmenity(amenityId);
  const dateValue = toDateOnly(date);

  const openMinutes = minutesOf(amenity.openTime);
  const closeMinutes = minutesOf(amenity.closeTime);
  const slots: Array<{ slotStart: string; slotEnd: string; booked: number; available: number }> = [];
  const starts: Date[] = [];
  for (let m = openMinutes; m + amenity.slotMinutes <= closeMinutes; m += amenity.slotMinutes) {
    starts.push(slotStartFor(date, m));
  }

  const bookings = await prisma.amenityBooking.groupBy({
    by: ["slotStart"],
    where: { amenityId, date: dateValue, status: "BOOKED" },
    _count: { _all: true },
  });
  const counts = new Map(bookings.map((row) => [row.slotStart.getTime(), row._count._all]));

  for (const start of starts) {
    const booked = counts.get(start.getTime()) ?? 0;
    slots.push({
      slotStart: start.toISOString(),
      slotEnd: new Date(start.getTime() + amenity.slotMinutes * 60_000).toISOString(),
      booked,
      available: Math.max(0, amenity.capacity - booked),
    });
  }

  let myBookings: Array<{ id: string; slotStart: Date; status: string }> = [];
  if (!isAdmin(auth)) {
    myBookings = await prisma.amenityBooking.findMany({
      where: {
        amenityId,
        date: dateValue,
        userId: auth.userId,
        status: { in: ["BOOKED", "WAITLISTED"] },
      },
      select: { id: true, slotStart: true, status: true },
    });
  }

  return { amenity, date, slotMinutes: amenity.slotMinutes, capacity: amenity.capacity, slots, myBookings };
}

// ---------- Bookings ----------

export async function createBooking(
  input: {
    amenityId: string;
    date: string;
    slotStart: Date;
    flatId?: string;
    guests: number;
    note?: string;
  },
) {
  const auth = authContextOrThrow();
  const amenity = await getAmenity(input.amenityId);
  if (!amenity.isActive) throw AppError.validation("This amenity is not available for booking.");

  let flatId = input.flatId;
  if (isAdmin(auth)) {
    if (!flatId) throw AppError.validation("Select a flat for this booking.");
  } else {
    const owned = await myFlatIds(auth.userId);
    if (owned.length === 0) throw AppError.validation("You are not an occupant of any flat.");
    if (flatId && !owned.includes(flatId)) throw AppError.forbidden();
    flatId = flatId ?? owned[0];
  }

  const openMinutes = minutesOf(amenity.openTime);
  const closeMinutes = minutesOf(amenity.closeTime);
  const dateValue = toDateOnly(input.date);
  const startMinutes = Math.round((input.slotStart.getTime() - dateValue.getTime()) / 60_000);
  const aligned =
    startMinutes >= openMinutes &&
    startMinutes + amenity.slotMinutes <= closeMinutes &&
    (startMinutes - openMinutes) % amenity.slotMinutes === 0;
  if (!aligned) throw AppError.validation("Choose a valid slot within the amenity's hours.");

  const slotEnd = new Date(input.slotStart.getTime() + amenity.slotMinutes * 60_000);

  const duplicate = await prisma.amenityBooking.findFirst({
    where: {
      amenityId: amenity.id,
      date: dateValue,
      slotStart: input.slotStart,
      flatId,
      status: { in: ["BOOKED", "WAITLISTED"] },
    },
  });
  if (duplicate) throw AppError.conflict("This flat already has a booking for that slot.");

  const booked = await prisma.amenityBooking.count({
    where: { amenityId: amenity.id, date: dateValue, slotStart: input.slotStart, status: "BOOKED" },
  });
  const isFull = booked >= amenity.capacity;

  let waitlistPosition: number | null = null;
  if (isFull) {
    const waiting = await prisma.amenityBooking.count({
      where: { amenityId: amenity.id, date: dateValue, slotStart: input.slotStart, status: "WAITLISTED" },
    });
    waitlistPosition = waiting + 1;
  }

  const booking = await prisma.amenityBooking.create({
    data: {
      communityId: "",
      amenityId: amenity.id,
      flatId: flatId as string,
      userId: auth.userId,
      date: dateValue,
      slotStart: input.slotStart,
      slotEnd,
      status: isFull ? "WAITLISTED" : "BOOKED",
      guests: input.guests,
      note: input.note,
      waitlistPosition,
    },
    include: BOOKING_INCLUDE,
  });

  await writeAudit({
    action: "AMENITY.BOOKING_CREATE",
    resource: "AmenityBooking",
    resourceId: booking.id,
    meta: { amenityId: amenity.id, status: booking.status },
  });
  await notifyFlatOccupants(
    booking.flatId,
    isFull ? "Added to amenity waitlist" : "Amenity booking confirmed",
    `${amenity.name} on ${input.date} at ${input.slotStart.toISOString().slice(11, 16)}.`,
    { bookingId: booking.id, amenityId: amenity.id },
  );
  return booking;
}

function bookingScopeWhere(auth: AuthContext, flatIds: string[]): Prisma.AmenityBookingWhereInput {
  if (isAdmin(auth)) return {};
  return { flatId: { in: flatIds } };
}

export async function listBookings(query: {
  amenityId?: string;
  flatId?: string;
  status?: "BOOKED" | "CANCELLED" | "WAITLISTED";
  from?: Date;
  to?: Date;
  mine?: boolean;
  page: number;
  limit: number;
}) {
  const auth = authContextOrThrow();
  const { skip, take } = paginate(query.page, query.limit);
  const flats = isAdmin(auth) ? [] : await myFlatIds(auth.userId);
  const where: Prisma.AmenityBookingWhereInput = { ...bookingScopeWhere(auth, flats) };
  if (query.mine && !isAdmin(auth)) where.userId = auth.userId;
  if (query.amenityId) where.amenityId = query.amenityId;
  if (query.flatId) where.flatId = query.flatId;
  if (query.status) where.status = query.status;
  if (query.from || query.to) {
    where.date = { ...(query.from ? { gte: query.from } : {}), ...(query.to ? { lte: query.to } : {}) };
  }

  const [total, items] = await Promise.all([
    prisma.amenityBooking.count({ where }),
    prisma.amenityBooking.findMany({
      where,
      skip,
      take,
      orderBy: [{ date: "desc" }, { slotStart: "asc" }],
      include: BOOKING_INCLUDE,
    }),
  ]);
  return { items, meta: paginationMeta(query.page, query.limit, total) };
}

async function findVisibleBooking(id: string, auth: AuthContext) {
  const scope: Prisma.AmenityBookingWhereInput = isAdmin(auth)
    ? {}
    : { flatId: { in: await myFlatIds(auth.userId) } };
  const booking = await prisma.amenityBooking.findFirst({ where: { id, ...scope }, include: BOOKING_INCLUDE });
  if (!booking) throw AppError.notFound("We could not find that booking.");
  return booking;
}

export async function cancelBooking(id: string, reason?: string) {
  const auth = authContextOrThrow();
  const booking = await findVisibleBooking(id, auth);
  if (booking.status === "CANCELLED") throw AppError.conflict("This booking is already cancelled.");

  const wasBooked = booking.status === "BOOKED";
  const cancelled = await prisma.amenityBooking.update({
    where: { id },
    data: { status: "CANCELLED", cancelledAt: new Date(), waitlistPosition: null, note: reason ?? booking.note },
    include: BOOKING_INCLUDE,
  });
  await writeAudit({ action: "AMENITY.BOOKING_CANCEL", resource: "AmenityBooking", resourceId: id });

  let promoted: { id: string; flatId: string } | null = null;
  if (wasBooked) {
    const next = await prisma.amenityBooking.findFirst({
      where: {
        amenityId: booking.amenityId,
        date: booking.date,
        slotStart: booking.slotStart,
        status: "WAITLISTED",
      },
      orderBy: { waitlistPosition: "asc" },
    });
    if (next) {
      await prisma.amenityBooking.update({
        where: { id: next.id },
        data: { status: "BOOKED", waitlistPosition: null },
      });
      promoted = { id: next.id, flatId: next.flatId };
      await notifyFlatOccupants(
        next.flatId,
        "Amenity waitlist confirmed",
        `A slot opened up for ${booking.amenity.name}. Your booking is confirmed.`,
        { bookingId: next.id, amenityId: booking.amenityId },
      );
    }
  }

  return { booking: cancelled, promoted };
}
