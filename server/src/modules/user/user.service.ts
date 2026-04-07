import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
import { AppError } from '../../middleware/errorHandler';

const prisma = new PrismaClient();

export class UserService {
  async getAll(page: number, limit: number, search?: string) {
    const where = search
      ? {
          OR: [
            { full_name: { contains: search, mode: 'insensitive' as const } },
            { email: { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : {};

    const [data, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          full_name: true,
          avatar_url: true,
          role: true,
          is_active: true,
          created_at: true,
          updated_at: true,
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { created_at: 'desc' },
      }),
      prisma.user.count({ where }),
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async create(data: { email: string; password: string; full_name: string; role?: string }) {
    const existing = await prisma.user.findUnique({ where: { email: data.email } });
    if (existing) throw new AppError('user.emailExists', 400);

    const password_hash = await bcrypt.hash(data.password, 12);

    const user = await prisma.user.create({
      data: {
        email: data.email,
        password_hash,
        full_name: data.full_name,
        role: (data.role as 'ADMIN' | 'STAFF' | 'VIEWER') || 'STAFF',
      },
      select: {
        id: true,
        email: true,
        full_name: true,
        role: true,
        is_active: true,
        created_at: true,
      },
    });

    return user;
  }

  async update(id: string, data: { full_name?: string; role?: 'ADMIN' | 'STAFF' | 'VIEWER'; is_active?: boolean }) {
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) throw new AppError('user.notFound', 404);

    const updated = await prisma.user.update({
      where: { id },
      data,
      select: {
        id: true,
        email: true,
        full_name: true,
        role: true,
        is_active: true,
        updated_at: true,
      },
    });

    return updated;
  }

  async delete(id: string) {
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) throw new AppError('user.notFound', 404);

    await prisma.user.delete({ where: { id } });
  }
}
