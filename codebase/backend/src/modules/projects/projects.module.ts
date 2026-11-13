import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  VideoProject,
  VideoProjectSchema,
} from './schemas/project.schema';
import { VideoScene, VideoSceneSchema } from './schemas/scene.schema';
import { ProjectsRepository } from './projects.repository';
import { ProjectsService } from './projects.service';
import { ProjectsController } from './projects.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: VideoProject.name, schema: VideoProjectSchema },
      { name: VideoScene.name, schema: VideoSceneSchema },
    ]),
  ],
  controllers: [ProjectsController],
  providers: [ProjectsRepository, ProjectsService],
  exports: [ProjectsService, ProjectsRepository],
})
export class ProjectsModule {}

