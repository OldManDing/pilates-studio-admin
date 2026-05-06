ALTER TABLE `Coach` ADD COLUMN `avatarUrl` LONGTEXT NULL;

ALTER TABLE `Course` ADD COLUMN `description` TEXT NULL;

ALTER TABLE `CourseSession`
  ADD COLUMN `isActive` BOOLEAN NOT NULL DEFAULT true;

CREATE TABLE `KnowledgeArticle` (
  `id` VARCHAR(191) NOT NULL,
  `category` VARCHAR(191) NOT NULL,
  `question` VARCHAR(191) NOT NULL,
  `answer` TEXT NOT NULL,
  `sortOrder` INTEGER NOT NULL DEFAULT 0,
  `isActive` BOOLEAN NOT NULL DEFAULT true,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,

  INDEX `KnowledgeArticle_category_isActive_sortOrder_idx`(`category`, `isActive`, `sortOrder`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
