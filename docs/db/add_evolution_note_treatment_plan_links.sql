ALTER TABLE `evolution_notes`
  ADD COLUMN `treatment_plan_id` INT UNSIGNED NULL AFTER `patient_id`,
  ADD COLUMN `treatment_plan_item_id` INT UNSIGNED NULL AFTER `treatment_plan_id`;

CREATE INDEX `idx_evolution_notes_treatment_plan`
  ON `evolution_notes` (`treatment_plan_id`, `createdAt`);

CREATE INDEX `idx_evolution_notes_treatment_plan_item`
  ON `evolution_notes` (`treatment_plan_item_id`, `createdAt`);

ALTER TABLE `evolution_notes`
  ADD CONSTRAINT `fk_evolution_notes_treatment_plan`
    FOREIGN KEY (`treatment_plan_id`) REFERENCES `treatment_plans` (`id`)
    ON UPDATE CASCADE
    ON DELETE SET NULL,
  ADD CONSTRAINT `fk_evolution_notes_treatment_plan_item`
    FOREIGN KEY (`treatment_plan_item_id`) REFERENCES `treatment_plan_items` (`id`)
    ON UPDATE CASCADE
    ON DELETE SET NULL;
