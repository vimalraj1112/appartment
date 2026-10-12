import type { Request, Response } from "express";
import type {
  DeliveryCreateInput,
  DeliveryListQuery,
  DeliveryStatusUpdateInput,
  VisitorEntryCreateInput,
  VisitorEntryListQuery,
  VisitorPassCreateInput,
  VisitorPassDecisionInput,
  VisitorPassListQuery,
  VisitorVerifyInput,
  VisitorWalkInInput,
  WatchlistCreateInput,
  WatchlistListQuery,
} from "@superlink/shared";
import * as visitors from "../services/visitor.service.js";
import { ok } from "../utils/respond.js";

export async function listPasses(req: Request, res: Response): Promise<void> {
  const { items, meta } = await visitors.listPasses(req.validatedQuery as VisitorPassListQuery);
  ok(res, items, meta);
}

export async function getPass(req: Request, res: Response): Promise<void> {
  ok(res, await visitors.getPass(req.params.id as string));
}

export async function createPass(req: Request, res: Response): Promise<void> {
  ok(res, await visitors.createPass(req.body as VisitorPassCreateInput));
}

export async function cancelPass(req: Request, res: Response): Promise<void> {
  ok(res, await visitors.cancelPass(req.params.id as string));
}

export async function decidePass(req: Request, res: Response): Promise<void> {
  ok(
    res,
    await visitors.decidePass(req.params.id as string, req.body as VisitorPassDecisionInput),
  );
}

export async function verifyPass(req: Request, res: Response): Promise<void> {
  ok(res, await visitors.verifyPass(req.body as VisitorVerifyInput));
}

export async function listEntries(req: Request, res: Response): Promise<void> {
  const { items, meta } = await visitors.listEntries(req.validatedQuery as VisitorEntryListQuery);
  ok(res, items, meta);
}

export async function registerEntry(req: Request, res: Response): Promise<void> {
  ok(res, await visitors.registerEntry(req.body as VisitorEntryCreateInput));
}

export async function walkIn(req: Request, res: Response): Promise<void> {
  ok(res, await visitors.walkIn(req.body as VisitorWalkInInput));
}

export async function listDeliveries(req: Request, res: Response): Promise<void> {
  const { items, meta } = await visitors.listDeliveries(req.validatedQuery as DeliveryListQuery);
  ok(res, items, meta);
}

export async function createDelivery(req: Request, res: Response): Promise<void> {
  ok(res, await visitors.createDelivery(req.body as DeliveryCreateInput));
}

export async function updateDeliveryStatus(req: Request, res: Response): Promise<void> {
  ok(
    res,
    await visitors.updateDeliveryStatus(
      req.params.id as string,
      req.body as DeliveryStatusUpdateInput,
    ),
  );
}

export async function listWatchlist(req: Request, res: Response): Promise<void> {
  const { items, meta } = await visitors.listWatchlist(req.validatedQuery as WatchlistListQuery);
  ok(res, items, meta);
}

export async function createWatchlist(req: Request, res: Response): Promise<void> {
  ok(res, await visitors.createWatchlist(req.body as WatchlistCreateInput));
}

export async function deactivateWatchlist(req: Request, res: Response): Promise<void> {
  ok(res, await visitors.deactivateWatchlist(req.params.id as string));
}

export async function getPublicPass(req: Request, res: Response): Promise<void> {
  ok(res, await visitors.getPublicPass(req.params.token as string));
}

export async function listGateFlats(_req: Request, res: Response): Promise<void> {
  ok(res, await visitors.listGateFlats());
}
