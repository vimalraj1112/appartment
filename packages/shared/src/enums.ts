export const ROLES = ["SUPER_ADMIN", "COMMUNITY_ADMIN", "SECURITY", "RESIDENT", "STAFF"] as const;
export type Role = (typeof ROLES)[number];

export const USER_STATUSES = ["ACTIVE", "INVITED", "DISABLED"] as const;
export type UserStatus = (typeof USER_STATUSES)[number];

export const COMMUNITY_STATUSES = ["ACTIVE", "SUSPENDED"] as const;
export type CommunityStatus = (typeof COMMUNITY_STATUSES)[number];

export const SUBSCRIPTION_STATUSES = ["ACTIVE", "TRIAL", "PAST_DUE", "CANCELLED"] as const;
export type SubscriptionStatus = (typeof SUBSCRIPTION_STATUSES)[number];

export const DEMO_LEAD_STATUSES = ["NEW", "CONTACTED", "CONVERTED", "DISMISSED"] as const;
export type DemoLeadStatus = (typeof DEMO_LEAD_STATUSES)[number];

export const FLAT_STATUSES = ["OCCUPIED", "VACANT", "BLOCKED"] as const;
export type FlatStatus = (typeof FLAT_STATUSES)[number];

export const OCCUPANT_RELATIONS = ["OWNER", "TENANT"] as const;
export type OccupantRelation = (typeof OCCUPANT_RELATIONS)[number];

export const NOTIFICATION_TYPES = [
  "GENERAL",
  "VISITOR",
  "COMPLAINT",
  "BILLING",
  "ANNOUNCEMENT",
  "EMERGENCY",
  "SYSTEM",
] as const;
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export const VISITOR_PASS_TYPES = ["SINGLE_USE", "TIME_WINDOW"] as const;
export type VisitorPassType = (typeof VISITOR_PASS_TYPES)[number];

export const VISITOR_PASS_STATUSES = ["PENDING", "ACTIVE", "USED", "EXPIRED", "CANCELLED"] as const;
export type VisitorPassStatus = (typeof VISITOR_PASS_STATUSES)[number];

export const VISITOR_ENTRY_DIRECTIONS = ["IN", "OUT"] as const;
export type VisitorEntryDirection = (typeof VISITOR_ENTRY_DIRECTIONS)[number];

export const VISITOR_ENTRY_METHODS = ["QR", "WALK_IN", "MANUAL"] as const;
export type VisitorEntryMethod = (typeof VISITOR_ENTRY_METHODS)[number];

export const DELIVERY_STATUSES = [
  "EXPECTED",
  "ARRIVED",
  "DELIVERED",
  "COLLECTED",
  "CANCELLED",
] as const;
export type DeliveryStatus = (typeof DELIVERY_STATUSES)[number];

export const WATCHLIST_TYPES = ["PERSON", "VEHICLE"] as const;
export type WatchlistType = (typeof WATCHLIST_TYPES)[number];

export const DELIVERY_CATEGORIES = ["FOOD", "COURIER", "GROCERY", "MEDICINE", "OTHER"] as const;
export type DeliveryCategory = (typeof DELIVERY_CATEGORIES)[number];

export const COMPLAINT_PRIORITIES = ["LOW", "MEDIUM", "HIGH", "URGENT"] as const;
export type ComplaintPriority = (typeof COMPLAINT_PRIORITIES)[number];

export const COMPLAINT_STATUSES = [
  "OPEN",
  "ASSIGNED",
  "IN_PROGRESS",
  "RESOLVED",
  "CLOSED",
] as const;
export type ComplaintStatus = (typeof COMPLAINT_STATUSES)[number];

export const STAFF_AVAILABILITIES = ["AVAILABLE", "BUSY", "OFF"] as const;
export type StaffAvailability = (typeof STAFF_AVAILABILITIES)[number];

export const DOMESTIC_STAFF_STATUSES = ["ACTIVE", "INACTIVE"] as const;
export type DomesticStaffStatus = (typeof DOMESTIC_STAFF_STATUSES)[number];

export const DOMESTIC_WORK_TYPES = [
  "MAID",
  "COOK",
  "DRIVER",
  "NANNY",
  "GARDENER",
  "OTHER",
] as const;
export type DomesticWorkType = (typeof DOMESTIC_WORK_TYPES)[number];

export const BILL_STATUSES = ["PENDING", "PARTIAL", "PAID", "OVERDUE"] as const;
export type BillStatus = (typeof BILL_STATUSES)[number];

export const PAYMENT_STATUSES = [
  "PENDING",
  "PROCESSING",
  "SUCCESS",
  "FAILED",
  "REFUNDED",
] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const PAYMENT_PROVIDERS = ["MOCK", "RAZORPAY", "CASH", "BANK_TRANSFER", "UPI"] as const;
export type PaymentProvider = (typeof PAYMENT_PROVIDERS)[number];

export const BILL_PERIOD_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;

export const BOOKING_STATUSES = ["BOOKED", "CANCELLED", "WAITLISTED"] as const;
export type BookingStatus = (typeof BOOKING_STATUSES)[number];

export const VEHICLE_TYPES = ["CAR", "BIKE", "EV", "BICYCLE"] as const;
export type VehicleType = (typeof VEHICLE_TYPES)[number];

export const PARKING_SLOT_STATUSES = ["AVAILABLE", "OCCUPIED", "RESERVED", "MAINTENANCE"] as const;
export type ParkingSlotStatus = (typeof PARKING_SLOT_STATUSES)[number];

export const ANNOUNCEMENT_TYPES = ["GENERAL", "URGENT", "MAINTENANCE", "EVENT", "EMERGENCY"] as const;
export type AnnouncementType = (typeof ANNOUNCEMENT_TYPES)[number];

export const ANNOUNCEMENT_STATUSES = ["DRAFT", "SCHEDULED", "PUBLISHED", "ARCHIVED"] as const;
export type AnnouncementStatus = (typeof ANNOUNCEMENT_STATUSES)[number];

export const POST_STATUSES = ["VISIBLE", "HIDDEN", "REMOVED"] as const;
export type PostStatus = (typeof POST_STATUSES)[number];

export const POST_REPORT_STATUSES = ["OPEN", "RESOLVED", "DISMISSED"] as const;
export type PostReportStatus = (typeof POST_REPORT_STATUSES)[number];

export const EMERGENCY_CATEGORIES = [
  "MEDICAL",
  "FIRE",
  "SECURITY",
  "ELECTRICAL",
  "WATER",
  "OTHER",
] as const;
export type EmergencyCategory = (typeof EMERGENCY_CATEGORIES)[number];

export const EMERGENCY_ALERT_STATUSES = ["TRIGGERED", "ACKNOWLEDGED", "RESOLVED"] as const;
export type EmergencyAlertStatus = (typeof EMERGENCY_ALERT_STATUSES)[number];

export const AI_MESSAGE_ROLES = ["USER", "ASSISTANT", "TOOL"] as const;
export type AiMessageRole = (typeof AI_MESSAGE_ROLES)[number];

export const AI_TOOL_TIERS = ["COMMUNITY", "OWN", "HELP"] as const;
export type AiToolTier = (typeof AI_TOOL_TIERS)[number];
