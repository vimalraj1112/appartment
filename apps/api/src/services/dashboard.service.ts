import { prisma } from "../config/prisma.js";
import { AppError } from "../errors/AppError.js";
import { unreadCount } from "./notification.service.js";

export async function getMyDashboard(userId: string) {
  const user = await prisma.user.findFirst({
    where: { id: userId, deletedAt: null },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      role: true,
      email: true,
      avatarUrl: true,
      phone: true,
      community: { select: { id: true, name: true } },
    },
  });
  if (!user) throw AppError.notFound("We could not find your profile.");

  const occupancies = await prisma.flatOccupant.findMany({
    where: { userId, movedOutAt: null },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      relation: true,
      isPrimary: true,
      movedInAt: true,
      flat: {
        select: {
          id: true,
          code: true,
          type: true,
          status: true,
          areaSqft: true,
          floor: {
            select: {
              id: true,
              number: true,
              label: true,
              building: { select: { id: true, name: true, towerCode: true } },
            },
          },
        },
      },
    },
  });

  const flatIds = occupancies.map((occupancy) => occupancy.flat.id);
  const familyMembers = flatIds.length
    ? await prisma.familyMember.findMany({
        where: { flatId: { in: flatIds } },
        orderBy: { createdAt: "asc" },
      })
    : [];

  const primary = occupancies.find((occupancy) => occupancy.isPrimary) ?? occupancies[0] ?? null;

  return {
    user: {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      email: user.email,
      avatarUrl: user.avatarUrl,
      phone: user.phone,
    },
    community: user.community,
    primaryFlat: primary,
    flats: occupancies,
    familyMembers,
    stats: {
      unreadNotifications: await unreadCount(userId),
      flats: occupancies.length,
      familyMembers: familyMembers.length,
    },
  };
}
