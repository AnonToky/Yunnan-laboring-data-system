-- CreateTable
CREATE TABLE `User` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `username` VARCHAR(191) NOT NULL,
  `passwordHash` VARCHAR(191) NOT NULL,
  `role` ENUM('enterprise', 'city', 'province') NOT NULL,
  `regionCode` VARCHAR(191) NOT NULL,
  `enterpriseId` INTEGER NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE INDEX `User_username_key`(`username`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `Enterprise` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `regionCode` VARCHAR(191) NOT NULL,
  `orgCode` VARCHAR(191) NOT NULL,
  `name` VARCHAR(191) NOT NULL,
  `type` VARCHAR(191) NOT NULL,
  `industry` VARCHAR(191) NOT NULL,
  `business` VARCHAR(191) NOT NULL,
  `contactPerson` VARCHAR(191) NOT NULL,
  `address` VARCHAR(191) NOT NULL,
  `postalCode` VARCHAR(191) NOT NULL,
  `phone` VARCHAR(191) NOT NULL,
  `fax` VARCHAR(191) NOT NULL,
  `email` VARCHAR(191) NULL,
  `filingStatus` ENUM('draft', 'pending_province', 'approved', 'rejected') NOT NULL DEFAULT 'draft',
  `provinceAuditComment` VARCHAR(191) NULL,
  `provinceAuditAt` DATETIME(3) NULL,
  `provinceAuditorId` INTEGER NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  UNIQUE INDEX `Enterprise_regionCode_orgCode_key`(`regionCode`, `orgCode`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `SurveyPeriod` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `periodKey` VARCHAR(191) NOT NULL,
  `startAt` DATETIME(3) NOT NULL,
  `endAt` DATETIME(3) NOT NULL,
  `submitDeadline` DATETIME(3) NOT NULL,
  UNIQUE INDEX `SurveyPeriod_periodKey_key`(`periodKey`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `Report` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `enterpriseId` INTEGER NOT NULL,
  `periodKey` VARCHAR(191) NOT NULL,
  `initialEmployees` INTEGER NOT NULL,
  `currentEmployees` INTEGER NOT NULL,
  `otherReason` VARCHAR(191) NULL,
  `decreaseType` VARCHAR(191) NULL,
  `mainReason` VARCHAR(191) NULL,
  `mainReasonDesc` VARCHAR(191) NULL,
  `secondReason` VARCHAR(191) NULL,
  `secondReasonDesc` VARCHAR(191) NULL,
  `thirdReason` VARCHAR(191) NULL,
  `thirdReasonDesc` VARCHAR(191) NULL,
  `status` ENUM('draft', 'pending_city', 'city_rejected', 'pending_province', 'province_rejected', 'approved', 'reported') NOT NULL DEFAULT 'draft',
  `submitTime` DATETIME(3) NULL,
  `cityAuditComment` VARCHAR(191) NULL,
  `cityAuditAt` DATETIME(3) NULL,
  `cityAuditorId` INTEGER NULL,
  `provinceAuditComment` VARCHAR(191) NULL,
  `provinceAuditAt` DATETIME(3) NULL,
  `provinceAuditorId` INTEGER NULL,
  `reportedAt` DATETIME(3) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  UNIQUE INDEX `Report_enterpriseId_periodKey_key`(`enterpriseId`, `periodKey`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `ReportAuditLog` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `reportId` INTEGER NOT NULL,
  `level` ENUM('city', 'province') NOT NULL,
  `action` ENUM('approve', 'reject', 'report') NOT NULL,
  `comment` VARCHAR(191) NULL,
  `auditorId` INTEGER NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `Notice` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `title` VARCHAR(191) NOT NULL,
  `content` VARCHAR(2000) NOT NULL,
  `publisherUnit` VARCHAR(191) NOT NULL,
  `publisherRole` ENUM('enterprise', 'city', 'province') NOT NULL,
  `regionScope` VARCHAR(191) NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `Dictionary` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `type` VARCHAR(191) NOT NULL,
  `code` VARCHAR(191) NOT NULL,
  `value` VARCHAR(191) NOT NULL,
  `parentCode` VARCHAR(191) NULL,
  `sortNo` INTEGER NOT NULL DEFAULT 0,
  UNIQUE INDEX `Dictionary_type_code_key`(`type`, `code`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `User` ADD CONSTRAINT `User_enterpriseId_fkey` FOREIGN KEY (`enterpriseId`) REFERENCES `Enterprise`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `Report` ADD CONSTRAINT `Report_enterpriseId_fkey` FOREIGN KEY (`enterpriseId`) REFERENCES `Enterprise`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `ReportAuditLog` ADD CONSTRAINT `ReportAuditLog_reportId_fkey` FOREIGN KEY (`reportId`) REFERENCES `Report`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `ReportAuditLog` ADD CONSTRAINT `ReportAuditLog_auditorId_fkey` FOREIGN KEY (`auditorId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
