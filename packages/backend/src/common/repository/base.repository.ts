import { PrismaClient } from '@prisma/client'

export abstract class BaseRepository<T> {
  constructor(protected readonly prisma: PrismaClient) {}

  protected abstract getModelName(): string

  protected get model(): any {
    const model = (this.prisma as any)[this.getModelName()]
    if (!model) {
      throw new Error(`Model ${String(this.getModelName())} not found in Prisma client`)
    }
    return model
  }

  async findById(id: string, options: any = {}): Promise<T | null> {
    return this.model.findUnique({
      where: { id },
      ...options,
    })
  }

  async findMany(where: any = {}, options: any = {}): Promise<T[]> {
    return this.model.findMany({
      where,
      ...options,
    })
  }

  async create(data: any, options: any = {}): Promise<T> {
    return this.model.create({
      data,
      ...options,
    })
  }

  async update(id: string, data: any, options: any = {}): Promise<T> {
    return this.model.update({
      where: { id },
      data,
      ...options,
    })
  }

  async delete(id: string, options: any = {}): Promise<T> {
    return this.model.delete({
      where: { id },
      ...options,
    })
  }
}
