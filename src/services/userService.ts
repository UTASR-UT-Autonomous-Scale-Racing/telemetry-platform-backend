import prisma from '../services/prismaClient.js';

export async function getUsers() {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      createdAt: true,
    },
    orderBy: { id: 'asc' },
  });
  return users;
}
