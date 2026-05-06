import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { SkipAuth } from '../../common/decorators/skip-auth.decorator';
import { CreateKnowledgeArticleDto } from './dto/create-knowledge-article.dto';
import { QueryKnowledgeArticleDto } from './dto/query-knowledge-article.dto';
import { UpdateKnowledgeArticleDto } from './dto/update-knowledge-article.dto';
import { KnowledgeService } from './knowledge.service';

@ApiTags('Knowledge')
@ApiBearerAuth()
@Controller('knowledge')
export class KnowledgeController {
  constructor(private readonly knowledgeService: KnowledgeService) {}

  @Get('faqs')
  @SkipAuth()
  @ApiOperation({ summary: 'Get active FAQ content for mini program' })
  async findPublicFaqs(@Query('category') category?: string) {
    return this.knowledgeService.findPublicFaqs(category);
  }

  @Get()
  @RequirePermissions('READ:KNOWLEDGE')
  @ApiOperation({ summary: 'Get knowledge articles' })
  async findAll(@Query() query: QueryKnowledgeArticleDto) {
    return this.knowledgeService.findAll(query);
  }

  @Post()
  @RequirePermissions('WRITE:KNOWLEDGE')
  @ApiOperation({ summary: 'Create knowledge article' })
  async create(@Body() dto: CreateKnowledgeArticleDto) {
    return this.knowledgeService.create(dto);
  }

  @Get(':id')
  @RequirePermissions('READ:KNOWLEDGE')
  @ApiOperation({ summary: 'Get knowledge article by ID' })
  @ApiParam({ name: 'id', description: 'Knowledge article ID' })
  async findOne(@Param('id') id: string) {
    return this.knowledgeService.findOne(id);
  }

  @Patch(':id')
  @RequirePermissions('WRITE:KNOWLEDGE')
  @ApiOperation({ summary: 'Update knowledge article' })
  @ApiParam({ name: 'id', description: 'Knowledge article ID' })
  async update(@Param('id') id: string, @Body() dto: UpdateKnowledgeArticleDto) {
    return this.knowledgeService.update(id, dto);
  }

  @Delete(':id')
  @RequirePermissions('MANAGE:KNOWLEDGE')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete knowledge article' })
  @ApiParam({ name: 'id', description: 'Knowledge article ID' })
  async remove(@Param('id') id: string) {
    return this.knowledgeService.remove(id);
  }
}
