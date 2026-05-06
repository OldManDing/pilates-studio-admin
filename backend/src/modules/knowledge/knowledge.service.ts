import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PaginatedResponse } from '../../common/dto/pagination.dto';
import { PrismaService } from '../prisma/prisma.service';
import { CreateKnowledgeArticleDto } from './dto/create-knowledge-article.dto';
import { QueryKnowledgeArticleDto } from './dto/query-knowledge-article.dto';
import { UpdateKnowledgeArticleDto } from './dto/update-knowledge-article.dto';

@Injectable()
export class KnowledgeService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateKnowledgeArticleDto) {
    return this.prisma.knowledgeArticle.create({
      data: {
        category: dto.category.trim(),
        question: dto.question.trim(),
        answer: dto.answer.trim(),
        sortOrder: dto.sortOrder ?? 0,
        isActive: dto.isActive ?? true,
      },
    });
  }

  async findAll(query: QueryKnowledgeArticleDto): Promise<PaginatedResponse<any>> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 10;
    const skip = (page - 1) * pageSize;
    const keyword = query.search?.trim();

    const where: Prisma.KnowledgeArticleWhereInput = {
      ...(query.category ? { category: query.category } : {}),
      ...(query.isActive !== undefined ? { isActive: query.isActive } : {}),
      ...(keyword
        ? {
            OR: [
              { question: { contains: keyword } },
              { answer: { contains: keyword } },
            ],
          }
        : {}),
    };

    const [data, total] = await Promise.all([
      this.prisma.knowledgeArticle.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
      }),
      this.prisma.knowledgeArticle.count({ where }),
    ]);

    return {
      data,
      meta: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  async findPublicFaqs(category?: string) {
    return this.prisma.knowledgeArticle.findMany({
      where: {
        isActive: true,
        ...(category ? { category } : {}),
      },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
    });
  }

  async findOne(id: string) {
    const article = await this.prisma.knowledgeArticle.findUnique({ where: { id } });
    if (!article) {
      throw new NotFoundException('Knowledge article not found');
    }
    return article;
  }

  async update(id: string, dto: UpdateKnowledgeArticleDto) {
    await this.findOne(id);

    return this.prisma.knowledgeArticle.update({
      where: { id },
      data: {
        ...(dto.category !== undefined ? { category: dto.category.trim() } : {}),
        ...(dto.question !== undefined ? { question: dto.question.trim() } : {}),
        ...(dto.answer !== undefined ? { answer: dto.answer.trim() } : {}),
        ...(dto.sortOrder !== undefined ? { sortOrder: dto.sortOrder } : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.knowledgeArticle.delete({ where: { id } });
    return { success: true };
  }
}
