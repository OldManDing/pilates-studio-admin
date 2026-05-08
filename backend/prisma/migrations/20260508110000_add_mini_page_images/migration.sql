CREATE TABLE `MiniPageImage` (
  `id` VARCHAR(191) NOT NULL,
  `pageKey` VARCHAR(191) NOT NULL,
  `imageUrl` LONGTEXT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,

  UNIQUE INDEX `MiniPageImage_pageKey_key`(`pageKey`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
