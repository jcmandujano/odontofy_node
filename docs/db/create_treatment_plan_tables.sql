CREATE TABLE IF NOT EXISTS `treatment_plans` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` INT NOT NULL,
  `patient_id` INT NOT NULL,
  `title` VARCHAR(255) NOT NULL,
  `description` TEXT NULL,
  `diagnosis` TEXT NULL,
  `patient_complaint` TEXT NULL,
  `clinical_observations` TEXT NULL,
  `prognosis` TEXT NULL,
  `status` ENUM(
    'DRAFT',
    'PROPOSED',
    'ACCEPTED',
    'IN_PROGRESS',
    'COMPLETED',
    'CANCELLED'
  ) NOT NULL DEFAULT 'DRAFT',
  `estimated_start_date` DATETIME NULL,
  `estimated_end_date` DATETIME NULL,
  `accepted_at` DATETIME NULL,
  `rejected_at` DATETIME NULL,
  `acceptance_notes` TEXT NULL,
  `subtotal` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  `discount` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  `total` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_treatment_plans_user_patient` (`user_id`, `patient_id`),
  INDEX `idx_treatment_plans_patient_created` (`patient_id`, `created_at`),
  INDEX `idx_treatment_plans_status` (`status`),
  CONSTRAINT `fk_treatment_plans_user`
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
    ON UPDATE CASCADE
    ON DELETE CASCADE,
  CONSTRAINT `fk_treatment_plans_patient`
    FOREIGN KEY (`patient_id`) REFERENCES `patients` (`id`)
    ON UPDATE CASCADE
    ON DELETE CASCADE,
  CONSTRAINT `chk_treatment_plans_subtotal_nonnegative`
    CHECK (`subtotal` >= 0),
  CONSTRAINT `chk_treatment_plans_discount_nonnegative`
    CHECK (`discount` >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `treatment_plan_items` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `treatment_plan_id` INT UNSIGNED NOT NULL,
  `user_concept_id` INT UNSIGNED NULL,
  `name` VARCHAR(255) NOT NULL,
  `description` TEXT NULL,
  `tooth` VARCHAR(255) NULL,
  `area` VARCHAR(255) NULL,
  `quantity` DECIMAL(10, 2) NOT NULL DEFAULT 1.00,
  `unit_price` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  `subtotal` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  `phase` VARCHAR(255) NULL,
  `priority` ENUM('LOW', 'MEDIUM', 'HIGH', 'URGENT') NULL,
  `status` ENUM(
    'PENDING',
    'APPROVED',
    'IN_PROGRESS',
    'COMPLETED',
    'CANCELLED'
  ) NOT NULL DEFAULT 'PENDING',
  `notes` TEXT NULL,
  `sort_order` INT NOT NULL DEFAULT 0,
  `completed_at` DATETIME NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_treatment_plan_items_plan_sort` (`treatment_plan_id`, `sort_order`),
  INDEX `idx_treatment_plan_items_status` (`status`),
  INDEX `idx_treatment_plan_items_user_concept` (`user_concept_id`),
  CONSTRAINT `fk_treatment_plan_items_plan`
    FOREIGN KEY (`treatment_plan_id`) REFERENCES `treatment_plans` (`id`)
    ON UPDATE CASCADE
    ON DELETE CASCADE,
  CONSTRAINT `fk_treatment_plan_items_user_concept`
    FOREIGN KEY (`user_concept_id`) REFERENCES `user_concept` (`id`)
    ON UPDATE CASCADE
    ON DELETE SET NULL,
  CONSTRAINT `chk_treatment_plan_items_quantity_positive`
    CHECK (`quantity` > 0),
  CONSTRAINT `chk_treatment_plan_items_unit_price_nonnegative`
    CHECK (`unit_price` >= 0),
  CONSTRAINT `chk_treatment_plan_items_subtotal_nonnegative`
    CHECK (`subtotal` >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
