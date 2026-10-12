import { ONBOARDING_STEPS } from "@superlink/shared";
import { prisma } from "../config/prisma.js";
import { writeAudit } from "./audit.service.js";

const TOTAL = ONBOARDING_STEPS.length;

export async function getOnboarding() {
  const setting = await prisma.communitySetting.findFirst();
  const step = Math.min(Math.max(setting?.onboardingStep ?? 0, 0), TOTAL);

  const [buildingCount, floorCount, flatCount, residentCount, staffCount] = await Promise.all([
    prisma.building.count({ where: { deletedAt: null } }),
    prisma.floor.count(),
    prisma.flat.count({ where: { deletedAt: null } }),
    prisma.user.count({ where: { role: "RESIDENT", deletedAt: null } }),
    prisma.user.count({ where: { role: { in: ["SECURITY", "STAFF"] }, deletedAt: null } }),
  ]);

  return {
    step,
    total: TOTAL,
    completed: step >= TOTAL,
    steps: ONBOARDING_STEPS.map((entry, index) => ({
      ...entry,
      index,
      done: index < step,
    })),
    counts: {
      buildings: buildingCount,
      floors: floorCount,
      flats: flatCount,
      residents: residentCount,
      staff: staffCount,
    },
  };
}

export async function setOnboardingStep(step: number) {
  const clamped = Math.min(Math.max(step, 0), TOTAL);

  const setting = await prisma.communitySetting.upsert({
    where: { communityId: "" },
    create: { communityId: "", onboardingStep: clamped },
    update: { onboardingStep: clamped },
  });

  await writeAudit({
    action: "ONBOARDING.STEP",
    resource: "CommunitySetting",
    resourceId: setting.id,
    meta: { step: clamped },
  });

  return getOnboarding();
}
