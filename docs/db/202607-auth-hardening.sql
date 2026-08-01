-- Apply once per environment. Existing confirmation/reset links are invalidated deliberately.
CREATE TABLE IF NOT EXISTS `auth_sessions` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `token_hash` varchar(64) NOT NULL,
  `family_id` varchar(36) NOT NULL,
  `expires_at` datetime NOT NULL,
  `revoked_at` datetime DEFAULT NULL,
  `user_agent` varchar(512) DEFAULT NULL,
  `ip_address` varchar(64) DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_auth_sessions_token_hash` (`token_hash`),
  KEY `idx_auth_sessions_user_active` (`user_id`, `revoked_at`),
  KEY `idx_auth_sessions_family` (`family_id`),
  CONSTRAINT `fk_auth_sessions_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `oauth_states` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `state_hash` varchar(64) NOT NULL,
  `expires_at` datetime NOT NULL,
  `used_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_oauth_states_hash` (`state_hash`),
  KEY `idx_oauth_states_user` (`user_id`),
  CONSTRAINT `fk_oauth_states_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Legacy one-time tokens were stored in plaintext and had no reliable expiry.
DELETE FROM `tokens`;
ALTER TABLE `tokens` MODIFY `token` varchar(64) NOT NULL;
ALTER TABLE `tokens` ADD COLUMN `expiresAt` datetime NOT NULL AFTER `token`;

-- Existing reset links are invalidated because future values are SHA-256 hashes.
DELETE FROM `password_resets`;
ALTER TABLE `password_resets` MODIFY `token` varchar(64) NOT NULL;
