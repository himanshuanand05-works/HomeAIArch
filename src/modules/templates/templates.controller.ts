import { Controller, Get, Param, ParseUUIDPipe } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { TemplatesService } from './templates.service';

@ApiTags('templates')
@Controller('templates')
export class TemplatesController {
  constructor(private readonly templatesService: TemplatesService) {}

  @Get()
  @ApiOperation({ summary: 'List active DesignTemplates (regional standards)' })
  list() {
    return this.templatesService.list();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a DesignTemplate by id' })
  findById(@Param('id', ParseUUIDPipe) id: string) {
    return this.templatesService.findById(id);
  }
}
