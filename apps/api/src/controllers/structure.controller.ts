import type { Request, Response } from "express";
import type {
  BuildingCreateInput,
  BuildingUpdateInput,
  FlatBulkCreateInput,
  FlatCreateInput,
  FlatListQuery,
  FlatUpdateInput,
  FloorCreateInput,
  FloorUpdateInput,
  FamilyMemberCreateInput,
} from "@superlink/shared";
import * as structure from "../services/structure.service.js";
import * as residents from "../services/resident.service.js";
import { ok } from "../utils/respond.js";

// ---------- Buildings ----------

export async function listBuildings(_req: Request, res: Response): Promise<void> {
  ok(res, await structure.listBuildings());
}

export async function getBuilding(req: Request, res: Response): Promise<void> {
  ok(res, await structure.getBuilding(req.params.id as string));
}

export async function createBuilding(req: Request, res: Response): Promise<void> {
  ok(res, await structure.createBuilding(req.body as BuildingCreateInput), undefined);
}

export async function updateBuilding(req: Request, res: Response): Promise<void> {
  ok(res, await structure.updateBuilding(req.params.id as string, req.body as BuildingUpdateInput));
}

export async function deleteBuilding(req: Request, res: Response): Promise<void> {
  await structure.deleteBuilding(req.params.id as string);
  ok(res, { deleted: true });
}

// ---------- Floors ----------

export async function listFloors(req: Request, res: Response): Promise<void> {
  ok(res, await structure.listFloors(req.params.buildingId as string));
}

export async function createFloor(req: Request, res: Response): Promise<void> {
  const floor = await structure.createFloor(
    req.params.buildingId as string,
    req.body as FloorCreateInput,
  );
  ok(res, floor);
}

export async function updateFloor(req: Request, res: Response): Promise<void> {
  ok(res, await structure.updateFloor(req.params.id as string, req.body as FloorUpdateInput));
}

export async function deleteFloor(req: Request, res: Response): Promise<void> {
  await structure.deleteFloor(req.params.id as string);
  ok(res, { deleted: true });
}

// ---------- Flats ----------

export async function listFlats(req: Request, res: Response): Promise<void> {
  const query = req.validatedQuery as FlatListQuery;
  const { items, meta } = await structure.listFlats(query);
  ok(res, items, meta);
}

export async function getFlat(req: Request, res: Response): Promise<void> {
  ok(res, await structure.getFlat(req.params.id as string));
}

export async function createFlat(req: Request, res: Response): Promise<void> {
  ok(res, await structure.createFlat(req.body as FlatCreateInput));
}

export async function bulkCreateFlats(req: Request, res: Response): Promise<void> {
  ok(res, await structure.bulkCreateFlats(req.body as FlatBulkCreateInput));
}

export async function updateFlat(req: Request, res: Response): Promise<void> {
  ok(res, await structure.updateFlat(req.params.id as string, req.body as FlatUpdateInput));
}

export async function deleteFlat(req: Request, res: Response): Promise<void> {
  await structure.deleteFlat(req.params.id as string);
  ok(res, { deleted: true });
}

// ---------- Family members ----------

export async function addFamilyMember(req: Request, res: Response): Promise<void> {
  ok(
    res,
    await residents.addFamilyMember(
      req.params.id as string,
      req.body as FamilyMemberCreateInput,
    ),
  );
}

export async function removeFamilyMember(req: Request, res: Response): Promise<void> {
  await residents.removeFamilyMember(req.params.id as string);
  ok(res, { deleted: true });
}
