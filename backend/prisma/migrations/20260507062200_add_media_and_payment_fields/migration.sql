ALTER TABLE `Course`
  ADD COLUMN `coverImageUrl` LONGTEXT NULL;

ALTER TABLE `StudioSetting`
  ADD COLUMN `imageUrl` LONGTEXT NULL;

ALTER TABLE `Transaction`
  ADD COLUMN `paidAt` DATETIME(3) NULL,
  ADD COLUMN `paymentError` TEXT NULL,
  ADD COLUMN `paymentMethod` VARCHAR(191) NULL,
  ADD COLUMN `paymentOrderNo` VARCHAR(191) NULL,
  ADD COLUMN `paymentPayload` JSON NULL,
  ADD COLUMN `paymentPrepayId` VARCHAR(191) NULL,
  ADD COLUMN `paymentProvider` VARCHAR(191) NULL,
  ADD COLUMN `paymentRequestedAt` DATETIME(3) NULL,
  ADD COLUMN `paymentTransactionId` VARCHAR(191) NULL;
