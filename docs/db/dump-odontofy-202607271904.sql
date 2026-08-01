-- MySQL dump 10.13  Distrib 8.0.19, for Win64 (x86_64)
--
-- Host: localhost    Database: odontofy
-- ------------------------------------------------------
-- Server version	9.1.0

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `appointments`
--

DROP TABLE IF EXISTS `appointments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `appointments` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `patient_id` int NOT NULL,
  `appointment_datetime` datetime DEFAULT NULL,
  `appointment_end_datetime` datetime DEFAULT NULL,
  `note` text,
  `reason` text,
  `status` varchar(255) NOT NULL DEFAULT 'pendiente',
  `createdAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `google_event_id` varchar(100) DEFAULT NULL,
  `source` enum('local','google') NOT NULL DEFAULT 'local',
  `synced_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=23 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `appointments`
--

LOCK TABLES `appointments` WRITE;
/*!40000 ALTER TABLE `appointments` DISABLE KEYS */;
/*!40000 ALTER TABLE `appointments` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `concept`
--

DROP TABLE IF EXISTS `concept`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `concept` (
  `id` int NOT NULL AUTO_INCREMENT,
  `description` varchar(255) DEFAULT NULL,
  `unit_price` decimal(10,2) DEFAULT NULL,
  `createdAt` timestamp NULL DEFAULT NULL,
  `updatedAt` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=14 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `concept`
--

LOCK TABLES `concept` WRITE;
/*!40000 ALTER TABLE `concept` DISABLE KEYS */;
/*!40000 ALTER TABLE `concept` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `evolution_notes`
--

DROP TABLE IF EXISTS `evolution_notes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `evolution_notes` (
  `id` int NOT NULL AUTO_INCREMENT,
  `patient_id` int DEFAULT NULL,
  `treatment_plan_id` int unsigned DEFAULT NULL,
  `treatment_plan_item_id` int unsigned DEFAULT NULL,
  `note` text,
  `createdAt` timestamp NULL DEFAULT NULL,
  `updatedAt` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `fk_patient_id` (`patient_id`),
  KEY `idx_evolution_notes_treatment_plan` (`treatment_plan_id`,`createdAt`),
  KEY `idx_evolution_notes_treatment_plan_item` (`treatment_plan_item_id`,`createdAt`),
  CONSTRAINT `fk_evolution_notes_treatment_plan` FOREIGN KEY (`treatment_plan_id`) REFERENCES `treatment_plans` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_evolution_notes_treatment_plan_item` FOREIGN KEY (`treatment_plan_item_id`) REFERENCES `treatment_plan_items` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_patient_id` FOREIGN KEY (`patient_id`) REFERENCES `patients` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=18 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `evolution_notes`
--

LOCK TABLES `evolution_notes` WRITE;
/*!40000 ALTER TABLE `evolution_notes` DISABLE KEYS */;
INSERT INTO `evolution_notes` VALUES (16,34,3,6,'<p>Se termino la resina simple</p>','2026-07-21 02:01:44','2026-07-21 02:01:44'),(17,34,NULL,NULL,'<p>NAda que reportar</p>','2026-07-21 02:09:32','2026-07-21 02:09:32');
/*!40000 ALTER TABLE `evolution_notes` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `informed_consent`
--

DROP TABLE IF EXISTS `informed_consent`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `informed_consent` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(255) DEFAULT NULL,
  `description` varchar(255) DEFAULT NULL,
  `file_url` varchar(255) DEFAULT NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `informed_consent`
--

LOCK TABLES `informed_consent` WRITE;
/*!40000 ALTER TABLE `informed_consent` DISABLE KEYS */;
/*!40000 ALTER TABLE `informed_consent` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `password_resets`
--

DROP TABLE IF EXISTS `password_resets`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `password_resets` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `token` varchar(255) NOT NULL,
  `expires_at` datetime NOT NULL,
  `used` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `fk_password_resets_user` (`user_id`),
  KEY `idx_password_resets_token` (`token`),
  CONSTRAINT `fk_password_resets_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=12 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `password_resets`
--

LOCK TABLES `password_resets` WRITE;
/*!40000 ALTER TABLE `password_resets` DISABLE KEYS */;
/*!40000 ALTER TABLE `password_resets` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `patients`
--

DROP TABLE IF EXISTS `patients`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `patients` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int DEFAULT NULL,
  `name` varchar(100) DEFAULT NULL,
  `middle_name` varchar(100) DEFAULT NULL,
  `last_name` varchar(100) DEFAULT NULL,
  `gender` enum('MALE','FEMALE','OTHER') DEFAULT NULL,
  `date_of_birth` date DEFAULT NULL,
  `phone` varchar(30) DEFAULT NULL,
  `marital_status` enum('MARRIED','DIVORCED','NA','SEPARATED','SINGLE','COMMON LAW','WIDOWED') CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  `occupation` varchar(100) DEFAULT NULL,
  `address` varchar(200) DEFAULT NULL,
  `emergency_contact_name` varchar(100) DEFAULT NULL,
  `emergency_contact_phone` varchar(30) DEFAULT NULL,
  `emergency_contact_relationship` varchar(100) DEFAULT NULL,
  `reason_for_consultation` text,
  `rfc` varchar(30) DEFAULT NULL,
  `family_medical_history` text,
  `personal_medical_history` json DEFAULT NULL,
  `email` varchar(100) DEFAULT NULL,
  `status` tinyint(1) DEFAULT '1',
  `createdAt` timestamp NULL DEFAULT NULL,
  `updatedAt` timestamp NULL DEFAULT NULL,
  `debt` decimal(10,0) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `fk_user_id` (`user_id`),
  CONSTRAINT `fk_user_id` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=35 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `patients`
--

LOCK TABLES `patients` WRITE;
/*!40000 ALTER TABLE `patients` DISABLE KEYS */;
INSERT INTO `patients` VALUES (34,30,'Leon Felipe','Ruiz','Hernandez','MALE','2013-10-19','5578755588','NA','','','','','','','','\"\"','{\"ets\": {\"respuesta\": \"\", \"comentarios\": \"\"}, \"vih\": {\"respuesta\": \"\", \"comentarios\": \"\"}, \"asma\": {\"respuesta\": \"\", \"comentarios\": \"\"}, \"otros\": {\"comentarios\": \"\"}, \"alergias\": {\"respuesta\": \"\", \"comentarios\": \"\"}, \"diabetes\": {\"respuesta\": \"\", \"comentarios\": \"\"}, \"embarazo\": {\"respuesta\": \"\", \"comentarios\": \"\"}, \"tiroides\": {\"respuesta\": \"\", \"comentarios\": \"\"}, \"epilepsia\": {\"respuesta\": \"\", \"comentarios\": \"\"}, \"gastritis\": {\"respuesta\": \"\", \"comentarios\": \"\"}, \"hepatitis\": {\"respuesta\": \"\", \"comentarios\": \"\"}, \"consumeDrogas\": {\"respuesta\": \"\", \"comentarios\": \"\"}, \"ulceraGastrica\": {\"respuesta\": \"\", \"comentarios\": \"\"}, \"fiebreReumatica\": {\"respuesta\": \"\", \"comentarios\": \"\"}, \"problemaCorazon\": {\"respuesta\": \"\", \"comentarios\": \"\"}, \"problemasPresion\": {\"respuesta\": \"\", \"comentarios\": \"\"}, \"bajoTratamientoMedico\": {\"respuesta\": \"\", \"comentarios\": \"\"}, \"intervencionQuirurgica\": {\"respuesta\": \"\", \"comentarios\": \"\"}}','mail@mail.com',1,'2026-06-30 01:49:03','2026-06-30 01:49:03',0);
/*!40000 ALTER TABLE `patients` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `payment`
--

DROP TABLE IF EXISTS `payment`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `payment` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int DEFAULT NULL,
  `patientId` int DEFAULT NULL,
  `payment_date` date DEFAULT NULL,
  `income` decimal(10,2) DEFAULT NULL,
  `debt` decimal(10,2) DEFAULT NULL,
  `total` decimal(10,2) DEFAULT NULL,
  `createdAt` timestamp NULL DEFAULT NULL,
  `updatedAt` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `patientId` (`patientId`),
  KEY `fk_payment_user_id` (`user_id`),
  CONSTRAINT `payment_ibfk_1` FOREIGN KEY (`patientId`) REFERENCES `patients` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=37 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `payment`
--

LOCK TABLES `payment` WRITE;
/*!40000 ALTER TABLE `payment` DISABLE KEYS */;
INSERT INTO `payment` VALUES (36,30,34,'2026-07-14',700.00,0.00,700.00,'2026-07-14 23:55:35','2026-07-14 23:55:35');
/*!40000 ALTER TABLE `payment` ENABLE KEYS */;
UNLOCK TABLES;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 DEFINER=`root`@`%`*/ /*!50003 TRIGGER `after_payment_insert` AFTER INSERT ON `payment` FOR EACH ROW BEGIN
    UPDATE `patients`
    SET `debt` = (SELECT SUM(`debt`) FROM `payment` WHERE `patientId` = NEW.`patientId`)
    WHERE `id` = NEW.`patientId`;
END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 DEFINER=`root`@`%`*/ /*!50003 TRIGGER `after_payment_update` AFTER UPDATE ON `payment` FOR EACH ROW BEGIN
    UPDATE `patients`
    SET `debt` = (SELECT SUM(`debt`) FROM `payment` WHERE `patientId` = NEW.`patientId`)
    WHERE `id` = NEW.`patientId`;
END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 DEFINER=`root`@`%`*/ /*!50003 TRIGGER `after_payment_delete` AFTER DELETE ON `payment` FOR EACH ROW BEGIN
    UPDATE `patients`
    SET `debt` = (SELECT SUM(`debt`) FROM `payment` WHERE `patientId` = OLD.`patientId`)
    WHERE `id` = OLD.`patientId`;
END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;

--
-- Table structure for table `payment_concept`
--

DROP TABLE IF EXISTS `payment_concept`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `payment_concept` (
  `id` int NOT NULL AUTO_INCREMENT,
  `paymentId` int NOT NULL,
  `conceptId` int unsigned NOT NULL,
  `quantity` int DEFAULT NULL,
  `paymentMethod` enum('CASH','DEBIT','CREDIT','TRANSFERENCE') DEFAULT 'CASH',
  `createdAt` timestamp NULL DEFAULT NULL,
  `updatedAt` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`,`paymentId`),
  KEY `paymentId` (`paymentId`),
  KEY `conceptId` (`conceptId`),
  CONSTRAINT `payment_concept_ibfk_1` FOREIGN KEY (`paymentId`) REFERENCES `payment` (`id`),
  CONSTRAINT `payment_concept_ibfk_2` FOREIGN KEY (`conceptId`) REFERENCES `user_concept` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=43 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `payment_concept`
--

LOCK TABLES `payment_concept` WRITE;
/*!40000 ALTER TABLE `payment_concept` DISABLE KEYS */;
INSERT INTO `payment_concept` VALUES (42,36,20,1,'CASH','2026-07-14 23:55:35','2026-07-14 23:55:35');
/*!40000 ALTER TABLE `payment_concept` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `signed_consent`
--

DROP TABLE IF EXISTS `signed_consent`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `signed_consent` (
  `id` int NOT NULL AUTO_INCREMENT,
  `consent_id` int unsigned NOT NULL,
  `patient_id` int NOT NULL,
  `doctor_id` int NOT NULL,
  `signed_date` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `file_url` varchar(255) DEFAULT NULL,
  `createdAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `consent_id` (`consent_id`),
  KEY `patient_id` (`patient_id`),
  KEY `doctor_id` (`doctor_id`),
  CONSTRAINT `signed_consent_ibfk_1` FOREIGN KEY (`consent_id`) REFERENCES `user_informed_consent` (`id`) ON DELETE CASCADE,
  CONSTRAINT `signed_consent_ibfk_2` FOREIGN KEY (`patient_id`) REFERENCES `patients` (`id`) ON DELETE CASCADE,
  CONSTRAINT `signed_consent_ibfk_3` FOREIGN KEY (`doctor_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `signed_consent`
--

LOCK TABLES `signed_consent` WRITE;
/*!40000 ALTER TABLE `signed_consent` DISABLE KEYS */;
/*!40000 ALTER TABLE `signed_consent` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `tokens`
--

DROP TABLE IF EXISTS `tokens`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tokens` (
  `id` int NOT NULL AUTO_INCREMENT,
  `userId` int DEFAULT NULL,
  `token` varchar(150) DEFAULT NULL,
  `createdAt` timestamp NULL DEFAULT NULL,
  `updatedAt` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=19 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tokens`
--

LOCK TABLES `tokens` WRITE;
/*!40000 ALTER TABLE `tokens` DISABLE KEYS */;
INSERT INTO `tokens` VALUES (18,30,'7f165207b54b833d3cebe421da40f424','2026-06-06 21:13:13','2026-06-06 21:13:13');
/*!40000 ALTER TABLE `tokens` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `treatment_plan_items`
--

DROP TABLE IF EXISTS `treatment_plan_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `treatment_plan_items` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `treatment_plan_id` int unsigned NOT NULL,
  `user_concept_id` int unsigned DEFAULT NULL,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `tooth` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `area` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `quantity` decimal(10,2) NOT NULL DEFAULT '1.00',
  `unit_price` decimal(10,2) NOT NULL DEFAULT '0.00',
  `subtotal` decimal(10,2) NOT NULL DEFAULT '0.00',
  `phase` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `priority` enum('LOW','MEDIUM','HIGH','URGENT') COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` enum('PENDING','APPROVED','IN_PROGRESS','COMPLETED','CANCELLED') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'PENDING',
  `notes` text COLLATE utf8mb4_unicode_ci,
  `sort_order` int NOT NULL DEFAULT '0',
  `completed_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_treatment_plan_items_plan_sort` (`treatment_plan_id`,`sort_order`),
  KEY `idx_treatment_plan_items_status` (`status`),
  KEY `idx_treatment_plan_items_user_concept` (`user_concept_id`),
  CONSTRAINT `fk_treatment_plan_items_plan` FOREIGN KEY (`treatment_plan_id`) REFERENCES `treatment_plans` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_treatment_plan_items_user_concept` FOREIGN KEY (`user_concept_id`) REFERENCES `user_concept` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `chk_treatment_plan_items_quantity_positive` CHECK ((`quantity` > 0)),
  CONSTRAINT `chk_treatment_plan_items_subtotal_nonnegative` CHECK ((`subtotal` >= 0)),
  CONSTRAINT `chk_treatment_plan_items_unit_price_nonnegative` CHECK ((`unit_price` >= 0))
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `treatment_plan_items`
--

LOCK TABLES `treatment_plan_items` WRITE;
/*!40000 ALTER TABLE `treatment_plan_items` DISABLE KEYS */;
INSERT INTO `treatment_plan_items` VALUES (1,1,NULL,'Limpieza dental','Profilaxis dental básica',NULL,NULL,1.00,600.00,600.00,NULL,NULL,'PENDING',NULL,0,NULL,'2026-06-30 02:16:14','2026-06-30 02:16:14'),(2,1,NULL,'Resina dental','Restauración con resina','36','Oclusal',2.00,850.00,1700.00,'Fase 1','HIGH','PENDING','Paciente refiere sensibilidad',0,NULL,'2026-06-30 02:17:15','2026-06-30 02:17:15'),(3,2,27,'Resina simple','Resina en molar derecho','a','a',1.00,900.00,900.00,'a','LOW','COMPLETED','Se lo hara despues de vacaciones',0,'2026-07-14 01:45:43','2026-07-10 01:32:52','2026-07-14 01:45:43'),(4,2,20,'Consulta de primera vez','demo','a1','1',1.00,700.00,700.00,'na','LOW','PENDING','demo',0,NULL,'2026-07-14 01:44:59','2026-07-14 01:44:59'),(5,2,23,'Limpieza dental (Profilaxis)',NULL,NULL,NULL,1.00,800.00,800.00,NULL,'LOW','PENDING',NULL,0,NULL,'2026-07-14 01:45:26','2026-07-14 01:45:26'),(6,3,27,'Resina simple',NULL,NULL,NULL,1.00,900.00,900.00,NULL,NULL,'COMPLETED',NULL,0,'2026-07-21 02:01:44','2026-07-15 02:09:54','2026-07-21 02:01:44'),(7,3,21,'Consulta de seguimiento',NULL,NULL,NULL,1.00,0.00,0.00,NULL,NULL,'PENDING',NULL,0,'2026-07-15 02:32:00','2026-07-15 02:21:08','2026-07-21 02:01:03');
/*!40000 ALTER TABLE `treatment_plan_items` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `treatment_plans`
--

DROP TABLE IF EXISTS `treatment_plans`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `treatment_plans` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `patient_id` int NOT NULL,
  `title` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `diagnosis` text COLLATE utf8mb4_unicode_ci,
  `patient_complaint` text COLLATE utf8mb4_unicode_ci,
  `clinical_observations` text COLLATE utf8mb4_unicode_ci,
  `prognosis` text COLLATE utf8mb4_unicode_ci,
  `status` enum('DRAFT','PROPOSED','ACCEPTED','IN_PROGRESS','COMPLETED','CANCELLED') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'DRAFT',
  `estimated_start_date` datetime DEFAULT NULL,
  `estimated_end_date` datetime DEFAULT NULL,
  `accepted_at` datetime DEFAULT NULL,
  `rejected_at` datetime DEFAULT NULL,
  `acceptance_notes` text COLLATE utf8mb4_unicode_ci,
  `subtotal` decimal(10,2) NOT NULL DEFAULT '0.00',
  `discount` decimal(10,2) NOT NULL DEFAULT '0.00',
  `total` decimal(10,2) NOT NULL DEFAULT '0.00',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_treatment_plans_user_patient` (`user_id`,`patient_id`),
  KEY `idx_treatment_plans_patient_created` (`patient_id`,`created_at`),
  KEY `idx_treatment_plans_status` (`status`),
  CONSTRAINT `fk_treatment_plans_patient` FOREIGN KEY (`patient_id`) REFERENCES `patients` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_treatment_plans_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `chk_treatment_plans_discount_nonnegative` CHECK ((`discount` >= 0)),
  CONSTRAINT `chk_treatment_plans_subtotal_nonnegative` CHECK ((`subtotal` >= 0))
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `treatment_plans`
--

LOCK TABLES `treatment_plans` WRITE;
/*!40000 ALTER TABLE `treatment_plans` DISABLE KEYS */;
INSERT INTO `treatment_plans` VALUES (1,30,34,'Plan inicial de tratamiento',NULL,NULL,NULL,NULL,NULL,'CANCELLED',NULL,NULL,NULL,'2026-07-10 01:43:35',NULL,2300.00,0.00,2300.00,'2026-06-30 02:08:22','2026-07-10 01:43:35'),(2,30,34,'Demo','demo','madawdawdaw','awdaw','awdawd','aw awd awd','ACCEPTED','2026-07-23 00:00:00','2026-11-24 00:00:00','2026-07-14 01:32:35',NULL,NULL,2400.00,0.00,2400.00,'2026-07-10 01:22:14','2026-07-14 01:46:27'),(3,30,34,'Plan de Leon Felipe','Le urge termino de tx por posible cirugia ortopedica','Periodontitis cronica generalizada con caries en OD 21,22, 23 y destruccio coronaria del od 45','Quiero arreglarme mis dientes','Paciente se observa cooperador','Reservado a evolucion','COMPLETED','2026-07-30 00:00:00',NULL,'2026-07-15 02:08:38',NULL,NULL,900.00,15.00,885.00,'2026-07-15 02:08:10','2026-07-21 01:47:57');
/*!40000 ALTER TABLE `treatment_plans` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `user_concept`
--

DROP TABLE IF EXISTS `user_concept`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_concept` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `concept_id` int DEFAULT NULL,
  `description` varchar(255) DEFAULT NULL,
  `unit_price` decimal(10,2) DEFAULT NULL,
  `is_custom` tinyint(1) DEFAULT '0',
  `createdAt` timestamp NULL DEFAULT NULL,
  `updatedAt` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  KEY `concept_id` (`concept_id`),
  CONSTRAINT `user_concept_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `user_concept_ibfk_2` FOREIGN KEY (`concept_id`) REFERENCES `concept` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=38 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `user_concept`
--

LOCK TABLES `user_concept` WRITE;
/*!40000 ALTER TABLE `user_concept` DISABLE KEYS */;
INSERT INTO `user_concept` VALUES (20,30,NULL,'Consulta de primera vez',700.00,1,'2026-07-10 01:25:52','2026-07-10 01:25:52'),(21,30,NULL,'Consulta de seguimiento',500.00,1,'2026-07-10 01:26:01','2026-07-10 01:26:01'),(22,30,NULL,'Valoración odontológica',500.00,1,'2026-07-10 01:26:12','2026-07-10 01:26:12'),(23,30,NULL,'Limpieza dental (Profilaxis)',800.00,1,'2026-07-10 01:26:22','2026-07-10 01:26:22'),(24,30,NULL,'Aplicación de flúor',450.00,1,'2026-07-10 01:26:30','2026-07-10 01:26:30'),(25,30,NULL,'Selladores de fosetas y fisuras',700.00,1,'2026-07-10 01:26:39','2026-07-10 01:26:39'),(26,30,NULL,'Radiografía periapical',180.00,1,'2026-07-10 01:26:48','2026-07-10 01:26:48'),(27,30,NULL,'Resina simple',900.00,1,'2026-07-10 01:29:59','2026-07-10 01:29:59'),(28,30,NULL,'Resina compuesta',1200.00,1,'2026-07-10 01:30:10','2026-07-10 01:30:10'),(29,30,NULL,'Extracción simple',1200.00,1,'2026-07-10 01:30:22','2026-07-10 01:30:22'),(30,30,NULL,'Extracción quirúrgica',2800.00,1,'2026-07-10 01:30:30','2026-07-10 01:30:30'),(31,30,NULL,'Endodoncia molar',4800.00,1,'2026-07-10 01:30:44','2026-07-10 01:30:44'),(32,30,NULL,'Corona de porcelana',7000.00,1,'2026-07-10 01:30:50','2026-07-10 01:30:50'),(33,30,NULL,'Blanqueamiento dental',4500.00,1,'2026-07-10 01:30:58','2026-07-10 01:30:58'),(34,30,NULL,'Guarda oclusal',2500.00,1,'2026-07-10 01:31:27','2026-07-10 01:31:27'),(35,30,NULL,'Ortodoncia (Ajuste mensual)',900.00,1,'2026-07-10 01:31:35','2026-07-10 01:31:35'),(36,30,NULL,'Implante dental',18000.00,1,'2026-07-10 01:31:43','2026-07-10 01:31:43'),(37,30,NULL,'Urgencia odontológica',1000.00,1,'2026-07-10 01:31:51','2026-07-10 01:31:51');
/*!40000 ALTER TABLE `user_concept` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `user_informed_consent`
--

DROP TABLE IF EXISTS `user_informed_consent`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_informed_consent` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `informed_consent_id` int DEFAULT NULL,
  `name` varchar(255) DEFAULT NULL,
  `description` varchar(255) DEFAULT NULL,
  `file_url` varchar(255) DEFAULT NULL,
  `is_custom` tinyint(1) DEFAULT '0',
  `createdAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `user_informed_consent`
--

LOCK TABLES `user_informed_consent` WRITE;
/*!40000 ALTER TABLE `user_informed_consent` DISABLE KEYS */;
/*!40000 ALTER TABLE `user_informed_consent` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(100) DEFAULT NULL,
  `middle_name` varchar(100) DEFAULT NULL,
  `last_name` varchar(100) DEFAULT NULL,
  `date_of_birth` date DEFAULT NULL,
  `phone` varchar(30) DEFAULT NULL,
  `avatar` varchar(255) DEFAULT NULL,
  `email` varchar(100) DEFAULT NULL,
  `password` varchar(150) DEFAULT NULL,
  `status` tinyint(1) DEFAULT '1',
  `createdAt` timestamp NULL DEFAULT NULL,
  `updatedAt` timestamp NULL DEFAULT NULL,
  `show_finance_stats` tinyint(1) DEFAULT '0',
  `google_access_token` varchar(280) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  `google_refresh_token` varchar(120) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  `google_token_expiry_date` date DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=31 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users`
--

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
INSERT INTO `users` VALUES (30,'Juan Carlos','Mandujano','Villalobos','1990-06-15','5578756266','','carlosmandujano.v@gmail.com','$2a$10$2Yw6Tbw4ZLeHYv7xzThRT.OmeNnSU4krU4EHw7qZ5fso0iKl0LFuy',1,'2026-06-06 21:13:13','2026-07-10 01:59:29',1,NULL,NULL,NULL);
/*!40000 ALTER TABLE `users` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping routines for database 'odontofy'
--
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-07-27 19:04:21
