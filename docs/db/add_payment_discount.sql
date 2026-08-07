ALTER TABLE `payment`
  ADD COLUMN `discount` DECIMAL(10, 2) NOT NULL DEFAULT 0.00 AFTER `total`,
  ADD CONSTRAINT `chk_payment_discount_non_negative` CHECK (`discount` >= 0);
