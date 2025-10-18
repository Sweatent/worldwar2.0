import { Injectable } from '@nestjs/common'
import { TechProgress, TechStatus } from '@prisma/client'
import { PrismaService } from '../prisma'
import { BaseRepository } from './base.repository'

@Injectable()
export class TechProgressRepository extends BaseRepository<TechProgress> {
  constructor(protected readonly prismaClient: PrismaService) {
    super(prismaClient)
  }

  protected getModelName(): string {
    return 'techProgress'
  }

  async listByNation(nationId: string): Promise<TechProgress[]> {
    return this.prismaClient.techProgress.findMany({
      where: { nationId },
      orderBy: [{ status: 'asc' }, { startedAt: 'asc' }],
    })
  }

  async findByNationAndTech(nationId: string, techId: string): Promise<TechProgress | null> {
    return this.prismaClient.techProgress.findUnique({
      where: {
        nationId_techId: {
          nationId,
          techId,
        },
      },
    })
  }

  async startResearch(progressId: string): Promise<TechProgress> {
    return this.prismaClient.techProgress.update({
      where: { id: progressId },
      data: {
        status: TechStatus.RESEARCHING,
        startedAt: new Date(),
      },
    })
  }

  async updateProgress(progressId: string, progress: number): Promise<TechProgress> {
    const value = Math.max(0, Math.min(100, progress))
    const status = value >= 100 ? TechStatus.COMPLETED : TechStatus.RESEARCHING

    return this.prismaClient.techProgress.update({
      where: { id: progressId },
      data: {
        progress: value,
        status,
        completedAt: value >= 100 ? new Date() : null,
      },
    })
  }
}
