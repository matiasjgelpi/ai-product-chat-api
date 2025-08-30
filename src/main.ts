import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const config = new DocumentBuilder()
    .setTitle('Chat product api')
    .setDescription('Una api para usar en el challente de Laburen.com')
    .setVersion('1.0')
    .addTag('products', 'Endpoints de productos')
    .addTag('carts', 'Endpoints de carrito')
    .build();

  const documentFactory = () => SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, documentFactory);

  await app.listen(process.env.PORT ?? 3005);
}
bootstrap();
