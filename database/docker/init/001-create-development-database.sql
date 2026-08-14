CREATE DATABASE IF NOT EXISTS `odontofy_dev`
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_0900_ai_ci;

GRANT ALL PRIVILEGES ON `odontofy_dev`.* TO 'odontofy_local'@'%';
