import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { qaGraph } from './ingestion/qa.overdoc';
import { HumanMessage } from 'langchain';
import { runAgent } from './chat/generator/generator';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const config = new DocumentBuilder()
    .setTitle('API Documentation')
    .setDescription('API description')
    .setVersion('1.0')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  const result = await qaGraph.invoke({
    messages: [
      new HumanMessage({
        content: 'what is climate  change',
      }),
    ],
  });
  console.log("_____FINAL_ANSWER___", result);
  // runAgent()
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
