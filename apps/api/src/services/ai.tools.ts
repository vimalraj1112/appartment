import { can, type AiToolTier, type Capability, type Role } from "@superlink/shared";
import { prisma } from "../config/prisma.js";
import type { AuthContext } from "../tenant/context.js";
import * as reportService from "./report.service.js";

export interface AiToolResult {
  text: string;
  data?: unknown;
}

export interface AiTool {
  name: string;
  tier: AiToolTier;
  description: string;
  parameters: Record<string, unknown>;
  run: (auth: AuthContext, args: Record<string, unknown>) => Promise<AiToolResult>;
}

const CAPABILITY_BY_TIER: Record<AiToolTier, Capability> = {
  COMMUNITY: "AI_COMMUNITY",
  OWN: "AI_OWN",
  HELP: "AI_HELP",
};

function inr(value: number): string {
  return `₹${value.toLocaleString("en-IN")}`;
}

async function ownFlatIds(auth: AuthContext): Promise<string[]> {
  const occupants = await prisma.flatOccupant.findMany({
    where: { userId: auth.userId, movedOutAt: null },
    select: { flatId: true },
  });
  return occupants.map((row) => row.flatId);
}

const HELP_TOPICS = [
  "Raising a complaint — open Complaints, tap New, pick a category and describe the issue.",
  "Visitor passes — open Visitors, create a pass, then share the QR or code with your guest.",
  "Paying bills — open Bills, choose the period and tap Pay; receipts appear instantly.",
  "Amenity booking — open Amenities, pick a slot and confirm; cancellations free the slot.",
  "Emergency — tap the SOS button to alert security and neighbours right away.",
].join("\n");

const TOOLS: AiTool[] = [
  {
    name: "community_overview",
    tier: "COMMUNITY",
    description: "Community KPIs: occupancy, residents, visitors, complaints, billing and emergencies.",
    parameters: { type: "object", properties: {}, additionalProperties: false },
    async run() {
      const data = await reportService.getOverview();
      const text =
        `Occupancy is ${data.flats.occupancyRate}% (${data.flats.occupied}/${data.flats.total} flats). ` +
        `${data.residents.active} active residents. ` +
        `${data.complaints.open} open complaints (${data.complaints.resolutionRate}% resolved). ` +
        `Collections for ${data.billing.period}: ${inr(data.billing.collectedInr)} of ${inr(data.billing.billedInr)} ` +
        `(${data.billing.collectionRate}%), outstanding ${inr(data.billing.outstandingInr)}. ` +
        `${data.visitors.entriesToday} gate entries today, ${data.emergency.active} active emergencies.`;
      return { text, data };
    },
  },
  {
    name: "community_finance",
    tier: "COMMUNITY",
    description: "Billing, collections, outstanding amounts and expenses for the current period.",
    parameters: { type: "object", properties: {}, additionalProperties: false },
    async run() {
      const data = await reportService.getOverview();
      const text =
        `For ${data.billing.period}: billed ${inr(data.billing.billedInr)}, collected ` +
        `${inr(data.billing.collectedInr)} (${data.billing.collectionRate}%), outstanding ` +
        `${inr(data.billing.outstandingInr)}, overdue ${inr(data.billing.overdueInr)}. ` +
        `Expenses this month: ${inr(data.expenses.thisMonthInr)}.`;
      return { text, data: data.billing };
    },
  },
  {
    name: "community_complaints",
    tier: "COMMUNITY",
    description: "Complaint counts by status and average resolution time.",
    parameters: { type: "object", properties: {}, additionalProperties: false },
    async run() {
      const data = await reportService.getOverview();
      const byStatus = data.complaints.byStatus.map((row) => `${row.status}: ${row.count}`).join(", ");
      const text =
        `${data.complaints.total} complaints total, ${data.complaints.open} open, ` +
        `${data.complaints.resolved} resolved (${data.complaints.resolutionRate}%). ` +
        `Average resolution ${data.complaints.avgResolutionHours ?? "n/a"} hours. ${byStatus}.`;
      return { text, data: data.complaints };
    },
  },
  {
    name: "community_visitors",
    tier: "COMMUNITY",
    description: "Gate activity: active and pending visitor passes plus entries today.",
    parameters: { type: "object", properties: {}, additionalProperties: false },
    async run() {
      const data = await reportService.getOverview();
      const text =
        `${data.visitors.entriesToday} entries today, ${data.visitors.activePasses} active passes, ` +
        `${data.visitors.pendingPasses} pending approval.`;
      return { text, data: data.visitors };
    },
  },
  {
    name: "my_bills",
    tier: "OWN",
    description: "The resident's recent maintenance bills and payment status.",
    parameters: { type: "object", properties: {}, additionalProperties: false },
    async run(auth) {
      const flatIds = await ownFlatIds(auth);
      if (flatIds.length === 0) return { text: "You don't have a flat linked to your account yet.", data: [] };
      const bills = await prisma.maintenanceBill.findMany({
        where: { flatId: { in: flatIds } },
        orderBy: { period: "desc" },
        take: 6,
        select: { period: true, totalInr: true, status: true, dueDate: true },
      });
      if (bills.length === 0) return { text: "You have no maintenance bills on record.", data: [] };
      const text = bills
        .map((bill) => `${bill.period}: ${inr(bill.totalInr)} — ${bill.status}`)
        .join("\n");
      return { text: `Your recent bills:\n${text}`, data: bills };
    },
  },
  {
    name: "my_visitors",
    tier: "OWN",
    description: "The resident's visitor passes that are pending or active.",
    parameters: { type: "object", properties: {}, additionalProperties: false },
    async run(auth) {
      const flatIds = await ownFlatIds(auth);
      if (flatIds.length === 0) return { text: "You don't have a flat linked to your account yet.", data: [] };
      const passes = await prisma.visitorPass.findMany({
        where: { flatId: { in: flatIds }, status: { in: ["PENDING", "ACTIVE"] } },
        orderBy: { createdAt: "desc" },
        take: 6,
        select: { code: true, status: true, validTo: true, visitor: { select: { name: true } } },
      });
      if (passes.length === 0) return { text: "You have no pending or active visitor passes.", data: [] };
      const text = passes
        .map((pass) => `${pass.visitor.name} — ${pass.code} (${pass.status})`)
        .join("\n");
      return { text: `Your visitor passes:\n${text}`, data: passes };
    },
  },
  {
    name: "my_bookings",
    tier: "OWN",
    description: "The resident's amenity bookings.",
    parameters: { type: "object", properties: {}, additionalProperties: false },
    async run(auth) {
      const bookings = await prisma.amenityBooking.findMany({
        where: { userId: auth.userId },
        orderBy: { slotStart: "desc" },
        take: 6,
        select: {
          slotStart: true,
          status: true,
          amenity: { select: { name: true } },
        },
      });
      if (bookings.length === 0) return { text: "You have no amenity bookings yet.", data: [] };
      const text = bookings
        .map((booking) => `${booking.amenity.name} — ${booking.slotStart.toISOString().slice(0, 16)} (${booking.status})`)
        .join("\n");
      return { text: `Your bookings:\n${text}`, data: bookings };
    },
  },
  {
    name: "my_complaints",
    tier: "OWN",
    description: "Complaints the resident has raised and their status.",
    parameters: { type: "object", properties: {}, additionalProperties: false },
    async run(auth) {
      const complaints = await prisma.complaint.findMany({
        where: { raisedById: auth.userId },
        orderBy: { createdAt: "desc" },
        take: 6,
        select: { title: true, status: true, priority: true, createdAt: true },
      });
      if (complaints.length === 0) return { text: "You haven't raised any complaints.", data: [] };
      const text = complaints.map((row) => `${row.title} — ${row.status} (${row.priority})`).join("\n");
      return { text: `Your complaints:\n${text}`, data: complaints };
    },
  },
  {
    name: "help_topics",
    tier: "HELP",
    description: "How-to guidance for common community tasks.",
    parameters: { type: "object", properties: {}, additionalProperties: false },
    async run() {
      return { text: HELP_TOPICS, data: { topics: HELP_TOPICS.split("\n") } };
    },
  },
];

export function toolsForRole(role: Role): AiTool[] {
  return TOOLS.filter((tool) => tool.tier === "HELP" || can(role, CAPABILITY_BY_TIER[tool.tier]));
}

export function findTool(role: Role, name: string): AiTool | undefined {
  return toolsForRole(role).find((tool) => tool.name === name);
}

export function toDefinition(tool: AiTool) {
  return { name: tool.name, description: tool.description, parameters: tool.parameters };
}
