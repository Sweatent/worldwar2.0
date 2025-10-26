import { NestFactory } from '@nestjs/core'
import { AppModule } from './app.module'
import { ConfigService } from '@nestjs/config'

async function bootstrap() {
  const app = await NestFactory.create(AppModule)

  const configService = app.get(ConfigService)
  const port = configService.get<number>('BACKEND_PORT') ?? 4000

  await app.listen(port)
  console.log(`🚀 Backend is running on http://localhost:${port}`)
}

bootstrap()
