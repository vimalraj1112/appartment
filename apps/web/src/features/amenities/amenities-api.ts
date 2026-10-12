import type { BookingStatus, ParkingSlotStatus, VehicleType } from "@superlink/shared";
import { apiRequest, apiRequestPage, type Page } from "../../lib/api";

// ---------- Types ----------

export interface Amenity {
  id: string;
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
}

export interface AvailabilitySlot {
  slotStart: string;
  slotEnd: string;
  booked: number;
  available: number;
}

export interface MyBooking {
  id: string;
  slotStart: string;
  status: BookingStatus;
}

export interface AmenityAvailability {
  amenity: Amenity;
  date: string;
  slotMinutes: number;
  capacity: number;
  slots: AvailabilitySlot[];
  myBookings: MyBooking[];
}

export interface BookingFlat {
  id: string;
  code: string;
}

export interface BookingUser {
  id: string;
  firstName: string;
  lastName: string;
}

export interface Booking {
  id: string;
  amenityId: string;
  flatId: string;
  userId: string;
  date: string;
  slotStart: string;
  slotEnd: string;
  status: BookingStatus;
  guests: number;
  waitlistPosition: number | null;
  note: string | null;
  amenity: { id: string; name: string; icon: string | null; slotMinutes: number; feeInr: number };
  flat: BookingFlat;
  user: BookingUser;
}

export interface Vehicle {
  id: string;
  regNumber: string;
  type: VehicleType;
  brand: string | null;
  model: string | null;
  color: string | null;
  isGuest: boolean;
  guestExpiresAt: string | null;
  flat: BookingFlat | null;
  user: BookingUser | null;
}

export interface ParkingSlot {
  id: string;
  code: string;
  zone: string | null;
  status: ParkingSlotStatus;
  assignments?: Array<{
    id: string;
    flat: BookingFlat | null;
    vehicle: { id: string; regNumber: string; type: VehicleType } | null;
  }>;
}

export interface ParkingAssignment {
  id: string;
  slotId: string;
  flatId: string | null;
  vehicleId: string | null;
  startsAt: string;
  endsAt: string | null;
  slot: { id: string; code: string; zone: string | null; status: ParkingSlotStatus };
  flat: BookingFlat | null;
  vehicle: { id: string; regNumber: string; type: VehicleType } | null;
}

export interface ParkingVisitor {
  id: string;
  regNumber: string;
  name: string | null;
  phone: string | null;
  note: string | null;
  validFrom: string;
  validTo: string | null;
  slot: { id: string; code: string; zone: string | null } | null;
  createdBy?: BookingUser | null;
}

// ---------- Amenities ----------

export function listAmenities(
  params: { q?: string; activeOnly?: boolean; page?: number; limit?: number } = {},
): Promise<Page<Amenity>> {
  const search = new URLSearchParams();
  if (params.q) search.set("q", params.q);
  if (params.activeOnly) search.set("activeOnly", "true");
  search.set("page", String(params.page ?? 1));
  search.set("limit", String(params.limit ?? 50));
  return apiRequestPage<Amenity>(`/amenities?${search.toString()}`);
}

export function createAmenity(body: {
  name: string;
  icon?: string;
  description?: string;
  slotMinutes?: number;
  capacity?: number;
  openTime?: string;
  closeTime?: string;
  feeInr?: number;
  rules?: string;
  isActive?: boolean;
}): Promise<Amenity> {
  return apiRequest<Amenity>("/amenities", { method: "POST", body });
}

export function updateAmenity(id: string, body: Partial<Amenity>): Promise<Amenity> {
  return apiRequest<Amenity>(`/amenities/${id}`, { method: "PATCH", body });
}

export function getAvailability(amenityId: string, date: string): Promise<AmenityAvailability> {
  return apiRequest<AmenityAvailability>(`/amenities/${amenityId}/availability?date=${date}`);
}

export function createBooking(body: {
  amenityId: string;
  date: string;
  slotStart: string;
  flatId?: string;
  guests?: number;
  note?: string;
}): Promise<Booking> {
  return apiRequest<Booking>("/bookings", { method: "POST", body });
}

export function listBookings(
  params: {
    amenityId?: string;
    flatId?: string;
    status?: BookingStatus;
    mine?: boolean;
    page?: number;
    limit?: number;
  } = {},
): Promise<Page<Booking>> {
  const search = new URLSearchParams();
  if (params.amenityId) search.set("amenityId", params.amenityId);
  if (params.flatId) search.set("flatId", params.flatId);
  if (params.status) search.set("status", params.status);
  if (params.mine) search.set("mine", "true");
  search.set("page", String(params.page ?? 1));
  search.set("limit", String(params.limit ?? 50));
  return apiRequestPage<Booking>(`/bookings?${search.toString()}`);
}

export function cancelBooking(id: string): Promise<{ booking: Booking; promoted: { id: string } | null }> {
  return apiRequest<{ booking: Booking; promoted: { id: string } | null }>(`/bookings/${id}`, {
    method: "DELETE",
  });
}

// ---------- Vehicles ----------

export function listVehicles(
  params: { q?: string; type?: VehicleType; mine?: boolean; guestsOnly?: boolean; page?: number; limit?: number } = {},
): Promise<Page<Vehicle>> {
  const search = new URLSearchParams();
  if (params.q) search.set("q", params.q);
  if (params.type) search.set("type", params.type);
  if (params.mine) search.set("mine", "true");
  if (params.guestsOnly) search.set("guestsOnly", "true");
  search.set("page", String(params.page ?? 1));
  search.set("limit", String(params.limit ?? 50));
  return apiRequestPage<Vehicle>(`/vehicles?${search.toString()}`);
}

export function createVehicle(body: {
  regNumber: string;
  type?: VehicleType;
  brand?: string;
  model?: string;
  color?: string;
  isGuest?: boolean;
}): Promise<Vehicle> {
  return apiRequest<Vehicle>("/vehicles", { method: "POST", body });
}

export function deleteVehicle(id: string): Promise<{ id: string }> {
  return apiRequest<{ id: string }>(`/vehicles/${id}`, { method: "DELETE" });
}

// ---------- Parking ----------

export function listSlots(
  params: { status?: ParkingSlotStatus; q?: string; page?: number; limit?: number } = {},
): Promise<Page<ParkingSlot>> {
  const search = new URLSearchParams();
  if (params.status) search.set("status", params.status);
  if (params.q) search.set("q", params.q);
  search.set("page", String(params.page ?? 1));
  search.set("limit", String(params.limit ?? 100));
  return apiRequestPage<ParkingSlot>(`/parking/slots?${search.toString()}`);
}

export function createSlot(body: { code: string; zone?: string; status?: ParkingSlotStatus }): Promise<ParkingSlot> {
  return apiRequest<ParkingSlot>("/parking/slots", { method: "POST", body });
}

export function updateSlot(id: string, body: Partial<{ code: string; zone: string; status: ParkingSlotStatus }>) {
  return apiRequest<ParkingSlot>(`/parking/slots/${id}`, { method: "PATCH", body });
}

export function deleteSlot(id: string): Promise<{ id: string }> {
  return apiRequest<{ id: string }>(`/parking/slots/${id}`, { method: "DELETE" });
}

export function listAssignments(
  params: { slotId?: string; active?: boolean; page?: number; limit?: number } = {},
): Promise<Page<ParkingAssignment>> {
  const search = new URLSearchParams();
  if (params.slotId) search.set("slotId", params.slotId);
  if (params.active) search.set("active", "true");
  search.set("page", String(params.page ?? 1));
  search.set("limit", String(params.limit ?? 50));
  return apiRequestPage<ParkingAssignment>(`/parking/assignments?${search.toString()}`);
}

export function assignSlot(body: { slotId: string; flatId?: string; vehicleId?: string }): Promise<ParkingAssignment> {
  return apiRequest<ParkingAssignment>("/parking/assignments", { method: "POST", body });
}

export function endAssignment(id: string): Promise<ParkingAssignment> {
  return apiRequest<ParkingAssignment>(`/parking/assignments/${id}/end`, { method: "POST", body: {} });
}

export function listVisitorParking(
  params: { active?: boolean; page?: number; limit?: number } = {},
): Promise<Page<ParkingVisitor>> {
  const search = new URLSearchParams();
  if (params.active) search.set("active", "true");
  search.set("page", String(params.page ?? 1));
  search.set("limit", String(params.limit ?? 50));
  return apiRequestPage<ParkingVisitor>(`/parking/visitors?${search.toString()}`);
}

export function createVisitorParking(body: {
  regNumber: string;
  name?: string;
  phone?: string;
  slotId?: string;
  note?: string;
}): Promise<ParkingVisitor> {
  return apiRequest<ParkingVisitor>("/parking/visitors", { method: "POST", body });
}
