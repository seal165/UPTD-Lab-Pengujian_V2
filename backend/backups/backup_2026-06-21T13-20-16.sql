/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

# ------------------------------------------------------------
# SCHEMA DUMP FOR TABLE: activities
# ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS `activities` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int DEFAULT NULL,
  `activity_name` varchar(255) DEFAULT NULL,
  `ip_address` varchar(45) DEFAULT NULL,
  `user_agent` text,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `activities_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE
  SET
  NULL
) ENGINE = InnoDB AUTO_INCREMENT = 398 DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;

# ------------------------------------------------------------
# SCHEMA DUMP FOR TABLE: jadwal_sibuk
# ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS `jadwal_sibuk` (
  `id` int NOT NULL AUTO_INCREMENT,
  `keterangan` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `tanggal_mulai` date NOT NULL,
  `tanggal_selesai` date NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `created_by` int DEFAULT NULL,
  `updated_by` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_tanggal` (`tanggal_mulai`, `tanggal_selesai`)
) ENGINE = InnoDB AUTO_INCREMENT = 2 DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

# ------------------------------------------------------------
# SCHEMA DUMP FOR TABLE: kuisioner
# ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS `kuisioner` (
  `id` int NOT NULL AUTO_INCREMENT,
  `submission_id` int NOT NULL,
  `skor_1` tinyint DEFAULT NULL,
  `skor_2` tinyint DEFAULT NULL,
  `skor_3` tinyint DEFAULT NULL,
  `skor_4` tinyint DEFAULT NULL,
  `skor_5` tinyint DEFAULT NULL,
  `skor_6` tinyint DEFAULT NULL,
  `skor_7` tinyint DEFAULT NULL,
  `skor_8` tinyint DEFAULT NULL,
  `skor_9` tinyint DEFAULT NULL,
  `skor_10` tinyint DEFAULT NULL,
  `saran` text,
  `jawaban_json` json DEFAULT NULL,
  `pertanyaan_json` json DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `submission_id` (`submission_id`),
  CONSTRAINT `kuisioner_ibfk_1` FOREIGN KEY (`submission_id`) REFERENCES `submissions` (`id`) ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;

# ------------------------------------------------------------
# SCHEMA DUMP FOR TABLE: kuisioner_backup
# ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS `kuisioner_backup` (
  `id` int NOT NULL DEFAULT '0',
  `submission_id` int NOT NULL,
  `skor_1` tinyint DEFAULT NULL,
  `skor_2` tinyint DEFAULT NULL,
  `skor_3` tinyint DEFAULT NULL,
  `skor_4` tinyint DEFAULT NULL,
  `skor_5` tinyint DEFAULT NULL,
  `skor_6` tinyint DEFAULT NULL,
  `skor_7` tinyint DEFAULT NULL,
  `skor_8` tinyint DEFAULT NULL,
  `skor_9` tinyint DEFAULT NULL,
  `skor_10` tinyint DEFAULT NULL,
  `saran` text,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;

# ------------------------------------------------------------
# SCHEMA DUMP FOR TABLE: kuisioner_questions
# ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS `kuisioner_questions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `question_text` text NOT NULL,
  `urutan` int DEFAULT '0',
  PRIMARY KEY (`id`)
) ENGINE = InnoDB AUTO_INCREMENT = 13 DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;

# ------------------------------------------------------------
# SCHEMA DUMP FOR TABLE: payments
# ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS `payments` (
  `id` int NOT NULL AUTO_INCREMENT,
  `submission_id` int NOT NULL,
  `no_invoice` varchar(100) NOT NULL,
  `total_tagihan` decimal(15, 2) DEFAULT '0.00',
  `jumlah_dibayar` decimal(15, 2) DEFAULT '0.00',
  `sisa_tagihan` decimal(15, 2) GENERATED ALWAYS AS ((`total_tagihan` - `jumlah_dibayar`)) STORED,
  `status_pembayaran` enum(
  'Menunggu Verifikasi',
  'Pengecekan Sampel',
  'Belum Bayar',
  'Menunggu SKRD Upload',
  'Belum Lunas',
  'Lunas',
  'Sedang Diuji',
  'Selesai',
  'Dibatalkan'
  ) DEFAULT 'Belum Bayar',
  `bukti_pembayaran_1` varchar(255) DEFAULT NULL,
  `bukti_pembayaran_2` varchar(255) DEFAULT NULL,
  `bukti_pembayaran_1_uploaded_at` datetime DEFAULT NULL,
  `bukti_pembayaran_2_uploaded_at` datetime DEFAULT NULL,
  `skrd_file` varchar(255) DEFAULT NULL,
  `skrd_filename` varchar(255) DEFAULT NULL,
  `skrd_uploaded_at` datetime DEFAULT NULL,
  `skrd_uploaded_by` int DEFAULT NULL,
  `bukti_pembayaran_notes` text,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `submission_id` (`submission_id`),
  CONSTRAINT `payments_ibfk_1` FOREIGN KEY (`submission_id`) REFERENCES `submissions` (`id`) ON DELETE CASCADE
) ENGINE = InnoDB AUTO_INCREMENT = 11 DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;

# ------------------------------------------------------------
# SCHEMA DUMP FOR TABLE: services
# ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS `services` (
  `id` int NOT NULL AUTO_INCREMENT,
  `category_id` int NOT NULL,
  `test_type_id` int NOT NULL,
  `service_name` varchar(255) NOT NULL,
  `min_sample` varchar(100) DEFAULT NULL,
  `satuan` varchar(50) DEFAULT 'sample',
  `duration_days` int DEFAULT NULL COMMENT 'Estimasi hari pengerjaan',
  `price` decimal(15, 2) NOT NULL DEFAULT '0.00',
  `method` varchar(255) DEFAULT NULL COMMENT 'Metode pengujian (SNI, dll)',
  `kan` enum('Ya', 'Tidak') DEFAULT 'Tidak',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `category_id` (`category_id`),
  KEY `idx_test_type_id` (`test_type_id`),
  CONSTRAINT `fk_services_test_type` FOREIGN KEY (`test_type_id`) REFERENCES `test_types` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `services_ibfk_1` FOREIGN KEY (`category_id`) REFERENCES `test_categories` (`id`) ON DELETE CASCADE
) ENGINE = InnoDB AUTO_INCREMENT = 33 DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;

# ------------------------------------------------------------
# SCHEMA DUMP FOR TABLE: settings
# ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS `settings` (
  `id` int NOT NULL AUTO_INCREMENT,
  `setting_key` varchar(100) NOT NULL,
  `setting_value` text,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `setting_key` (`setting_key`)
) ENGINE = InnoDB AUTO_INCREMENT = 2 DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;

# ------------------------------------------------------------
# SCHEMA DUMP FOR TABLE: submission_samples
# ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS `submission_samples` (
  `id` int NOT NULL AUTO_INCREMENT,
  `submission_id` int NOT NULL,
  `jenis_sample` varchar(255) DEFAULT NULL COMMENT 'Jenis sample uji (misal: Beton, Aspal, Tanah)',
  `nama_identitas_sample` varchar(255) DEFAULT NULL COMMENT 'Nama/identitas spesifik sample',
  `jumlah_sample_angka` int NOT NULL DEFAULT '1',
  `jumlah_sample_satuan` enum(
  'Buah',
  'Kilogram',
  'sample',
  'Titik',
  'Liter',
  'Meter'
  ) DEFAULT 'sample',
  `tanggal_pengambilan` date DEFAULT NULL,
  `kemasan_sample` varchar(100) DEFAULT NULL,
  `asal_sample` varchar(255) DEFAULT NULL,
  `sample_diambil_oleh` enum('Pelanggan', 'Laboratorium', 'Pihak Ketiga') DEFAULT 'Pelanggan',
  `test_type_id` int NOT NULL,
  `test_category_id` int NOT NULL,
  `service_id` int NOT NULL,
  `price_at_time` decimal(15, 2) NOT NULL,
  `method_at_time` varchar(255) DEFAULT NULL,
  `estimasi_selesai` date DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `submission_id` (`submission_id`),
  KEY `test_type_id` (`test_type_id`),
  KEY `test_category_id` (`test_category_id`),
  KEY `service_id` (`service_id`),
  CONSTRAINT `submission_samples_ibfk_1` FOREIGN KEY (`submission_id`) REFERENCES `submissions` (`id`) ON DELETE CASCADE,
  CONSTRAINT `submission_samples_ibfk_2` FOREIGN KEY (`test_type_id`) REFERENCES `test_types` (`id`),
  CONSTRAINT `submission_samples_ibfk_3` FOREIGN KEY (`test_category_id`) REFERENCES `test_categories` (`id`),
  CONSTRAINT `submission_samples_ibfk_4` FOREIGN KEY (`service_id`) REFERENCES `services` (`id`)
) ENGINE = InnoDB AUTO_INCREMENT = 11 DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;

# ------------------------------------------------------------
# SCHEMA DUMP FOR TABLE: submissions
# ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS `submissions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `no_permohonan` varchar(100) DEFAULT NULL COMMENT 'Nomor surat permohonan dari perusahaan',
  `nama_pemohon` varchar(255) NOT NULL,
  `nama_instansi` varchar(255) NOT NULL,
  `alamat_pemohon` text,
  `nomor_telepon` varchar(20) DEFAULT NULL,
  `email_pemohon` varchar(100) DEFAULT NULL,
  `nama_proyek` varchar(255) NOT NULL,
  `lokasi_proyek` varchar(255) DEFAULT NULL,
  `file_surat_permohonan` varchar(255) DEFAULT NULL,
  `file_ktp` varchar(255) DEFAULT NULL,
  `catatan_tambahan` varchar(250) DEFAULT NULL,
  `catatan_admin` text,
  `jadwal_sampling` date DEFAULT NULL,
  `status` enum(
  'Menunggu Verifikasi',
  'Pengecekan Sampel',
  'Belum Bayar',
  'Menunggu SKRD Upload',
  'Belum Lunas',
  'Lunas',
  'Sedang Diuji',
  'Selesai',
  'Dibatalkan'
  ) DEFAULT 'Menunggu Verifikasi',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  KEY `idx_jadwal_sampling` (`jadwal_sampling`),
  CONSTRAINT `submissions_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE = InnoDB AUTO_INCREMENT = 11 DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;

# ------------------------------------------------------------
# SCHEMA DUMP FOR TABLE: test_categories
# ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS `test_categories` (
  `id` int NOT NULL AUTO_INCREMENT,
  `test_type_id` int NOT NULL,
  `category_name` varchar(100) NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `test_type_id` (`test_type_id`),
  CONSTRAINT `test_categories_ibfk_1` FOREIGN KEY (`test_type_id`) REFERENCES `test_types` (`id`) ON DELETE CASCADE
) ENGINE = InnoDB AUTO_INCREMENT = 7 DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;

# ------------------------------------------------------------
# SCHEMA DUMP FOR TABLE: test_reports
# ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS `test_reports` (
  `id` int NOT NULL AUTO_INCREMENT,
  `submission_id` int NOT NULL,
  `file_laporan` varchar(255) DEFAULT NULL,
  `no_laporan` varchar(100) DEFAULT NULL,
  `tanggal_selesai` date DEFAULT NULL,
  `catatan_laporan` text,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `submission_id` (`submission_id`),
  CONSTRAINT `test_reports_ibfk_1` FOREIGN KEY (`submission_id`) REFERENCES `submissions` (`id`) ON DELETE CASCADE
) ENGINE = InnoDB AUTO_INCREMENT = 2 DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;

# ------------------------------------------------------------
# SCHEMA DUMP FOR TABLE: test_types
# ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS `test_types` (
  `id` int NOT NULL AUTO_INCREMENT,
  `type_name` varchar(100) NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE = InnoDB AUTO_INCREMENT = 3 DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;

# ------------------------------------------------------------
# SCHEMA DUMP FOR TABLE: users
# ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS `users` (
  `id` int NOT NULL AUTO_INCREMENT,
  `email` varchar(100) NOT NULL,
  `password` varchar(255) NOT NULL,
  `role` enum('admin', 'petugas', 'pelanggan') DEFAULT 'pelanggan',
  `full_name` varchar(100) NOT NULL,
  `nama_instansi` varchar(255) DEFAULT NULL,
  `alamat` text,
  `nomor_telepon` varchar(20) DEFAULT NULL,
  `avatar` varchar(255) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`)
) ENGINE = InnoDB AUTO_INCREMENT = 8 DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;

# ------------------------------------------------------------
# DATA DUMP FOR TABLE: activities
# ------------------------------------------------------------

INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (
    1,
    NULL,
    'register',
    NULL,
    NULL,
    '2026-02-28 16:06:04'
  );
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (2, 1, 'register', NULL, NULL, '2026-02-28 17:19:57');
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (3, 1, 'login', NULL, NULL, '2026-02-28 17:38:57');
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (4, 1, 'login', NULL, NULL, '2026-02-28 17:41:06');
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (5, 1, 'login', NULL, NULL, '2026-02-28 17:46:32');
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (6, 1, 'login', NULL, NULL, '2026-03-01 05:28:48');
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (7, 1, 'login', NULL, NULL, '2026-03-01 05:29:31');
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (8, 1, 'login', NULL, NULL, '2026-03-01 05:48:46');
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (9, 1, 'login', NULL, NULL, '2026-03-01 15:33:23');
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (10, 1, 'login', NULL, NULL, '2026-03-01 15:57:03');
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (11, 1, 'login', NULL, NULL, '2026-03-01 15:59:37');
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (12, 1, 'login', NULL, NULL, '2026-03-01 16:04:54');
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (13, 1, 'login', NULL, NULL, '2026-03-01 16:05:06');
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (14, 1, 'login', NULL, NULL, '2026-03-01 16:06:12');
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (15, 1, 'login', NULL, NULL, '2026-03-01 16:08:19');
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (16, 1, 'login', NULL, NULL, '2026-03-01 16:12:27');
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (17, 1, 'login', NULL, NULL, '2026-03-01 16:14:09');
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (18, 1, 'login', NULL, NULL, '2026-03-01 16:15:04');
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (19, 1, 'login', NULL, NULL, '2026-03-01 16:18:23');
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (20, 1, 'login', NULL, NULL, '2026-03-01 16:20:50');
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (21, 1, 'login', NULL, NULL, '2026-03-01 16:24:21');
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (22, 1, 'login', NULL, NULL, '2026-03-01 16:24:59');
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (23, 1, 'login', NULL, NULL, '2026-03-01 16:25:34');
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (24, 1, 'login', NULL, NULL, '2026-03-01 16:59:56');
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (25, 1, 'login', NULL, NULL, '2026-03-01 17:29:25');
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (26, 1, 'login', NULL, NULL, '2026-03-01 17:30:04');
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (27, 1, 'login', NULL, NULL, '2026-03-01 17:41:19');
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (28, 1, 'login', NULL, NULL, '2026-03-01 17:42:53');
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (29, 1, 'login', NULL, NULL, '2026-03-01 17:49:51');
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (30, 1, 'login', NULL, NULL, '2026-03-01 17:51:30');
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (31, 1, 'login', NULL, NULL, '2026-03-01 22:32:02');
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (32, 1, 'login', NULL, NULL, '2026-03-02 01:46:24');
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (33, 1, 'login', NULL, NULL, '2026-03-02 01:52:46');
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (34, 1, 'login', NULL, NULL, '2026-03-02 01:57:30');
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (
    35,
    1,
    'create_submission',
    NULL,
    NULL,
    '2026-03-02 02:09:39'
  );
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (36, 1, 'login', NULL, NULL, '2026-03-02 02:15:45');
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (
    37,
    1,
    'create_submission',
    NULL,
    NULL,
    '2026-03-02 02:17:37'
  );
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (38, 1, 'login', NULL, NULL, '2026-03-02 02:27:32');
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (39, 1, 'login', NULL, NULL, '2026-03-02 02:32:56');
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (40, 1, 'login', NULL, NULL, '2026-03-02 02:38:03');
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (41, 1, 'login', NULL, NULL, '2026-03-02 02:47:31');
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (42, 1, 'login', NULL, NULL, '2026-03-02 02:54:18');
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (43, 1, 'login', NULL, NULL, '2026-03-02 02:59:17');
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (44, 1, 'login', NULL, NULL, '2026-03-02 02:59:40');
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (45, 1, 'login', NULL, NULL, '2026-03-02 03:00:04');
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (46, 1, 'login', NULL, NULL, '2026-03-02 16:38:18');
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (47, 1, 'login', NULL, NULL, '2026-03-02 19:39:19');
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (
    48,
    1,
    'create_submission',
    NULL,
    NULL,
    '2026-03-02 19:42:16'
  );
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (49, 1, 'login', NULL, NULL, '2026-03-02 19:44:55');
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (50, 1, 'login', NULL, NULL, '2026-03-02 20:11:22');
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (
    51,
    1,
    'create_submission',
    NULL,
    NULL,
    '2026-03-02 20:12:55'
  );
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (52, 1, 'login', NULL, NULL, '2026-03-03 11:16:40');
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (
    53,
    1,
    'create_submission',
    NULL,
    NULL,
    '2026-03-03 11:17:53'
  );
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (54, 1, 'login', NULL, NULL, '2026-03-03 11:28:18');
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (55, 1, 'login', NULL, NULL, '2026-03-03 11:31:03');
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (
    56,
    1,
    'create_submission',
    NULL,
    NULL,
    '2026-03-03 11:31:49'
  );
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (57, 1, 'login', NULL, NULL, '2026-03-03 11:34:31');
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (
    58,
    1,
    'create_submission',
    NULL,
    NULL,
    '2026-03-03 11:36:34'
  );
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (59, 1, 'login', NULL, NULL, '2026-03-03 11:40:44');
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (
    60,
    1,
    'create_submission',
    NULL,
    NULL,
    '2026-03-03 11:41:14'
  );
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (61, 1, 'login', NULL, NULL, '2026-03-03 11:44:21');
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (
    62,
    1,
    'create_submission',
    NULL,
    NULL,
    '2026-03-03 11:45:02'
  );
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (63, 1, 'login', NULL, NULL, '2026-03-03 16:06:38');
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (64, 1, 'login', NULL, NULL, '2026-03-03 16:09:15');
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (65, 1, 'login', NULL, NULL, '2026-03-03 16:21:33');
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (66, 1, 'login', NULL, NULL, '2026-03-03 23:22:30');
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (67, 1, 'login', NULL, NULL, '2026-03-03 23:32:08');
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (68, 1, 'login', NULL, NULL, '2026-03-03 23:32:43');
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (69, 1, 'login', NULL, NULL, '2026-03-03 23:33:15');
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (70, 1, 'login', NULL, NULL, '2026-03-03 23:36:40');
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (71, 1, 'login', NULL, NULL, '2026-03-03 23:39:09');
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (72, 1, 'login', NULL, NULL, '2026-03-03 23:47:12');
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (73, 1, 'login', NULL, NULL, '2026-03-03 23:59:28');
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (74, 1, 'login', NULL, NULL, '2026-03-04 00:02:05');
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (75, 1, 'login', NULL, NULL, '2026-03-04 00:15:38');
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (76, 1, 'login', NULL, NULL, '2026-03-04 10:51:43');
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (77, 1, 'login', NULL, NULL, '2026-03-04 11:07:24');
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (78, 1, 'login', NULL, NULL, '2026-03-04 11:11:32');
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (79, 1, 'login', NULL, NULL, '2026-03-04 11:16:50');
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (80, 1, 'login', NULL, NULL, '2026-03-04 11:29:49');
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (81, 1, 'login', NULL, NULL, '2026-03-04 11:46:47');
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (82, 1, 'login', NULL, NULL, '2026-03-04 12:03:06');
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (83, 1, 'login', NULL, NULL, '2026-03-04 12:05:08');
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (84, 4, 'login', NULL, NULL, '2026-03-04 12:46:07');
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (85, 4, 'login', NULL, NULL, '2026-03-04 13:00:48');
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (86, 1, 'login', NULL, NULL, '2026-03-04 14:18:55');
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (87, 4, 'login', NULL, NULL, '2026-03-04 14:19:20');
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (88, 4, 'login', NULL, NULL, '2026-03-04 14:22:08');
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (89, 4, 'login', NULL, NULL, '2026-03-04 14:24:22');
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (90, 4, 'login', NULL, NULL, '2026-03-04 15:23:59');
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (91, 4, 'login', NULL, NULL, '2026-03-04 15:27:03');
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (92, 4, 'login', NULL, NULL, '2026-03-04 15:41:05');
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (93, 4, 'login', NULL, NULL, '2026-03-04 15:43:28');
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (94, 1, 'login', NULL, NULL, '2026-03-05 00:33:13');
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (95, 1, 'login', NULL, NULL, '2026-03-05 00:36:08');
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (96, 1, 'login', NULL, NULL, '2026-03-05 01:00:03');
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (97, 1, 'login', NULL, NULL, '2026-03-05 01:04:35');
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (98, 4, 'login', NULL, NULL, '2026-03-05 01:05:42');
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (99, 4, 'login', NULL, NULL, '2026-03-05 01:55:41');
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (100, 4, 'login', NULL, NULL, '2026-03-05 01:56:19');
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (101, 1, 'login', NULL, NULL, '2026-03-05 01:56:43');
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (102, 4, 'login', NULL, NULL, '2026-03-05 01:58:22');
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (103, 4, 'login', NULL, NULL, '2026-03-05 01:58:34');
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (104, 4, 'login', NULL, NULL, '2026-03-05 01:58:51');
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (105, 4, 'login', NULL, NULL, '2026-03-05 02:03:23');
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (106, 4, 'login', NULL, NULL, '2026-03-05 02:04:49');
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (107, 4, 'login', NULL, NULL, '2026-03-05 02:07:18');
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (108, 4, 'login', NULL, NULL, '2026-03-05 02:08:47');
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (109, 4, 'login', NULL, NULL, '2026-03-05 02:20:59');
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (110, 4, 'login', NULL, NULL, '2026-03-05 02:23:02');
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (111, 4, 'login', NULL, NULL, '2026-03-05 08:58:52');
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (112, 4, 'login', NULL, NULL, '2026-03-05 09:02:24');
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (113, 4, 'login', NULL, NULL, '2026-03-05 09:02:34');
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (114, 4, 'login', NULL, NULL, '2026-03-05 09:10:58');
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (115, 4, 'login', NULL, NULL, '2026-03-05 09:43:03');
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (116, 4, 'login', NULL, NULL, '2026-03-05 10:47:54');
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (117, 4, 'login', NULL, NULL, '2026-03-05 15:07:36');
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (118, 4, 'login', NULL, NULL, '2026-03-05 15:16:13');
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (119, 4, 'login', NULL, NULL, '2026-03-05 15:38:35');
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (120, 4, 'login', NULL, NULL, '2026-03-05 15:45:58');
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (121, 4, 'login', NULL, NULL, '2026-03-05 15:47:20');
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (122, 4, 'login', NULL, NULL, '2026-03-05 15:52:46');
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (123, 4, 'login', NULL, NULL, '2026-03-05 16:04:54');
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (124, 4, 'login', NULL, NULL, '2026-03-06 04:27:09');
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (125, 4, 'login', NULL, NULL, '2026-03-06 05:51:30');
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (
    126,
    4,
    'Update status ke Sedang Diuji',
    NULL,
    NULL,
    '2026-03-06 05:53:39'
  );
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (
    127,
    4,
    'Update status ke Menunggu Verifikasi',
    NULL,
    NULL,
    '2026-03-06 05:53:43'
  );
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (
    128,
    4,
    'Update status ke Lunas',
    NULL,
    NULL,
    '2026-03-06 05:53:45'
  );
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (
    129,
    4,
    'Update status ke Menunggu Verifikasi',
    NULL,
    NULL,
    '2026-03-06 05:53:50'
  );
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (130, 4, 'login', NULL, NULL, '2026-03-06 05:56:36');
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (131, 4, 'login', NULL, NULL, '2026-03-06 05:59:13');
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (132, 4, 'login', NULL, NULL, '2026-03-06 06:02:08');
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (
    133,
    4,
    'Update status ke Pengecekan Sampel',
    NULL,
    NULL,
    '2026-03-06 06:02:16'
  );
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (
    134,
    4,
    'Update status ke Menunggu Verifikasi',
    NULL,
    NULL,
    '2026-03-06 06:02:30'
  );
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (
    135,
    4,
    'Update status ke Menunggu Verifikasi',
    NULL,
    NULL,
    '2026-03-06 06:03:02'
  );
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (136, 4, 'login', NULL, NULL, '2026-03-06 06:18:47');
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (137, 4, 'login', NULL, NULL, '2026-03-06 07:06:23');
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (138, 4, 'login', NULL, NULL, '2026-03-06 07:10:59');
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (
    139,
    4,
    'Update status ke Pengecekan Sampel',
    NULL,
    NULL,
    '2026-03-06 07:11:06'
  );
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (
    140,
    4,
    'Update status ke Menunggu Verifikasi',
    NULL,
    NULL,
    '2026-03-06 07:11:16'
  );
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (
    141,
    4,
    'Update status ke Menunggu Verifikasi',
    NULL,
    NULL,
    '2026-03-06 07:11:26'
  );
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (142, 4, 'login', NULL, NULL, '2026-03-06 07:12:15');
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (
    143,
    4,
    'Update status ke Belum Lunas',
    NULL,
    NULL,
    '2026-03-06 07:12:26'
  );
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (144, 4, 'login', NULL, NULL, '2026-03-06 12:18:24');
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (145, 4, 'login', NULL, NULL, '2026-03-09 07:11:31');
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (146, 4, 'login', NULL, NULL, '2026-03-09 20:20:10');
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (147, 4, 'login', NULL, NULL, '2026-03-09 21:00:32');
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (148, 4, 'login', NULL, NULL, '2026-03-09 21:09:17');
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (149, 4, 'login', NULL, NULL, '2026-03-09 21:20:30');
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (150, 4, 'login', NULL, NULL, '2026-03-09 21:26:36');
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (151, 4, 'login', NULL, NULL, '2026-03-09 21:48:27');
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (152, 4, 'login', NULL, NULL, '2026-03-09 22:00:04');
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (153, 4, 'login', NULL, NULL, '2026-03-09 22:08:32');
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (
    154,
    4,
    'Verifikasi pembayaran SKRD #INV-2026-00011 sebesar Rp 50000',
    NULL,
    NULL,
    '2026-03-09 22:11:21'
  );
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (155, 4, 'login', NULL, NULL, '2026-03-09 22:14:22');
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (156, 4, 'login', NULL, NULL, '2026-03-09 22:24:33');
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (157, 4, 'login', NULL, NULL, '2026-03-09 22:32:54');
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (158, 4, 'login', NULL, NULL, '2026-03-10 00:33:41');
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (159, 4, 'login', NULL, NULL, '2026-03-10 01:39:37');
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (160, 4, 'login', NULL, NULL, '2026-03-10 01:42:44');
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (161, 4, 'login', NULL, NULL, '2026-03-10 01:50:35');
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (162, 4, 'login', NULL, NULL, '2026-03-10 01:53:40');
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (163, 4, 'login', NULL, NULL, '2026-03-10 01:55:43');
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (164, 4, 'login', NULL, NULL, '2026-03-10 05:47:03');
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (165, 4, 'login', NULL, NULL, '2026-03-10 08:53:24');
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (166, 4, 'login', NULL, NULL, '2026-03-10 09:12:34');
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (167, 4, 'login', NULL, NULL, '2026-03-10 09:18:09');
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (168, 4, 'login', NULL, NULL, '2026-03-10 10:39:02');
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (169, 4, 'login', NULL, NULL, '2026-03-10 16:20:44');
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (170, 4, 'login', NULL, NULL, '2026-03-10 17:04:15');
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (171, 4, 'login', NULL, NULL, '2026-03-10 19:13:30');
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (172, 4, 'login', NULL, NULL, '2026-03-11 02:56:28');
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (173, 4, 'login', NULL, NULL, '2026-03-11 04:25:03');
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (174, 4, 'login', NULL, NULL, '2026-03-11 04:50:40');
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (175, 4, 'login', NULL, NULL, '2026-03-11 04:55:08');
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (176, 4, 'login', NULL, NULL, '2026-03-11 09:48:45');
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (177, 4, 'login', NULL, NULL, '2026-03-11 09:49:05');
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (178, 4, 'login', NULL, NULL, '2026-03-11 09:49:29');
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (179, 4, 'login', NULL, NULL, '2026-03-11 10:01:46');
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (180, 4, 'login', NULL, NULL, '2026-03-11 23:44:30');
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (181, 4, 'login', NULL, NULL, '2026-03-11 23:48:24');
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (182, 4, 'login', NULL, NULL, '2026-03-11 23:51:29');
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (183, 4, 'login', NULL, NULL, '2026-03-11 23:55:16');
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (184, 4, 'login', NULL, NULL, '2026-03-12 00:28:19');
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (185, 4, 'login', NULL, NULL, '2026-03-12 14:36:14');
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (186, 4, 'login', NULL, NULL, '2026-03-12 15:45:54');
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (187, 4, 'login', NULL, NULL, '2026-03-13 04:41:09');
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (
    188,
    4,
    'Add Busy Period',
    '::1',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0',
    '2026-03-13 11:02:39'
  );
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (
    189,
    4,
    'Update Busy Mode',
    '::1',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0',
    '2026-03-13 11:02:50'
  );
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (
    190,
    NULL,
    'register',
    NULL,
    NULL,
    '2026-03-13 23:13:48'
  );
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (191, NULL, 'login', NULL, NULL, '2026-03-13 23:13:56');
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (192, 4, 'login', NULL, NULL, '2026-03-14 11:56:59');
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (193, NULL, 'login', NULL, NULL, '2026-03-14 16:29:02');
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (194, 4, 'login', NULL, NULL, '2026-03-14 16:29:15');
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (195, 4, 'login', NULL, NULL, '2026-03-14 16:33:00');
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (
    196,
    4,
    'Update Busy Mode',
    '::1',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0',
    '2026-03-14 16:35:06'
  );
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (197, 4, 'login', NULL, NULL, '2026-03-14 16:37:40');
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (
    198,
    4,
    'Update Busy Mode',
    '::1',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0',
    '2026-03-14 16:37:44'
  );
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (
    199,
    4,
    'Update Busy Mode',
    '::1',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0',
    '2026-03-14 16:37:48'
  );
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (
    200,
    4,
    'Update Busy Mode',
    '::1',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0',
    '2026-03-14 16:37:55'
  );
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (201, 4, 'login', NULL, NULL, '2026-03-14 16:38:24');
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (202, 4, 'login', NULL, NULL, '2026-03-14 16:46:59');
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (203, 4, 'login', NULL, NULL, '2026-03-14 16:48:47');
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (204, 4, 'login', NULL, NULL, '2026-03-14 16:55:40');
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (205, 4, 'login', NULL, NULL, '2026-03-14 16:58:23');
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (206, NULL, 'login', NULL, NULL, '2026-03-14 17:08:13');
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (207, NULL, 'login', NULL, NULL, '2026-03-14 17:08:24');
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (208, NULL, 'login', NULL, NULL, '2026-03-14 17:16:19');
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (209, NULL, 'login', NULL, NULL, '2026-03-14 17:20:17');
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (
    210,
    NULL,
    'create_submission',
    NULL,
    NULL,
    '2026-03-14 17:21:42'
  );
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (211, 4, 'login', NULL, NULL, '2026-03-14 17:22:02');
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (212, NULL, 'login', NULL, NULL, '2026-03-14 17:45:28');
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (213, NULL, 'login', NULL, NULL, '2026-03-14 21:39:05');
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (214, NULL, 'login', NULL, NULL, '2026-03-14 21:44:04');
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (215, NULL, 'login', NULL, NULL, '2026-03-14 21:58:09');
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (216, 4, 'login', NULL, NULL, '2026-03-14 22:01:36');
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (
    217,
    4,
    'Update status ke Selesai',
    NULL,
    NULL,
    '2026-03-14 22:02:28'
  );
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (
    218,
    4,
    'Verifikasi pembayaran SKRD #INV-2026-00012 sebesar Rp 900000',
    NULL,
    NULL,
    '2026-03-14 22:02:55'
  );
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (219, NULL, 'login', NULL, NULL, '2026-03-14 22:04:46');
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (220, 4, 'login', NULL, NULL, '2026-03-14 22:05:33');
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (
    221,
    4,
    'Update status ke Selesai',
    NULL,
    NULL,
    '2026-03-14 22:05:57'
  );
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (222, NULL, 'login', NULL, NULL, '2026-03-14 22:07:15');
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (223, 4, 'login', NULL, NULL, '2026-03-14 22:45:06');
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (
    224,
    4,
    'Upload Laporan Submission #12',
    '::1',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0',
    '2026-03-14 22:45:25'
  );
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (
    225,
    4,
    'Update status ke Selesai',
    NULL,
    NULL,
    '2026-03-14 22:45:31'
  );
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (226, NULL, 'login', NULL, NULL, '2026-03-14 22:45:41');
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (227, 4, 'login', NULL, NULL, '2026-03-14 22:46:33');
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (228, 4, 'login', NULL, NULL, '2026-03-14 22:58:01');
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (229, NULL, 'login', NULL, NULL, '2026-03-14 22:58:34');
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (230, NULL, 'login', NULL, NULL, '2026-03-14 23:06:52');
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (231, NULL, 'login', NULL, NULL, '2026-03-14 23:20:00');
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (232, NULL, 'login', NULL, NULL, '2026-03-14 23:29:15');
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (233, NULL, 'login', NULL, NULL, '2026-03-14 23:35:07');
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (234, NULL, 'login', NULL, NULL, '2026-03-14 23:36:46');
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (
    235,
    NULL,
    'create_submission',
    NULL,
    NULL,
    '2026-03-14 23:38:10'
  );
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (236, NULL, 'login', NULL, NULL, '2026-03-15 14:34:22');
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (237, NULL, 'login', NULL, NULL, '2026-03-15 14:36:51');
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (238, NULL, 'login', NULL, NULL, '2026-03-15 14:37:07');
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (239, NULL, 'login', NULL, NULL, '2026-03-15 14:37:24');
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (240, NULL, 'login', NULL, NULL, '2026-03-15 14:39:21');
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (241, NULL, 'login', NULL, NULL, '2026-03-15 14:41:40');
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (242, NULL, 'login', NULL, NULL, '2026-03-15 15:16:38');
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (243, NULL, 'login', NULL, NULL, '2026-03-15 15:22:18');
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (244, 6, 'register', NULL, NULL, '2026-03-28 00:08:07');
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (245, 6, 'login', NULL, NULL, '2026-03-28 00:08:50');
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (246, 6, 'login', NULL, NULL, '2026-03-28 00:11:17');
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (247, 6, 'login', NULL, NULL, '2026-03-28 04:05:36');
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (248, 6, 'login', NULL, NULL, '2026-03-28 04:08:59');
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (249, 6, 'login', NULL, NULL, '2026-03-28 04:26:27');
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (250, 6, 'login', NULL, NULL, '2026-03-28 04:56:45');
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (251, 6, 'login', NULL, NULL, '2026-03-28 05:43:11');
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (
    252,
    6,
    'create_submission',
    NULL,
    NULL,
    '2026-03-28 05:44:41'
  );
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (253, 6, 'login', NULL, NULL, '2026-03-28 05:50:23');
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (254, 6, 'login', NULL, NULL, '2026-03-28 05:52:44');
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (255, 6, 'login', NULL, NULL, '2026-03-28 06:16:15');
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (
    256,
    6,
    'create_submission',
    NULL,
    NULL,
    '2026-03-28 06:20:35'
  );
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (257, 6, 'login', NULL, NULL, '2026-03-28 06:31:38');
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (
    258,
    6,
    'create_submission',
    NULL,
    NULL,
    '2026-03-28 06:32:34'
  );
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (259, 6, 'login', NULL, NULL, '2026-03-28 06:50:24');
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (260, 6, 'login', NULL, NULL, '2026-03-28 07:00:11');
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (
    261,
    6,
    'create_submission',
    NULL,
    NULL,
    '2026-03-28 07:01:27'
  );
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (262, 6, 'login', NULL, NULL, '2026-03-28 07:18:09');
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (
    263,
    6,
    'create_submission',
    NULL,
    NULL,
    '2026-03-28 07:20:21'
  );
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (264, 6, 'login', NULL, NULL, '2026-03-28 07:25:01');
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (
    265,
    6,
    'create_submission',
    NULL,
    NULL,
    '2026-03-28 07:25:36'
  );
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (266, 6, 'login', NULL, NULL, '2026-03-28 07:30:05');
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (
    267,
    6,
    'create_submission',
    NULL,
    NULL,
    '2026-03-28 07:31:07'
  );
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (268, 6, 'login', NULL, NULL, '2026-03-28 07:33:53');
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (
    269,
    6,
    'create_submission',
    NULL,
    NULL,
    '2026-03-28 07:34:29'
  );
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (270, 6, 'login', NULL, NULL, '2026-03-28 07:37:36');
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (
    271,
    6,
    'create_submission',
    NULL,
    NULL,
    '2026-03-28 07:38:07'
  );
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (272, 4, 'login', NULL, NULL, '2026-03-28 07:58:13');
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (273, 6, 'login', NULL, NULL, '2026-03-28 08:06:18');
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (274, 6, 'login', NULL, NULL, '2026-03-28 08:13:56');
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (275, 6, 'login', NULL, NULL, '2026-03-28 08:15:16');
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (276, 4, 'login', NULL, NULL, '2026-05-01 18:36:27');
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (
    277,
    4,
    'Update status ke Menunggu SKRD Upload',
    NULL,
    NULL,
    '2026-05-01 18:39:37'
  );
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (
    278,
    4,
    'Update status ke Menunggu Verifikasi',
    NULL,
    NULL,
    '2026-05-01 18:39:38'
  );
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (
    279,
    4,
    'Update status ke Menunggu Verifikasi',
    NULL,
    NULL,
    '2026-05-01 18:39:39'
  );
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (
    280,
    4,
    'Update status ke Menunggu Verifikasi',
    NULL,
    NULL,
    '2026-05-01 18:39:40'
  );
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (
    281,
    4,
    'Update status ke Menunggu Verifikasi',
    NULL,
    NULL,
    '2026-05-01 18:39:40'
  );
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (282, 4, 'login', NULL, NULL, '2026-05-01 18:49:58');
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (283, 4, 'login', NULL, NULL, '2026-05-01 18:58:38');
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (284, 4, 'login', NULL, NULL, '2026-05-01 19:06:24');
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (285, 4, 'login', NULL, NULL, '2026-05-01 20:19:14');
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (286, 4, 'login', NULL, NULL, '2026-05-01 20:24:03');
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (
    287,
    4,
    'Update status ke Pengecekan Sampel',
    NULL,
    NULL,
    '2026-05-01 20:28:31'
  );
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (
    288,
    4,
    'Update status ke Belum Bayar',
    NULL,
    NULL,
    '2026-05-01 20:39:19'
  );
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (
    289,
    4,
    'Update status ke Belum Lunas',
    NULL,
    NULL,
    '2026-05-01 20:39:28'
  );
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (
    290,
    4,
    'Update status ke Pengecekan Sampel',
    NULL,
    NULL,
    '2026-05-01 20:39:50'
  );
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (
    291,
    4,
    'Update status ke Belum Bayar',
    NULL,
    NULL,
    '2026-05-01 20:40:16'
  );
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (
    292,
    4,
    'Update status ke Belum Bayar',
    NULL,
    NULL,
    '2026-05-01 20:40:24'
  );
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (293, 4, 'login', NULL, NULL, '2026-05-01 20:49:54');
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (294, 4, 'login', NULL, NULL, '2026-05-01 20:51:16');
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (
    295,
    4,
    'Update status ke Menunggu Verifikasi',
    NULL,
    NULL,
    '2026-05-01 20:51:25'
  );
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (296, 4, 'login', NULL, NULL, '2026-05-02 17:30:17');
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (297, 4, 'login', NULL, NULL, '2026-05-02 17:35:14');
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (298, 4, 'login', NULL, NULL, '2026-05-02 17:44:48');
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (
    299,
    4,
    'Update status ke Lunas',
    NULL,
    NULL,
    '2026-05-02 17:45:12'
  );
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (
    300,
    4,
    'Update status ke Pengecekan Sampel',
    NULL,
    NULL,
    '2026-05-02 17:45:40'
  );
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (
    301,
    4,
    'Update status ke Pengecekan Sampel',
    NULL,
    NULL,
    '2026-05-02 17:46:00'
  );
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (
    302,
    4,
    'Update status ke Pengecekan Sampel',
    NULL,
    NULL,
    '2026-05-02 17:46:02'
  );
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (303, 4, 'login', NULL, NULL, '2026-05-02 17:53:28');
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (
    304,
    4,
    'Update status ke Pengecekan Sampel',
    NULL,
    NULL,
    '2026-05-02 17:53:40'
  );
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (
    305,
    4,
    'Update status ke Pengecekan Sampel',
    NULL,
    NULL,
    '2026-05-02 17:54:02'
  );
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (
    306,
    4,
    'Update status ke Pengecekan Sampel',
    NULL,
    NULL,
    '2026-05-02 17:54:16'
  );
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (307, 4, 'login', NULL, NULL, '2026-05-02 17:56:48');
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (
    308,
    4,
    'Update status ke Belum Bayar',
    NULL,
    NULL,
    '2026-05-02 17:57:06'
  );
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (
    309,
    4,
    'Update status ke Belum Bayar',
    NULL,
    NULL,
    '2026-05-02 17:57:19'
  );
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (310, 4, 'login', NULL, NULL, '2026-05-02 18:01:05');
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (
    311,
    4,
    'Update status ke Belum Bayar',
    NULL,
    NULL,
    '2026-05-02 18:01:12'
  );
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (
    312,
    4,
    'Update status ke Menunggu SKRD Upload',
    NULL,
    NULL,
    '2026-05-02 18:12:00'
  );
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (
    313,
    4,
    'Update status ke Belum Lunas',
    NULL,
    NULL,
    '2026-05-02 18:12:23'
  );
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (
    314,
    4,
    'Update status ke Lunas',
    NULL,
    NULL,
    '2026-05-02 18:12:31'
  );
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (
    315,
    4,
    'Update status ke Sedang Diuji',
    NULL,
    NULL,
    '2026-05-02 18:12:40'
  );
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (
    316,
    4,
    'Update status ke Selesai',
    NULL,
    NULL,
    '2026-05-02 18:12:50'
  );
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (317, 4, 'login', NULL, NULL, '2026-05-03 11:43:47');
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (
    318,
    4,
    'Update status ke Pengecekan Sampel',
    NULL,
    NULL,
    '2026-05-03 11:44:22'
  );
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (
    319,
    4,
    'Update status ke Belum Lunas',
    NULL,
    NULL,
    '2026-05-03 11:45:57'
  );
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (
    320,
    4,
    'Update status ke Belum Bayar',
    NULL,
    NULL,
    '2026-05-03 11:46:11'
  );
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (
    321,
    4,
    'Update status ke Menunggu SKRD Upload',
    NULL,
    NULL,
    '2026-05-03 11:46:28'
  );
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (
    322,
    4,
    'Update status ke Sedang Diuji',
    NULL,
    NULL,
    '2026-05-03 11:46:38'
  );
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (
    323,
    4,
    'Update status ke Menunggu Verifikasi',
    NULL,
    NULL,
    '2026-05-03 11:47:18'
  );
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (324, 4, 'login', NULL, NULL, '2026-05-03 11:50:45');
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (325, 4, 'login', NULL, NULL, '2026-05-03 17:15:33');
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (326, 4, 'login', NULL, NULL, '2026-05-03 17:17:23');
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (
    327,
    4,
    'Update status ke Sedang Diuji',
    NULL,
    NULL,
    '2026-05-03 17:17:48'
  );
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (
    328,
    4,
    'Update status ke Lunas',
    NULL,
    NULL,
    '2026-05-03 17:18:07'
  );
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (
    329,
    4,
    'Update status ke Sedang Diuji',
    NULL,
    NULL,
    '2026-05-03 17:18:18'
  );
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (330, 4, 'login', NULL, NULL, '2026-05-03 17:29:39');
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (331, 4, 'login', NULL, NULL, '2026-05-03 17:32:06');
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (332, 4, 'login', NULL, NULL, '2026-05-03 17:33:14');
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (333, 4, 'login', NULL, NULL, '2026-05-03 17:36:32');
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (334, 4, 'login', NULL, NULL, '2026-05-03 17:37:29');
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (335, 4, 'login', NULL, NULL, '2026-05-03 17:38:30');
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (336, 4, 'login', NULL, NULL, '2026-05-03 17:49:31');
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (337, 4, 'login', NULL, NULL, '2026-05-03 18:09:51');
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (
    338,
    4,
    'Verifikasi pembayaran SKRD #INV-2026-00009 sebesar Rp 150000',
    NULL,
    NULL,
    '2026-05-03 18:10:21'
  );
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (
    339,
    4,
    'Update status ke Belum Lunas',
    NULL,
    NULL,
    '2026-05-03 18:18:39'
  );
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (
    340,
    4,
    'Pengingat pembayaran dikirim untuk invoice INV-2026-00005 ke gadis123@gmail.com',
    NULL,
    NULL,
    '2026-05-03 18:21:54'
  );
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (341, 4, 'login', NULL, NULL, '2026-05-03 18:27:21');
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (342, 4, 'login', NULL, NULL, '2026-05-12 15:04:53');
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (
    343,
    4,
    'Create Backup',
    '::1',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36 Edg/148.0.0.0',
    '2026-05-12 15:12:25'
  );
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (344, 4, 'login', NULL, NULL, '2026-05-20 16:48:15');
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (
    345,
    4,
    'Update status ke Dibatalkan',
    NULL,
    NULL,
    '2026-05-20 17:07:28'
  );
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (
    346,
    4,
    'Upload Laporan Submission #6',
    '::1',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36 Edg/148.0.0.0',
    '2026-05-20 17:08:01'
  );
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (
    347,
    4,
    'Update status ke Dibatalkan',
    NULL,
    NULL,
    '2026-05-20 17:08:14'
  );
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (
    348,
    4,
    'Update status ke Dibatalkan',
    NULL,
    NULL,
    '2026-05-20 17:08:26'
  );
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (
    349,
    4,
    'Update status ke Selesai',
    NULL,
    NULL,
    '2026-05-20 17:08:43'
  );
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (350, 4, 'login', NULL, NULL, '2026-05-20 17:16:46');
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (351, 4, 'login', NULL, NULL, '2026-05-20 17:26:30');
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (
    352,
    4,
    'Update status ke Selesai',
    NULL,
    NULL,
    '2026-05-20 17:26:53'
  );
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (353, 4, 'login', NULL, NULL, '2026-05-20 17:30:34');
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (
    354,
    4,
    'Update status ke Selesai',
    NULL,
    NULL,
    '2026-05-20 17:30:42'
  );
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (
    355,
    4,
    'Update status ke Belum Lunas',
    NULL,
    NULL,
    '2026-05-20 17:30:55'
  );
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (
    356,
    4,
    'Update status ke Pengecekan Sampel',
    NULL,
    NULL,
    '2026-05-20 17:31:15'
  );
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (
    357,
    4,
    'Update status ke Menunggu SKRD Upload',
    NULL,
    NULL,
    '2026-05-20 17:31:27'
  );
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (
    358,
    4,
    'Update status ke Belum Lunas',
    NULL,
    NULL,
    '2026-05-20 17:31:40'
  );
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (
    359,
    4,
    'Update status ke Lunas',
    NULL,
    NULL,
    '2026-05-20 17:31:45'
  );
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (
    360,
    4,
    'Update status ke Sedang Diuji',
    NULL,
    NULL,
    '2026-05-20 17:31:50'
  );
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (
    361,
    4,
    'Update status ke Selesai',
    NULL,
    NULL,
    '2026-05-20 17:31:55'
  );
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (
    362,
    4,
    'Update status ke Sedang Diuji',
    NULL,
    NULL,
    '2026-05-20 17:31:59'
  );
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (363, 4, 'cancel', NULL, NULL, '2026-05-20 17:44:29');
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (
    364,
    4,
    'Update status ke Dibatalkan',
    NULL,
    NULL,
    '2026-05-20 17:45:05'
  );
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (365, 4, 'login', NULL, NULL, '2026-05-20 17:58:53');
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (
    366,
    4,
    'Create Backup',
    '::1',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36 Edg/148.0.0.0',
    '2026-05-20 17:58:58'
  );
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (
    367,
    4,
    'Create Backup',
    '::1',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36 Edg/148.0.0.0',
    '2026-05-20 18:01:43'
  );
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (368, 4, 'login', NULL, NULL, '2026-05-20 18:02:08');
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (369, 4, 'login', NULL, NULL, '2026-05-21 14:57:35');
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (
    370,
    4,
    'Delete Busy Period',
    '::1',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36 Edg/148.0.0.0',
    '2026-05-21 14:58:24'
  );
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (
    371,
    4,
    'Update Busy Mode',
    '::1',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36 Edg/148.0.0.0',
    '2026-05-21 14:58:28'
  );
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (
    372,
    4,
    'Update Profile',
    '::1',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36 Edg/148.0.0.0',
    '2026-05-21 14:58:54'
  );
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (
    373,
    4,
    'Create Backup',
    '::1',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36 Edg/148.0.0.0',
    '2026-05-21 14:59:02'
  );
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (
    374,
    4,
    'Create Backup',
    '::1',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36 Edg/148.0.0.0',
    '2026-05-21 15:05:45'
  );
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (
    375,
    4,
    'Create Backup',
    '::1',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36 Edg/148.0.0.0',
    '2026-05-21 15:05:56'
  );
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (376, 4, 'login', NULL, NULL, '2026-05-21 15:13:32');
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (
    377,
    4,
    'Create Backup',
    '::1',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36 Edg/148.0.0.0',
    '2026-05-21 15:13:40'
  );
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (
    378,
    4,
    'Create Backup',
    '::1',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36 Edg/148.0.0.0',
    '2026-05-21 15:18:06'
  );
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (
    379,
    4,
    'Create Backup',
    '::1',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36 Edg/148.0.0.0',
    '2026-05-21 15:21:00'
  );
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (
    380,
    4,
    'Create Backup',
    '::1',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36 Edg/148.0.0.0',
    '2026-05-21 15:21:26'
  );
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (
    381,
    4,
    'Create Backup',
    '::1',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36 Edg/148.0.0.0',
    '2026-05-21 15:23:41'
  );
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (
    382,
    4,
    'Create Backup',
    '::1',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36 Edg/148.0.0.0',
    '2026-05-21 16:02:52'
  );
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (383, 7, 'register', NULL, NULL, '2026-06-21 19:23:32');
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (384, 7, 'login', NULL, NULL, '2026-06-21 19:23:51');
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (
    385,
    7,
    'create_submission',
    NULL,
    NULL,
    '2026-06-21 19:30:45'
  );
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (386, 7, 'login', NULL, NULL, '2026-06-21 19:34:30');
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (387, 7, 'login', NULL, NULL, '2026-06-21 19:39:46');
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (388, 7, 'login', NULL, NULL, '2026-06-21 19:45:55');
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (389, 4, 'login', NULL, NULL, '2026-06-21 19:48:54');
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (
    390,
    4,
    'Update status ke Belum Lunas',
    NULL,
    NULL,
    '2026-06-21 19:51:24'
  );
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (391, 7, 'login', NULL, NULL, '2026-06-21 19:53:32');
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (392, 7, 'login', NULL, NULL, '2026-06-21 20:07:20');
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (393, 4, 'login', NULL, NULL, '2026-06-21 20:17:38');
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (
    394,
    4,
    'Update Profile',
    '::1',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36 Edg/149.0.0.0',
    '2026-06-21 20:19:44'
  );
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (
    395,
    4,
    'Create Backup',
    '::1',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36 Edg/149.0.0.0',
    '2026-06-21 20:19:58'
  );
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (
    396,
    4,
    'Create Backup',
    '::1',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36 Edg/149.0.0.0',
    '2026-06-21 20:20:02'
  );
INSERT INTO
  `activities` (
    `id`,
    `user_id`,
    `activity_name`,
    `ip_address`,
    `user_agent`,
    `created_at`
  )
VALUES
  (
    397,
    4,
    'Create Backup',
    '::1',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36 Edg/149.0.0.0',
    '2026-06-21 20:20:14'
  );

# ------------------------------------------------------------
# DATA DUMP FOR TABLE: jadwal_sibuk
# ------------------------------------------------------------


# ------------------------------------------------------------
# DATA DUMP FOR TABLE: kuisioner
# ------------------------------------------------------------


# ------------------------------------------------------------
# DATA DUMP FOR TABLE: kuisioner_backup
# ------------------------------------------------------------


# ------------------------------------------------------------
# DATA DUMP FOR TABLE: kuisioner_questions
# ------------------------------------------------------------

INSERT INTO
  `kuisioner_questions` (`id`, `question_text`, `urutan`)
VALUES
  (1, 'Kemudahan dalam pelayanan pelanggan', 1);
INSERT INTO
  `kuisioner_questions` (`id`, `question_text`, `urutan`)
VALUES
  (
    2,
    'Kemudahan informasi tentang sistem, mekanisme, dan prosedur pelayanan pengujian',
    2
  );
INSERT INTO
  `kuisioner_questions` (`id`, `question_text`, `urutan`)
VALUES
  (3, 'Ketepatan waktu pelayanan pengujian', 3);
INSERT INTO
  `kuisioner_questions` (`id`, `question_text`, `urutan`)
VALUES
  (4, 'Biaya pengujian yang kompetitif', 4);
INSERT INTO
  `kuisioner_questions` (`id`, `question_text`, `urutan`)
VALUES
  (5, 'Kualitas dan mutu layanan sesuai ketentuan', 5);
INSERT INTO
  `kuisioner_questions` (`id`, `question_text`, `urutan`)
VALUES
  (
    6,
    'Tenaga teknis yang handal, berpengalaman, dan bersertifikasi',
    6
  );
INSERT INTO
  `kuisioner_questions` (`id`, `question_text`, `urutan`)
VALUES
  (7, 'Keramahan pelayanan petugas', 7);
INSERT INTO
  `kuisioner_questions` (`id`, `question_text`, `urutan`)
VALUES
  (
    8,
    'Kecepatan tanggapan dan tindak lanjut terhadap keluhan',
    8
  );
INSERT INTO
  `kuisioner_questions` (`id`, `question_text`, `urutan`)
VALUES
  (9, 'Kenyamanan dan kebersihan lingkungan', 9);
INSERT INTO
  `kuisioner_questions` (`id`, `question_text`, `urutan`)
VALUES
  (
    10,
    'Dukungan peralatan yang memadai, terpelihara serta mutakhir',
    10
  );

# ------------------------------------------------------------
# DATA DUMP FOR TABLE: payments
# ------------------------------------------------------------

INSERT INTO
  `payments` (
    `id`,
    `submission_id`,
    `no_invoice`,
    `total_tagihan`,
    `jumlah_dibayar`,
    `sisa_tagihan`,
    `status_pembayaran`,
    `bukti_pembayaran_1`,
    `bukti_pembayaran_2`,
    `bukti_pembayaran_1_uploaded_at`,
    `bukti_pembayaran_2_uploaded_at`,
    `skrd_file`,
    `skrd_filename`,
    `skrd_uploaded_at`,
    `skrd_uploaded_by`,
    `bukti_pembayaran_notes`,
    `created_at`,
    `updated_at`
  )
VALUES
  (
    1,
    1,
    'INV-2026-00001',
    1800000.00,
    0.00,
    1800000.00,
    'Menunggu Verifikasi',
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    '2026-03-28 05:44:41',
    '2026-05-03 17:24:28'
  );
INSERT INTO
  `payments` (
    `id`,
    `submission_id`,
    `no_invoice`,
    `total_tagihan`,
    `jumlah_dibayar`,
    `sisa_tagihan`,
    `status_pembayaran`,
    `bukti_pembayaran_1`,
    `bukti_pembayaran_2`,
    `bukti_pembayaran_1_uploaded_at`,
    `bukti_pembayaran_2_uploaded_at`,
    `skrd_file`,
    `skrd_filename`,
    `skrd_uploaded_at`,
    `skrd_uploaded_by`,
    `bukti_pembayaran_notes`,
    `created_at`,
    `updated_at`
  )
VALUES
  (
    2,
    2,
    'INV-2026-00002',
    285000.00,
    0.00,
    285000.00,
    'Menunggu Verifikasi',
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    '2026-03-28 06:20:35',
    '2026-05-03 17:24:28'
  );
INSERT INTO
  `payments` (
    `id`,
    `submission_id`,
    `no_invoice`,
    `total_tagihan`,
    `jumlah_dibayar`,
    `sisa_tagihan`,
    `status_pembayaran`,
    `bukti_pembayaran_1`,
    `bukti_pembayaran_2`,
    `bukti_pembayaran_1_uploaded_at`,
    `bukti_pembayaran_2_uploaded_at`,
    `skrd_file`,
    `skrd_filename`,
    `skrd_uploaded_at`,
    `skrd_uploaded_by`,
    `bukti_pembayaran_notes`,
    `created_at`,
    `updated_at`
  )
VALUES
  (
    3,
    3,
    'INV-2026-00003',
    1200000.00,
    0.00,
    1200000.00,
    'Selesai',
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    '2026-03-28 06:32:34',
    '2026-05-03 17:24:28'
  );
INSERT INTO
  `payments` (
    `id`,
    `submission_id`,
    `no_invoice`,
    `total_tagihan`,
    `jumlah_dibayar`,
    `sisa_tagihan`,
    `status_pembayaran`,
    `bukti_pembayaran_1`,
    `bukti_pembayaran_2`,
    `bukti_pembayaran_1_uploaded_at`,
    `bukti_pembayaran_2_uploaded_at`,
    `skrd_file`,
    `skrd_filename`,
    `skrd_uploaded_at`,
    `skrd_uploaded_by`,
    `bukti_pembayaran_notes`,
    `created_at`,
    `updated_at`
  )
VALUES
  (
    4,
    4,
    'INV-2026-00004',
    5500000.00,
    0.00,
    5500000.00,
    'Menunggu Verifikasi',
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    '2026-03-28 07:01:27',
    '2026-05-03 17:24:28'
  );
INSERT INTO
  `payments` (
    `id`,
    `submission_id`,
    `no_invoice`,
    `total_tagihan`,
    `jumlah_dibayar`,
    `sisa_tagihan`,
    `status_pembayaran`,
    `bukti_pembayaran_1`,
    `bukti_pembayaran_2`,
    `bukti_pembayaran_1_uploaded_at`,
    `bukti_pembayaran_2_uploaded_at`,
    `skrd_file`,
    `skrd_filename`,
    `skrd_uploaded_at`,
    `skrd_uploaded_by`,
    `bukti_pembayaran_notes`,
    `created_at`,
    `updated_at`
  )
VALUES
  (
    5,
    5,
    'INV-2026-00005',
    5500000.00,
    0.00,
    5500000.00,
    'Dibatalkan',
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    '2026-03-28 07:20:21',
    '2026-05-20 17:45:05'
  );
INSERT INTO
  `payments` (
    `id`,
    `submission_id`,
    `no_invoice`,
    `total_tagihan`,
    `jumlah_dibayar`,
    `sisa_tagihan`,
    `status_pembayaran`,
    `bukti_pembayaran_1`,
    `bukti_pembayaran_2`,
    `bukti_pembayaran_1_uploaded_at`,
    `bukti_pembayaran_2_uploaded_at`,
    `skrd_file`,
    `skrd_filename`,
    `skrd_uploaded_at`,
    `skrd_uploaded_by`,
    `bukti_pembayaran_notes`,
    `created_at`,
    `updated_at`
  )
VALUES
  (
    6,
    6,
    'INV-2026-00006',
    450000.00,
    0.00,
    450000.00,
    'Lunas',
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    '2026-03-28 07:25:36',
    '2026-05-20 17:08:43'
  );
INSERT INTO
  `payments` (
    `id`,
    `submission_id`,
    `no_invoice`,
    `total_tagihan`,
    `jumlah_dibayar`,
    `sisa_tagihan`,
    `status_pembayaran`,
    `bukti_pembayaran_1`,
    `bukti_pembayaran_2`,
    `bukti_pembayaran_1_uploaded_at`,
    `bukti_pembayaran_2_uploaded_at`,
    `skrd_file`,
    `skrd_filename`,
    `skrd_uploaded_at`,
    `skrd_uploaded_by`,
    `bukti_pembayaran_notes`,
    `created_at`,
    `updated_at`
  )
VALUES
  (
    7,
    7,
    'INV-2026-00007',
    550000.00,
    0.00,
    550000.00,
    'Lunas',
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    '2026-03-28 07:31:07',
    '2026-05-20 17:30:42'
  );
INSERT INTO
  `payments` (
    `id`,
    `submission_id`,
    `no_invoice`,
    `total_tagihan`,
    `jumlah_dibayar`,
    `sisa_tagihan`,
    `status_pembayaran`,
    `bukti_pembayaran_1`,
    `bukti_pembayaran_2`,
    `bukti_pembayaran_1_uploaded_at`,
    `bukti_pembayaran_2_uploaded_at`,
    `skrd_file`,
    `skrd_filename`,
    `skrd_uploaded_at`,
    `skrd_uploaded_by`,
    `bukti_pembayaran_notes`,
    `created_at`,
    `updated_at`
  )
VALUES
  (
    8,
    8,
    'INV-2026-00008',
    200000.00,
    0.00,
    200000.00,
    'Lunas',
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    '2026-03-28 07:34:29',
    '2026-05-20 17:31:55'
  );
INSERT INTO
  `payments` (
    `id`,
    `submission_id`,
    `no_invoice`,
    `total_tagihan`,
    `jumlah_dibayar`,
    `sisa_tagihan`,
    `status_pembayaran`,
    `bukti_pembayaran_1`,
    `bukti_pembayaran_2`,
    `bukti_pembayaran_1_uploaded_at`,
    `bukti_pembayaran_2_uploaded_at`,
    `skrd_file`,
    `skrd_filename`,
    `skrd_uploaded_at`,
    `skrd_uploaded_by`,
    `bukti_pembayaran_notes`,
    `created_at`,
    `updated_at`
  )
VALUES
  (
    9,
    9,
    'INV-2026-00009',
    300000.00,
    150000.00,
    150000.00,
    'Belum Lunas',
    'payment_proof-1774659998558-769239953.pdf',
    'payment_proof-1774660037583-618503330.pdf',
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    'pawpaw\n[3/5/2026] Verifikasi: Rp 150.000 - Pembayaran diverifikasi',
    '2026-03-28 07:38:07',
    '2026-05-03 18:10:21'
  );
INSERT INTO
  `payments` (
    `id`,
    `submission_id`,
    `no_invoice`,
    `total_tagihan`,
    `jumlah_dibayar`,
    `sisa_tagihan`,
    `status_pembayaran`,
    `bukti_pembayaran_1`,
    `bukti_pembayaran_2`,
    `bukti_pembayaran_1_uploaded_at`,
    `bukti_pembayaran_2_uploaded_at`,
    `skrd_file`,
    `skrd_filename`,
    `skrd_uploaded_at`,
    `skrd_uploaded_by`,
    `bukti_pembayaran_notes`,
    `created_at`,
    `updated_at`
  )
VALUES
  (
    10,
    10,
    'INV-2026-00010',
    4500000.00,
    0.00,
    4500000.00,
    'Menunggu Verifikasi',
    'payment_proof-1782045141108-949060202.pdf',
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    'saya bayar 50% terlebih dahulu',
    '2026-06-21 19:30:45',
    '2026-06-21 19:32:21'
  );

# ------------------------------------------------------------
# DATA DUMP FOR TABLE: services
# ------------------------------------------------------------

INSERT INTO
  `services` (
    `id`,
    `category_id`,
    `test_type_id`,
    `service_name`,
    `min_sample`,
    `satuan`,
    `duration_days`,
    `price`,
    `method`,
    `kan`,
    `created_at`
  )
VALUES
  (
    1,
    1,
    1,
    'Pengujian Keausan Agregat Dengan Mesin Abrasi Los Angeles',
    '20',
    'Kilogram',
    14,
    90000.00,
    'SNI 2417:2008',
    'Ya',
    '2026-03-27 23:13:34'
  );
INSERT INTO
  `services` (
    `id`,
    `category_id`,
    `test_type_id`,
    `service_name`,
    `min_sample`,
    `satuan`,
    `duration_days`,
    `price`,
    `method`,
    `kan`,
    `created_at`
  )
VALUES
  (
    2,
    1,
    1,
    'Pengujian Analisis Saringan Agregat Halus dan Kasar',
    '5',
    'Kilogram',
    14,
    110000.00,
    'SNI ASTM C136:2012',
    'Ya',
    '2026-03-27 23:13:34'
  );
INSERT INTO
  `services` (
    `id`,
    `category_id`,
    `test_type_id`,
    `service_name`,
    `min_sample`,
    `satuan`,
    `duration_days`,
    `price`,
    `method`,
    `kan`,
    `created_at`
  )
VALUES
  (
    3,
    1,
    1,
    'Pengujian Berat Jenis dan Penyerapan Air Agregat Halus',
    '3',
    'Kilogram',
    14,
    150000.00,
    'SNI 1970:2016',
    'Ya',
    '2026-03-27 23:13:34'
  );
INSERT INTO
  `services` (
    `id`,
    `category_id`,
    `test_type_id`,
    `service_name`,
    `min_sample`,
    `satuan`,
    `duration_days`,
    `price`,
    `method`,
    `kan`,
    `created_at`
  )
VALUES
  (
    4,
    1,
    1,
    'Pengujian Berat Jenis dan Penyerapan Air Agregat Kasar',
    '3',
    'Kilogram',
    14,
    90000.00,
    'SNI 1969:2016',
    'Ya',
    '2026-03-27 23:13:34'
  );
INSERT INTO
  `services` (
    `id`,
    `category_id`,
    `test_type_id`,
    `service_name`,
    `min_sample`,
    `satuan`,
    `duration_days`,
    `price`,
    `method`,
    `kan`,
    `created_at`
  )
VALUES
  (
    5,
    2,
    1,
    'Pengujian Kadar Air Untuk Tanah dan Batuan Di Laboratorium',
    '2',
    'Kilogram',
    14,
    90000.00,
    'SNI 1965:2019',
    'Ya',
    '2026-03-27 23:13:34'
  );
INSERT INTO
  `services` (
    `id`,
    `category_id`,
    `test_type_id`,
    `service_name`,
    `min_sample`,
    `satuan`,
    `duration_days`,
    `price`,
    `method`,
    `kan`,
    `created_at`
  )
VALUES
  (
    6,
    3,
    1,
    'Pengujian Kuat Tarik Baja Beton',
    '2',
    'Buah',
    7,
    85000.00,
    'SNI 07-2529-1991',
    'Ya',
    '2026-03-27 23:13:34'
  );
INSERT INTO
  `services` (
    `id`,
    `category_id`,
    `test_type_id`,
    `service_name`,
    `min_sample`,
    `satuan`,
    `duration_days`,
    `price`,
    `method`,
    `kan`,
    `created_at`
  )
VALUES
  (
    7,
    6,
    1,
    'Pengujian Berat Jenis Nyata Campuran Beraspal Yang Dipadatkan Menggunakan Benda Uji Kering Permukaan Jenuh',
    '3',
    'Buah',
    7,
    180000.00,
    'SNI 03-6757-2002',
    'Ya',
    '2026-03-27 23:13:34'
  );
INSERT INTO
  `services` (
    `id`,
    `category_id`,
    `test_type_id`,
    `service_name`,
    `min_sample`,
    `satuan`,
    `duration_days`,
    `price`,
    `method`,
    `kan`,
    `created_at`
  )
VALUES
  (
    8,
    6,
    1,
    'Pengujian Kadar Aspal Dari Campuran Beraspal Dengan Cara Sentrifus',
    '5',
    'Kilogram',
    7,
    20000.00,
    'SNI 03-6894-2002',
    'Ya',
    '2026-03-27 23:13:34'
  );
INSERT INTO
  `services` (
    `id`,
    `category_id`,
    `test_type_id`,
    `service_name`,
    `min_sample`,
    `satuan`,
    `duration_days`,
    `price`,
    `method`,
    `kan`,
    `created_at`
  )
VALUES
  (
    9,
    5,
    1,
    'Pengujian Kuat Tekan Paving Block',
    '3',
    'Buah',
    7,
    35000.00,
    'BS 6717-1993 ANNEX B',
    'Ya',
    '2026-03-27 23:13:34'
  );
INSERT INTO
  `services` (
    `id`,
    `category_id`,
    `test_type_id`,
    `service_name`,
    `min_sample`,
    `satuan`,
    `duration_days`,
    `price`,
    `method`,
    `kan`,
    `created_at`
  )
VALUES
  (
    10,
    5,
    1,
    'Pengujian Kuat Lentur Beton Normal Dengan Dua Titik Pembebanan',
    '3',
    'Buah',
    7,
    95000.00,
    'SNI 4431-2011',
    'Ya',
    '2026-03-27 23:13:34'
  );
INSERT INTO
  `services` (
    `id`,
    `category_id`,
    `test_type_id`,
    `service_name`,
    `min_sample`,
    `satuan`,
    `duration_days`,
    `price`,
    `method`,
    `kan`,
    `created_at`
  )
VALUES
  (
    11,
    2,
    1,
    'Pengujian Attebergh',
    '5',
    'Kilogram',
    14,
    150000.00,
    NULL,
    'Tidak',
    '2026-03-27 23:13:34'
  );
INSERT INTO
  `services` (
    `id`,
    `category_id`,
    `test_type_id`,
    `service_name`,
    `min_sample`,
    `satuan`,
    `duration_days`,
    `price`,
    `method`,
    `kan`,
    `created_at`
  )
VALUES
  (
    12,
    2,
    1,
    'Pengujian CBR Laboratorium Rendaman (Soaked)',
    '50',
    'Kilogram',
    14,
    250000.00,
    NULL,
    'Tidak',
    '2026-03-27 23:13:34'
  );
INSERT INTO
  `services` (
    `id`,
    `category_id`,
    `test_type_id`,
    `service_name`,
    `min_sample`,
    `satuan`,
    `duration_days`,
    `price`,
    `method`,
    `kan`,
    `created_at`
  )
VALUES
  (
    13,
    2,
    1,
    'Pengujian CBR Laboratorium Tanpa Rendaman (Unsoaked)',
    '50',
    'Kilogram',
    14,
    200000.00,
    NULL,
    'Tidak',
    '2026-03-27 23:13:34'
  );
INSERT INTO
  `services` (
    `id`,
    `category_id`,
    `test_type_id`,
    `service_name`,
    `min_sample`,
    `satuan`,
    `duration_days`,
    `price`,
    `method`,
    `kan`,
    `created_at`
  )
VALUES
  (
    14,
    2,
    1,
    'Pengujian Kepadatan Ringan Untuk Tanah',
    '50',
    'Kilogram',
    14,
    235000.00,
    NULL,
    'Ya',
    '2026-03-27 23:13:34'
  );
INSERT INTO
  `services` (
    `id`,
    `category_id`,
    `test_type_id`,
    `service_name`,
    `min_sample`,
    `satuan`,
    `duration_days`,
    `price`,
    `method`,
    `kan`,
    `created_at`
  )
VALUES
  (
    15,
    2,
    1,
    'Pengujian Kepadatan Berat Untuk Tanah',
    '50',
    'Kilogram',
    14,
    360000.00,
    NULL,
    'Tidak',
    '2026-03-27 23:13:34'
  );
INSERT INTO
  `services` (
    `id`,
    `category_id`,
    `test_type_id`,
    `service_name`,
    `min_sample`,
    `satuan`,
    `duration_days`,
    `price`,
    `method`,
    `kan`,
    `created_at`
  )
VALUES
  (
    16,
    1,
    1,
    'Pengujian Berat Isi Agregat',
    '50',
    'Kilogram',
    14,
    110000.00,
    NULL,
    'Tidak',
    '2026-03-27 23:13:34'
  );
INSERT INTO
  `services` (
    `id`,
    `category_id`,
    `test_type_id`,
    `service_name`,
    `min_sample`,
    `satuan`,
    `duration_days`,
    `price`,
    `method`,
    `kan`,
    `created_at`
  )
VALUES
  (
    17,
    1,
    1,
    'Pengujian Gumpalan Lempung Dan Butiran Mudah Pecah Dalam Agregat',
    '5',
    'Kilogram',
    14,
    150000.00,
    NULL,
    'Ya',
    '2026-03-27 23:13:34'
  );
INSERT INTO
  `services` (
    `id`,
    `category_id`,
    `test_type_id`,
    `service_name`,
    `min_sample`,
    `satuan`,
    `duration_days`,
    `price`,
    `method`,
    `kan`,
    `created_at`
  )
VALUES
  (
    18,
    1,
    1,
    'Pengujian Jumlah Bahan Dalam Agregate Yang Lolos Saringan Nomor 200',
    '5',
    'Kilogram',
    14,
    180000.00,
    NULL,
    'Ya',
    '2026-03-27 23:13:34'
  );
INSERT INTO
  `services` (
    `id`,
    `category_id`,
    `test_type_id`,
    `service_name`,
    `min_sample`,
    `satuan`,
    `duration_days`,
    `price`,
    `method`,
    `kan`,
    `created_at`
  )
VALUES
  (
    19,
    2,
    1,
    'Pengujian Berat Jenis Tanah',
    '10',
    'Kilogram',
    14,
    90000.00,
    NULL,
    'Tidak',
    '2026-03-27 23:13:34'
  );
INSERT INTO
  `services` (
    `id`,
    `category_id`,
    `test_type_id`,
    `service_name`,
    `min_sample`,
    `satuan`,
    `duration_days`,
    `price`,
    `method`,
    `kan`,
    `created_at`
  )
VALUES
  (
    20,
    3,
    1,
    'Pengujian Lengkung Logam',
    '2',
    'Buah',
    7,
    125000.00,
    NULL,
    'Tidak',
    '2026-03-27 23:13:34'
  );
INSERT INTO
  `services` (
    `id`,
    `category_id`,
    `test_type_id`,
    `service_name`,
    `min_sample`,
    `satuan`,
    `duration_days`,
    `price`,
    `method`,
    `kan`,
    `created_at`
  )
VALUES
  (
    21,
    4,
    1,
    'Pengujian Kuat Tekan Mortar',
    '3',
    'Buah',
    7,
    30000.00,
    NULL,
    'Tidak',
    '2026-03-27 23:13:34'
  );
INSERT INTO
  `services` (
    `id`,
    `category_id`,
    `test_type_id`,
    `service_name`,
    `min_sample`,
    `satuan`,
    `duration_days`,
    `price`,
    `method`,
    `kan`,
    `created_at`
  )
VALUES
  (
    22,
    5,
    2,
    'Pengujian Kuat Tekan Beton Kubus',
    '3',
    'Buah',
    7,
    60000.00,
    'SNI 03-1974-1990',
    'Ya',
    '2026-03-27 23:13:34'
  );
INSERT INTO
  `services` (
    `id`,
    `category_id`,
    `test_type_id`,
    `service_name`,
    `min_sample`,
    `satuan`,
    `duration_days`,
    `price`,
    `method`,
    `kan`,
    `created_at`
  )
VALUES
  (
    23,
    5,
    2,
    'Pengujian Kuat Tekan Beton Silinder',
    '3',
    'Buah',
    7,
    60000.00,
    'SNI 1974:2011',
    'Ya',
    '2026-03-27 23:13:35'
  );
INSERT INTO
  `services` (
    `id`,
    `category_id`,
    `test_type_id`,
    `service_name`,
    `min_sample`,
    `satuan`,
    `duration_days`,
    `price`,
    `method`,
    `kan`,
    `created_at`
  )
VALUES
  (
    24,
    5,
    2,
    'Pengujian Inti Beton Hasil Pemboran',
    '3',
    'Titik',
    7,
    100000.00,
    'SNI 2492-2018',
    'Ya',
    '2026-03-27 23:13:35'
  );
INSERT INTO
  `services` (
    `id`,
    `category_id`,
    `test_type_id`,
    `service_name`,
    `min_sample`,
    `satuan`,
    `duration_days`,
    `price`,
    `method`,
    `kan`,
    `created_at`
  )
VALUES
  (
    25,
    5,
    2,
    'Pengujian Densitas Tanah Di Tempat (Lapangan) Dengan Alat Konus Pasir',
    '3',
    'Titik',
    7,
    400000.00,
    NULL,
    'Tidak',
    '2026-03-27 23:13:35'
  );
INSERT INTO
  `services` (
    `id`,
    `category_id`,
    `test_type_id`,
    `service_name`,
    `min_sample`,
    `satuan`,
    `duration_days`,
    `price`,
    `method`,
    `kan`,
    `created_at`
  )
VALUES
  (
    26,
    5,
    2,
    'Pengujian CBR Lapangan',
    '3',
    'Titik',
    7,
    250000.00,
    NULL,
    'Tidak',
    '2026-03-27 23:13:35'
  );
INSERT INTO
  `services` (
    `id`,
    `category_id`,
    `test_type_id`,
    `service_name`,
    `min_sample`,
    `satuan`,
    `duration_days`,
    `price`,
    `method`,
    `kan`,
    `created_at`
  )
VALUES
  (
    27,
    5,
    2,
    'Pengujian DCP',
    '3',
    'Titik',
    7,
    150000.00,
    NULL,
    'Tidak',
    '2026-03-27 23:13:35'
  );
INSERT INTO
  `services` (
    `id`,
    `category_id`,
    `test_type_id`,
    `service_name`,
    `min_sample`,
    `satuan`,
    `duration_days`,
    `price`,
    `method`,
    `kan`,
    `created_at`
  )
VALUES
  (
    28,
    5,
    2,
    'Pengujian Angka Pantul Beton Keras/Hammer Test',
    '3',
    'Titik',
    7,
    150000.00,
    NULL,
    'Tidak',
    '2026-03-27 23:13:35'
  );
INSERT INTO
  `services` (
    `id`,
    `category_id`,
    `test_type_id`,
    `service_name`,
    `min_sample`,
    `satuan`,
    `duration_days`,
    `price`,
    `method`,
    `kan`,
    `created_at`
  )
VALUES
  (
    29,
    5,
    2,
    'Pengujian Coring Aspal Beton/Pengeboran Beton 10cm',
    '3',
    'Titik',
    7,
    20000.00,
    NULL,
    'Tidak',
    '2026-03-27 23:13:35'
  );
INSERT INTO
  `services` (
    `id`,
    `category_id`,
    `test_type_id`,
    `service_name`,
    `min_sample`,
    `satuan`,
    `duration_days`,
    `price`,
    `method`,
    `kan`,
    `created_at`
  )
VALUES
  (
    30,
    5,
    2,
    'Pengujian Coring Aspal Beton/Pengeboran Beton 20cm',
    '3',
    'Titik',
    7,
    260000.00,
    NULL,
    'Tidak',
    '2026-03-27 23:13:35'
  );
INSERT INTO
  `services` (
    `id`,
    `category_id`,
    `test_type_id`,
    `service_name`,
    `min_sample`,
    `satuan`,
    `duration_days`,
    `price`,
    `method`,
    `kan`,
    `created_at`
  )
VALUES
  (
    31,
    5,
    2,
    'Pengujian Coring Aspal Beton/Pengeboran Beton 30cm',
    '3',
    'Titik',
    7,
    350000.00,
    NULL,
    'Tidak',
    '2026-03-27 23:13:35'
  );
INSERT INTO
  `services` (
    `id`,
    `category_id`,
    `test_type_id`,
    `service_name`,
    `min_sample`,
    `satuan`,
    `duration_days`,
    `price`,
    `method`,
    `kan`,
    `created_at`
  )
VALUES
  (
    32,
    5,
    2,
    'Pengujian Daya Dukung Tanah',
    '2',
    'Titik',
    7,
    100000.00,
    'SNI 2828-2011',
    'Tidak',
    '2026-03-27 23:13:35'
  );

# ------------------------------------------------------------
# DATA DUMP FOR TABLE: settings
# ------------------------------------------------------------

INSERT INTO
  `settings` (
    `id`,
    `setting_key`,
    `setting_value`,
    `created_at`,
    `updated_at`
  )
VALUES
  (
    1,
    'busy_mode_active',
    '0',
    '0000-00-00 00:00:00',
    '2026-05-21 14:58:28'
  );

# ------------------------------------------------------------
# DATA DUMP FOR TABLE: submission_samples
# ------------------------------------------------------------

INSERT INTO
  `submission_samples` (
    `id`,
    `submission_id`,
    `jenis_sample`,
    `nama_identitas_sample`,
    `jumlah_sample_angka`,
    `jumlah_sample_satuan`,
    `tanggal_pengambilan`,
    `kemasan_sample`,
    `asal_sample`,
    `sample_diambil_oleh`,
    `test_type_id`,
    `test_category_id`,
    `service_id`,
    `price_at_time`,
    `method_at_time`,
    `estimasi_selesai`,
    `created_at`
  )
VALUES
  (
    1,
    1,
    'Agregat',
    'Agregrat Lembut 250',
    20,
    'Kilogram',
    '2026-03-31',
    'Plastik',
    'Gudang',
    'Pelanggan',
    1,
    1,
    1,
    90000.00,
    'SNI 2417:2008',
    NULL,
    '2026-03-28 05:44:41'
  );
INSERT INTO
  `submission_samples` (
    `id`,
    `submission_id`,
    `jenis_sample`,
    `nama_identitas_sample`,
    `jumlah_sample_angka`,
    `jumlah_sample_satuan`,
    `tanggal_pengambilan`,
    `kemasan_sample`,
    `asal_sample`,
    `sample_diambil_oleh`,
    `test_type_id`,
    `test_category_id`,
    `service_id`,
    `price_at_time`,
    `method_at_time`,
    `estimasi_selesai`,
    `created_at`
  )
VALUES
  (
    2,
    2,
    'Beton',
    'Beton Keras ',
    3,
    'Buah',
    '2026-03-29',
    'Safe Box',
    'Gudang',
    'Pelanggan',
    2,
    5,
    10,
    95000.00,
    'SNI 4431-2011',
    NULL,
    '2026-03-28 06:20:35'
  );
INSERT INTO
  `submission_samples` (
    `id`,
    `submission_id`,
    `jenis_sample`,
    `nama_identitas_sample`,
    `jumlah_sample_angka`,
    `jumlah_sample_satuan`,
    `tanggal_pengambilan`,
    `kemasan_sample`,
    `asal_sample`,
    `sample_diambil_oleh`,
    `test_type_id`,
    `test_category_id`,
    `service_id`,
    `price_at_time`,
    `method_at_time`,
    `estimasi_selesai`,
    `created_at`
  )
VALUES
  (
    3,
    3,
    'Tanah',
    'Agregrat Lembut 250',
    3,
    'Titik',
    '2026-03-28',
    'Plastik',
    'Gudang',
    'Pelanggan',
    2,
    2,
    25,
    400000.00,
    '-',
    NULL,
    '2026-03-28 06:32:34'
  );
INSERT INTO
  `submission_samples` (
    `id`,
    `submission_id`,
    `jenis_sample`,
    `nama_identitas_sample`,
    `jumlah_sample_angka`,
    `jumlah_sample_satuan`,
    `tanggal_pengambilan`,
    `kemasan_sample`,
    `asal_sample`,
    `sample_diambil_oleh`,
    `test_type_id`,
    `test_category_id`,
    `service_id`,
    `price_at_time`,
    `method_at_time`,
    `estimasi_selesai`,
    `created_at`
  )
VALUES
  (
    4,
    4,
    'Beton',
    'Agregrat Lembut 250',
    50,
    'Kilogram',
    '2026-03-28',
    'Plastik',
    'Gudang',
    'Pelanggan',
    1,
    1,
    16,
    110000.00,
    '-',
    NULL,
    '2026-03-28 07:01:27'
  );
INSERT INTO
  `submission_samples` (
    `id`,
    `submission_id`,
    `jenis_sample`,
    `nama_identitas_sample`,
    `jumlah_sample_angka`,
    `jumlah_sample_satuan`,
    `tanggal_pengambilan`,
    `kemasan_sample`,
    `asal_sample`,
    `sample_diambil_oleh`,
    `test_type_id`,
    `test_category_id`,
    `service_id`,
    `price_at_time`,
    `method_at_time`,
    `estimasi_selesai`,
    `created_at`
  )
VALUES
  (
    5,
    5,
    'Beton',
    'Agregrat Lembut 250',
    50,
    'Kilogram',
    '2026-03-28',
    'Plastik',
    'Gudang',
    'Pelanggan',
    1,
    1,
    16,
    110000.00,
    '-',
    NULL,
    '2026-03-28 07:20:21'
  );
INSERT INTO
  `submission_samples` (
    `id`,
    `submission_id`,
    `jenis_sample`,
    `nama_identitas_sample`,
    `jumlah_sample_angka`,
    `jumlah_sample_satuan`,
    `tanggal_pengambilan`,
    `kemasan_sample`,
    `asal_sample`,
    `sample_diambil_oleh`,
    `test_type_id`,
    `test_category_id`,
    `service_id`,
    `price_at_time`,
    `method_at_time`,
    `estimasi_selesai`,
    `created_at`
  )
VALUES
  (
    6,
    6,
    'Agregat,Besi',
    'Agregrat Lembut 250',
    3,
    'Titik',
    '2026-03-28',
    'Plastik',
    'Gudang',
    'Pelanggan',
    2,
    5,
    27,
    150000.00,
    '-',
    NULL,
    '2026-03-28 07:25:36'
  );
INSERT INTO
  `submission_samples` (
    `id`,
    `submission_id`,
    `jenis_sample`,
    `nama_identitas_sample`,
    `jumlah_sample_angka`,
    `jumlah_sample_satuan`,
    `tanggal_pengambilan`,
    `kemasan_sample`,
    `asal_sample`,
    `sample_diambil_oleh`,
    `test_type_id`,
    `test_category_id`,
    `service_id`,
    `price_at_time`,
    `method_at_time`,
    `estimasi_selesai`,
    `created_at`
  )
VALUES
  (
    7,
    7,
    'Agregat',
    'halus',
    5,
    'Kilogram',
    '2026-03-28',
    'gudang',
    'kas',
    'Pelanggan',
    1,
    1,
    2,
    110000.00,
    'SNI ASTM C136:2012',
    NULL,
    '2026-03-28 07:31:07'
  );
INSERT INTO
  `submission_samples` (
    `id`,
    `submission_id`,
    `jenis_sample`,
    `nama_identitas_sample`,
    `jumlah_sample_angka`,
    `jumlah_sample_satuan`,
    `tanggal_pengambilan`,
    `kemasan_sample`,
    `asal_sample`,
    `sample_diambil_oleh`,
    `test_type_id`,
    `test_category_id`,
    `service_id`,
    `price_at_time`,
    `method_at_time`,
    `estimasi_selesai`,
    `created_at`
  )
VALUES
  (
    8,
    8,
    'Tanah',
    'Beton Keras ',
    2,
    'Titik',
    '2026-03-28',
    'Safe Box',
    'Gudang',
    'Pelanggan',
    2,
    2,
    32,
    100000.00,
    'SNI 2828-2011',
    NULL,
    '2026-03-28 07:34:29'
  );
INSERT INTO
  `submission_samples` (
    `id`,
    `submission_id`,
    `jenis_sample`,
    `nama_identitas_sample`,
    `jumlah_sample_angka`,
    `jumlah_sample_satuan`,
    `tanggal_pengambilan`,
    `kemasan_sample`,
    `asal_sample`,
    `sample_diambil_oleh`,
    `test_type_id`,
    `test_category_id`,
    `service_id`,
    `price_at_time`,
    `method_at_time`,
    `estimasi_selesai`,
    `created_at`
  )
VALUES
  (
    9,
    9,
    'Beton',
    'Beton Keras ',
    3,
    'Titik',
    '2026-03-28',
    'Safe Box',
    'Gudang',
    'Pelanggan',
    2,
    5,
    24,
    100000.00,
    'SNI 2492-2018',
    NULL,
    '2026-03-28 07:38:07'
  );
INSERT INTO
  `submission_samples` (
    `id`,
    `submission_id`,
    `jenis_sample`,
    `nama_identitas_sample`,
    `jumlah_sample_angka`,
    `jumlah_sample_satuan`,
    `tanggal_pengambilan`,
    `kemasan_sample`,
    `asal_sample`,
    `sample_diambil_oleh`,
    `test_type_id`,
    `test_category_id`,
    `service_id`,
    `price_at_time`,
    `method_at_time`,
    `estimasi_selesai`,
    `created_at`
  )
VALUES
  (
    10,
    10,
    'Beton',
    'Silinder Benton K-250',
    50,
    'Kilogram',
    '2026-06-27',
    'Safe Box',
    'Gudang',
    'Pihak Ketiga',
    1,
    1,
    1,
    90000.00,
    'SNI 2417:2008',
    NULL,
    '2026-06-21 19:30:45'
  );

# ------------------------------------------------------------
# DATA DUMP FOR TABLE: submissions
# ------------------------------------------------------------

INSERT INTO
  `submissions` (
    `id`,
    `user_id`,
    `no_permohonan`,
    `nama_pemohon`,
    `nama_instansi`,
    `alamat_pemohon`,
    `nomor_telepon`,
    `email_pemohon`,
    `nama_proyek`,
    `lokasi_proyek`,
    `file_surat_permohonan`,
    `file_ktp`,
    `catatan_tambahan`,
    `catatan_admin`,
    `jadwal_sampling`,
    `status`,
    `created_at`,
    `updated_at`
  )
VALUES
  (
    1,
    6,
    'LK-001/SKEW',
    'Gadis Suwadni',
    'PT. Suwandi',
    'Pt. Rorojongrang',
    '089651588072',
    'gadis123@gmail.com',
    'Pembangunan',
    'Gunung Sawit',
    'surat_permohonan-1774651481385-480137750.pdf',
    'scan_ktp-1774651481390-702876537.jpg',
    'mantap jiwa',
    NULL,
    NULL,
    'Menunggu Verifikasi',
    '2026-03-28 05:44:41',
    '2026-05-01 18:39:40'
  );
INSERT INTO
  `submissions` (
    `id`,
    `user_id`,
    `no_permohonan`,
    `nama_pemohon`,
    `nama_instansi`,
    `alamat_pemohon`,
    `nomor_telepon`,
    `email_pemohon`,
    `nama_proyek`,
    `lokasi_proyek`,
    `file_surat_permohonan`,
    `file_ktp`,
    `catatan_tambahan`,
    `catatan_admin`,
    `jadwal_sampling`,
    `status`,
    `created_at`,
    `updated_at`
  )
VALUES
  (
    2,
    6,
    'PER/A/178/I/2026',
    'Gadis',
    'PT. Suwandi',
    '1233',
    '089651588072',
    'gadis123@gmail.com',
    'Jey Mine',
    'Jakarta Barat',
    'surat_permohonan-1774653635498-927918769.pdf',
    'scan_ktp-1774653635503-452291053.jpg',
    'cakep abis',
    NULL,
    NULL,
    'Menunggu Verifikasi',
    '2026-03-28 06:20:35',
    '2026-03-28 06:20:35'
  );
INSERT INTO
  `submissions` (
    `id`,
    `user_id`,
    `no_permohonan`,
    `nama_pemohon`,
    `nama_instansi`,
    `alamat_pemohon`,
    `nomor_telepon`,
    `email_pemohon`,
    `nama_proyek`,
    `lokasi_proyek`,
    `file_surat_permohonan`,
    `file_ktp`,
    `catatan_tambahan`,
    `catatan_admin`,
    `jadwal_sampling`,
    `status`,
    `created_at`,
    `updated_at`
  )
VALUES
  (
    3,
    6,
    'IK-001',
    'Gadis',
    'PT. Suwandi',
    'Pt. Rorojongrang',
    '089651588072',
    'gadis123@gmail.com',
    'Pembangunan',
    'Gunung Sawit',
    'surat_permohonan-1774654354214-147445322.pdf',
    'scan_ktp-1774654354218-982929527.png',
    'sd',
    NULL,
    '2026-05-08',
    'Dibatalkan',
    '2026-03-28 06:32:34',
    '2026-05-20 17:44:29'
  );
INSERT INTO
  `submissions` (
    `id`,
    `user_id`,
    `no_permohonan`,
    `nama_pemohon`,
    `nama_instansi`,
    `alamat_pemohon`,
    `nomor_telepon`,
    `email_pemohon`,
    `nama_proyek`,
    `lokasi_proyek`,
    `file_surat_permohonan`,
    `file_ktp`,
    `catatan_tambahan`,
    `catatan_admin`,
    `jadwal_sampling`,
    `status`,
    `created_at`,
    `updated_at`
  )
VALUES
  (
    4,
    6,
    'LK-001/SKEW',
    'Gadis',
    'PT. Suwandi',
    'Pt. Rorojongrang',
    '089651588072',
    'gadis123@gmail.com',
    'Pembangunan',
    'Gunung Sawit',
    'surat_permohonan-1774656087060-90168033.pdf',
    'scan_ktp-1774656087065-209392389.jpg',
    '',
    NULL,
    NULL,
    'Menunggu Verifikasi',
    '2026-03-28 07:01:27',
    '2026-03-28 07:01:27'
  );
INSERT INTO
  `submissions` (
    `id`,
    `user_id`,
    `no_permohonan`,
    `nama_pemohon`,
    `nama_instansi`,
    `alamat_pemohon`,
    `nomor_telepon`,
    `email_pemohon`,
    `nama_proyek`,
    `lokasi_proyek`,
    `file_surat_permohonan`,
    `file_ktp`,
    `catatan_tambahan`,
    `catatan_admin`,
    `jadwal_sampling`,
    `status`,
    `created_at`,
    `updated_at`
  )
VALUES
  (
    5,
    6,
    'LK-001/SKEW',
    'Gadis',
    'PT. Suwandi',
    'Pt. Rorojongrang',
    '089651588072',
    'gadis123@gmail.com',
    'Pembangunan',
    'Gunung Sawit',
    'surat_permohonan-1774657221105-999695002.pdf',
    'scan_ktp-1774657221109-296639536.pdf',
    'q',
    NULL,
    NULL,
    'Dibatalkan',
    '2026-03-28 07:20:21',
    '2026-05-20 17:45:05'
  );
INSERT INTO
  `submissions` (
    `id`,
    `user_id`,
    `no_permohonan`,
    `nama_pemohon`,
    `nama_instansi`,
    `alamat_pemohon`,
    `nomor_telepon`,
    `email_pemohon`,
    `nama_proyek`,
    `lokasi_proyek`,
    `file_surat_permohonan`,
    `file_ktp`,
    `catatan_tambahan`,
    `catatan_admin`,
    `jadwal_sampling`,
    `status`,
    `created_at`,
    `updated_at`
  )
VALUES
  (
    6,
    6,
    'IK-001',
    'Gadis',
    'PT. Suwandi',
    'lk',
    '089651588072',
    'gadis123@gmail.com',
    'Pembangunan',
    'Gunung Sawit',
    'surat_permohonan-1774657536474-957430155.pdf',
    'scan_ktp-1774657536476-617510215.pdf',
    '',
    'udah selesai',
    NULL,
    'Selesai',
    '2026-03-28 07:25:36',
    '2026-05-20 17:08:43'
  );
INSERT INTO
  `submissions` (
    `id`,
    `user_id`,
    `no_permohonan`,
    `nama_pemohon`,
    `nama_instansi`,
    `alamat_pemohon`,
    `nomor_telepon`,
    `email_pemohon`,
    `nama_proyek`,
    `lokasi_proyek`,
    `file_surat_permohonan`,
    `file_ktp`,
    `catatan_tambahan`,
    `catatan_admin`,
    `jadwal_sampling`,
    `status`,
    `created_at`,
    `updated_at`
  )
VALUES
  (
    7,
    6,
    'LK-001/SKEW',
    'Gadis',
    'PT. Suwandi',
    'k',
    '089651588072',
    'gadis123@gmail.com',
    'po',
    'we',
    'surat_permohonan-1774657867529-205828354.pdf',
    'scan_ktp-1774657867531-10315258.pdf',
    'w',
    NULL,
    NULL,
    'Selesai',
    '2026-03-28 07:31:07',
    '2026-05-20 17:30:42'
  );
INSERT INTO
  `submissions` (
    `id`,
    `user_id`,
    `no_permohonan`,
    `nama_pemohon`,
    `nama_instansi`,
    `alamat_pemohon`,
    `nomor_telepon`,
    `email_pemohon`,
    `nama_proyek`,
    `lokasi_proyek`,
    `file_surat_permohonan`,
    `file_ktp`,
    `catatan_tambahan`,
    `catatan_admin`,
    `jadwal_sampling`,
    `status`,
    `created_at`,
    `updated_at`
  )
VALUES
  (
    8,
    6,
    'PER/A/178/I/2026',
    'Gadis',
    'PT. Suwandi',
    '1233',
    '089651588072',
    'gadis123@gmail.com',
    'Jey Mine',
    'Jakarta Barat',
    'surat_permohonan-1774658069569-182698023.pdf',
    'scan_ktp-1774658069571-28389236.pdf',
    '',
    NULL,
    NULL,
    'Sedang Diuji',
    '2026-03-28 07:34:29',
    '2026-05-20 17:31:59'
  );
INSERT INTO
  `submissions` (
    `id`,
    `user_id`,
    `no_permohonan`,
    `nama_pemohon`,
    `nama_instansi`,
    `alamat_pemohon`,
    `nomor_telepon`,
    `email_pemohon`,
    `nama_proyek`,
    `lokasi_proyek`,
    `file_surat_permohonan`,
    `file_ktp`,
    `catatan_tambahan`,
    `catatan_admin`,
    `jadwal_sampling`,
    `status`,
    `created_at`,
    `updated_at`
  )
VALUES
  (
    9,
    6,
    'PER/A/178/I/2026',
    'Gadis',
    'PT. Suwandi',
    '1233',
    '089651588072',
    'gadis123@gmail.com',
    'Jey Mine',
    'Jakarta Barat',
    'surat_permohonan-1774658286963-35229102.pdf',
    'scan_ktp-1774658286982-629170499.pdf',
    '',
    NULL,
    NULL,
    'Sedang Diuji',
    '2026-03-28 07:38:07',
    '2026-05-03 17:18:18'
  );
INSERT INTO
  `submissions` (
    `id`,
    `user_id`,
    `no_permohonan`,
    `nama_pemohon`,
    `nama_instansi`,
    `alamat_pemohon`,
    `nomor_telepon`,
    `email_pemohon`,
    `nama_proyek`,
    `lokasi_proyek`,
    `file_surat_permohonan`,
    `file_ktp`,
    `catatan_tambahan`,
    `catatan_admin`,
    `jadwal_sampling`,
    `status`,
    `created_at`,
    `updated_at`
  )
VALUES
  (
    10,
    7,
    'KA/012/VI/2026',
    'Kaloka Aswara',
    'PT. Ama',
    'Jalan Bandung Dilan',
    '089651588072',
    'kaloka16@gmail.com',
    'Bikin Perumahan',
    'Jl. Suka Cita',
    'surat_permohonan-1782045044960-576012915.pdf',
    'scan_ktp-1782045044975-382402831.pdf',
    'Kondisi Lembab, tolong dikeringkan terlebih dahulu',
    'Mohon segera dilunaskan, untuk mendapatkan laporan hasil pengujian',
    '2026-06-30',
    'Belum Lunas',
    '2026-06-21 19:30:45',
    '2026-06-21 19:51:24'
  );

# ------------------------------------------------------------
# DATA DUMP FOR TABLE: test_categories
# ------------------------------------------------------------

INSERT INTO
  `test_categories` (`id`, `test_type_id`, `category_name`, `created_at`)
VALUES
  (1, 1, 'Agregat', '2026-02-28 15:55:51');
INSERT INTO
  `test_categories` (`id`, `test_type_id`, `category_name`, `created_at`)
VALUES
  (2, 1, 'Tanah', '2026-02-28 15:55:51');
INSERT INTO
  `test_categories` (`id`, `test_type_id`, `category_name`, `created_at`)
VALUES
  (3, 1, 'Besi / Baja', '2026-02-28 15:55:51');
INSERT INTO
  `test_categories` (`id`, `test_type_id`, `category_name`, `created_at`)
VALUES
  (4, 1, 'Mortar / Lainnya', '2026-02-28 15:55:51');
INSERT INTO
  `test_categories` (`id`, `test_type_id`, `category_name`, `created_at`)
VALUES
  (5, 2, 'Beton', '2026-02-28 15:55:51');
INSERT INTO
  `test_categories` (`id`, `test_type_id`, `category_name`, `created_at`)
VALUES
  (6, 2, 'Aspal', '2026-02-28 15:55:51');

# ------------------------------------------------------------
# DATA DUMP FOR TABLE: test_reports
# ------------------------------------------------------------

INSERT INTO
  `test_reports` (
    `id`,
    `submission_id`,
    `file_laporan`,
    `no_laporan`,
    `tanggal_selesai`,
    `catatan_laporan`,
    `created_at`
  )
VALUES
  (
    1,
    6,
    'laporan-1779271681427-883370282.pdf',
    NULL,
    NULL,
    NULL,
    '2026-05-20 17:08:01'
  );

# ------------------------------------------------------------
# DATA DUMP FOR TABLE: test_types
# ------------------------------------------------------------

INSERT INTO
  `test_types` (`id`, `type_name`, `created_at`)
VALUES
  (1, 'PENGUJIAN BAHAN', '2026-02-28 15:55:51');
INSERT INTO
  `test_types` (`id`, `type_name`, `created_at`)
VALUES
  (2, 'PENGUJIAN KONSTRUKSI', '2026-02-28 15:55:51');

# ------------------------------------------------------------
# DATA DUMP FOR TABLE: users
# ------------------------------------------------------------

INSERT INTO
  `users` (
    `id`,
    `email`,
    `password`,
    `role`,
    `full_name`,
    `nama_instansi`,
    `alamat`,
    `nomor_telepon`,
    `avatar`,
    `created_at`,
    `updated_at`
  )
VALUES
  (
    1,
    'pawpaw@gmail.com',
    '$2b$10$mKQSetMmxAc2Mq4UuhWS.e1l6/ZfUYcwD9cf23nCvQtDKnCPwPF.6',
    'pelanggan',
    'Eolia Shalbillah Gadis Suwandi',
    'PT. Suka Haechan',
    'Jl. Kemayoran, No.16, Jakarta Pusat',
    '089651588072',
    '/uploads/avatar/avatar-1772599220550-854122926.jpg',
    '2026-02-28 17:19:57',
    '2026-03-04 12:04:21'
  );
INSERT INTO
  `users` (
    `id`,
    `email`,
    `password`,
    `role`,
    `full_name`,
    `nama_instansi`,
    `alamat`,
    `nomor_telepon`,
    `avatar`,
    `created_at`,
    `updated_at`
  )
VALUES
  (
    4,
    'admin@uptd.gov.id',
    '$2b$10$uW.KAgWkQ5Kj120dFzZJg.yEwmnQIanfqcJX7lC8HbSj7Vy37Z9kS',
    'admin',
    'Administrator UPTD',
    'UPTD Laboratorium Pengujian',
    'Kantor UPTD Laboratorium, Provinsi Banten',
    '0254-1234567',
    '/uploads/avatar/avatar-1782047981177-532402371.jpg',
    '2026-03-04 12:41:21',
    '2026-06-21 20:19:44'
  );
INSERT INTO
  `users` (
    `id`,
    `email`,
    `password`,
    `role`,
    `full_name`,
    `nama_instansi`,
    `alamat`,
    `nomor_telepon`,
    `avatar`,
    `created_at`,
    `updated_at`
  )
VALUES
  (
    6,
    'gadis1234@gmail.com',
    '$2b$10$Ngoepwqea4tQJSFqD/j2EuYViT7RFLjjj9H85Sj.bRNLmdrlRGr/a',
    'pelanggan',
    'Gadis Suwandi',
    'PT. Suwandi16',
    'Jl. Diponegoro, No.12345',
    '089651588072',
    NULL,
    '2026-03-28 00:08:07',
    '2026-03-28 08:14:50'
  );
INSERT INTO
  `users` (
    `id`,
    `email`,
    `password`,
    `role`,
    `full_name`,
    `nama_instansi`,
    `alamat`,
    `nomor_telepon`,
    `avatar`,
    `created_at`,
    `updated_at`
  )
VALUES
  (
    7,
    'kaloka16@gmail.com',
    '$2b$10$KzxXn5REV8hnYaAdoxhWSeNSYHZJ78OpjZhnheDlzAgQZqg7B3mWS',
    'pelanggan',
    'Kaloka Aswaraa',
    'PT. Ama',
    'Jl. In Dulu Aja',
    '089651588072',
    '/uploads/avatar/avatar-1782045195828-440523254.jpg',
    '2026-06-21 19:23:32',
    '2026-06-21 19:34:06'
  );

# ------------------------------------------------------------
# TRIGGER DUMP FOR: trg_update_payment_total_insert
# ------------------------------------------------------------

DROP TRIGGER IF EXISTS trg_update_payment_total_insert;
DELIMITER ;;
CREATE TRIGGER `trg_update_payment_total_insert` AFTER INSERT ON `submission_samples` FOR EACH ROW BEGIN
    CALL sp_update_payment_total(NEW.submission_id);
END;;
DELIMITER ;

# ------------------------------------------------------------
# TRIGGER DUMP FOR: trg_update_payment_total_update
# ------------------------------------------------------------

DROP TRIGGER IF EXISTS trg_update_payment_total_update;
DELIMITER ;;
CREATE TRIGGER `trg_update_payment_total_update` AFTER UPDATE ON `submission_samples` FOR EACH ROW BEGIN
    CALL sp_update_payment_total(NEW.submission_id);
END;;
DELIMITER ;

# ------------------------------------------------------------
# TRIGGER DUMP FOR: trg_update_payment_total_delete
# ------------------------------------------------------------

DROP TRIGGER IF EXISTS trg_update_payment_total_delete;
DELIMITER ;;
CREATE TRIGGER `trg_update_payment_total_delete` AFTER DELETE ON `submission_samples` FOR EACH ROW BEGIN
    CALL sp_update_payment_total(OLD.submission_id);
END;;
DELIMITER ;

# ------------------------------------------------------------
# TRIGGER DUMP FOR: trg_create_payment_after_submission
# ------------------------------------------------------------

DROP TRIGGER IF EXISTS trg_create_payment_after_submission;
DELIMITER ;;
CREATE TRIGGER `trg_create_payment_after_submission` AFTER INSERT ON `submissions` FOR EACH ROW BEGIN
    INSERT INTO payments (
        submission_id, 
        no_invoice
    ) VALUES (
        NEW.id,
        CONCAT('INV-', YEAR(NOW()), '-', LPAD(NEW.id, 5, '0'))
    );
END;;
DELIMITER ;

/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;
/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
