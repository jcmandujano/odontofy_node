-- Convierte user_concept.id a INT UNSIGNED para que coincida con el modelo Sequelize.
-- Ejecuta este script antes de crear treatment_plan_items.

-- 1) Revisa si ya existen foreign keys que apunten a user_concept.id.
-- Si esta consulta devuelve filas, primero hay que dropear esas FKs,
-- cambiar también las columnas hijas a INT UNSIGNED y luego recrearlas.
SELECT
  kcu.TABLE_NAME,
  kcu.COLUMN_NAME,
  kcu.CONSTRAINT_NAME
FROM information_schema.KEY_COLUMN_USAGE kcu
WHERE kcu.REFERENCED_TABLE_SCHEMA = DATABASE()
  AND kcu.REFERENCED_TABLE_NAME = 'user_concept'
  AND kcu.REFERENCED_COLUMN_NAME = 'id';

-- 2) Si la consulta anterior NO devuelve filas, este ALTER es suficiente.
ALTER TABLE `user_concept`
  MODIFY COLUMN `id` INT UNSIGNED NOT NULL AUTO_INCREMENT;

-- 3) En tu base ya existe esta FK:
-- payment_concept.conceptId -> user_concept.id
-- con nombre payment_concept_ibfk_2.
-- Si el ALTER simple del paso 2 falla por esa FK, ejecuta este bloque completo.

ALTER TABLE `payment_concept`
  DROP FOREIGN KEY `payment_concept_ibfk_2`;

ALTER TABLE `payment_concept`
  MODIFY COLUMN `conceptId` INT UNSIGNED NOT NULL;

ALTER TABLE `user_concept`
  MODIFY COLUMN `id` INT UNSIGNED NOT NULL AUTO_INCREMENT;

ALTER TABLE `payment_concept`
  ADD CONSTRAINT `payment_concept_ibfk_2`
  FOREIGN KEY (`conceptId`) REFERENCES `user_concept` (`id`)
  ON UPDATE CASCADE
  ON DELETE RESTRICT;
