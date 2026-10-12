-- MySQL dump 10.13  Distrib 8.0.46, for Win64 (x86_64)
--
-- Host: localhost    Database: corproute
-- ------------------------------------------------------
-- Server version	8.0.46











--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;


CREATE TABLE `users` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `email` varchar(150) NOT NULL,
  `password` varchar(255) NOT NULL,
  `role` enum('employee','manager','admin','travel_coordinator','finance') DEFAULT 'employee',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `uuid` varchar(36) DEFAULT NULL,
  `full_name` varchar(100) DEFAULT NULL,
  `username` varchar(100) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`),
  UNIQUE KEY `uuid` (`uuid`),
  UNIQUE KEY `username` (`username`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;

--
-- Dumping data for table `users`
--


INSERT INTO `users` VALUES (1,'Meenakshi Test','meena123@gmail.com','test1234','employee','2026-10-05 06:53:11','c9171122-33ea-4573-a9e9-4e7131a2de0d','Meenakshi Test','meena123'),(2,'Meenakshi Potedar','potedarmeenakshi@gmail.com','Meenakshi@9899','employee','2026-10-05 06:54:19','82488e03-9dce-486b-90bb-6a131723e45','Meenakshi Potedar','Meenakshi.p'),(3,'CorpRoute Manager','manager@corproute.com','raju9899','manager','2026-10-05 00:00:00','manager-001','CorpRoute Manager','RajeswaraRao.P'),(4,'priya rajput','priya.employee@corproute.com','Priya1234','employee','2026-10-10 07:04:41','e3700dd6-f555-4346-9fbb-129c0f03827f','priya rajput','priya.emp'),(5,'Rajeswararao potedar','lawoffice9899@gmail.com','$2b$12$tg6kTE8SMlhIFZtVNdgpD.hivWkTAog41C64Hd3RRrhNJGPjH7HBq','manager','2026-10-10 08:19:15','100788c5-b57c-425f-b55b-5fa1a931fa9d','Rajeswararao potedar','Rajesh.P'),(6,'Maansi Potedar','potedarmaansi@gmail.com','$2b$12$O9Xeh3EUQ/E4ZO/Ts5YsIepgHn6dEilLYI1XSM9kWMSRv5jT49nc6','employee','2026-10-10 08:45:49','3323d719-b77e-4bf1-b3ea-4ca8d5501366','Maansi Potedar','Maansi.P');


--
-- Table structure for table `travel_requests`
--

DROP TABLE IF EXISTS `travel_requests`;


CREATE TABLE `travel_requests` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int DEFAULT NULL,
  `destination` varchar(150) NOT NULL,
  `purpose` text,
  `departure_date` date DEFAULT NULL,
  `return_date` date DEFAULT NULL,
  `status` enum('Pending','Approved','Rejected') DEFAULT 'Pending',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `uuid` varchar(36) DEFAULT NULL,
  `employee_name` varchar(100) DEFAULT NULL,
  `budget` decimal(12,2) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uuid` (`uuid`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `travel_requests_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=10 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;

--
-- Dumping data for table `travel_requests`
--


INSERT INTO `travel_requests` VALUES (1,NULL,'Bengaluru','company conference','2026-10-10','2026-10-13','Approved','2026-09-21 04:50:19','39cc128d-8876-457f-b974-134f441d8ab7','Meenakshi',18000.00),(2,NULL,'Mumbai','company conference','2026-09-25','2026-09-30','Rejected','2026-09-21 06:12:51','ede78263-5563-4859-9360-627388710067','Neha',23000.00),(3,NULL,'Pune','company conference','2026-10-02','2026-10-10','Approved','2026-09-21 06:24:28','68fc6d47-f6ae-498c-bbd2-ebc23c6546e7','Sreenidhi',34992.00),(4,NULL,'Bengaluru','company conference','2026-10-10','2026-10-13','Rejected','2026-09-21 06:30:45','70b6c1b5-5a26-4e71-a37a-0a3637929074','Meena',15000.00),(5,NULL,'delhi','meeting','2026-10-10','2026-10-13','Approved','2026-09-24 09:01:07','cfdad342-00d9-4f96-adc3-3780a8ddabd9','maansi',15000.00),(6,NULL,'Delhi','Conference','2026-11-20','2026-11-25','Approved','2026-09-30 19:04:17','a61fd005-902b-4888-ad8f-456f03310b0f','Rajesh',20000.00),(7,NULL,'Mumbai','business meeting','2026-10-20','2026-10-25','Rejected','2026-10-05 04:49:07','064c9936-8252-4142-b794-141dd5a0bd02','sreenu',20000.00),(8,NULL,'Bengaluru','Meeting','2026-10-20','2026-10-23','Approved','2026-10-05 05:30:09','55c36692-afe8-40b7-9f9f-db37a3b41b45','Meena',5000.00),(9,6,'Bengaluru','meeting','2026-10-19','2026-10-21','Approved','2026-10-10 08:47:38','6324d204-b616-49ac-ac5e-bcc286b27a67','Maansi Potedar',4998.00);


--
-- Table structure for table `expenses`
--

DROP TABLE IF EXISTS `expenses`;


CREATE TABLE `expenses` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int DEFAULT NULL,
  `travel_request_id` int DEFAULT NULL,
  `amount` decimal(10,2) NOT NULL,
  `description` text,
  `status` enum('Pending','Approved','Rejected') DEFAULT 'Pending',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `uuid` varchar(36) DEFAULT NULL,
  `employee_name` varchar(100) DEFAULT NULL,
  `category` varchar(50) DEFAULT NULL,
  `expense_date` date DEFAULT NULL,
  `destination` varchar(150) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uuid` (`uuid`),
  KEY `user_id` (`user_id`),
  KEY `travel_request_id` (`travel_request_id`),
  CONSTRAINT `expenses_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`),
  CONSTRAINT `expenses_ibfk_2` FOREIGN KEY (`travel_request_id`) REFERENCES `travel_requests` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;

--
-- Dumping data for table `expenses`
--


INSERT INTO `expenses` VALUES (1,NULL,1,3000.00,'flight charges from htd-blr','Approved','2026-09-30 19:18:56','0e0c6a55-057b-4193-b480-cf3a58056d5d','Meenakshi','Flight','2026-10-10','Bengaluru'),(2,NULL,1,1000.00,'hotel is just for one night,as rest staying is in the guest house for free for the next 4 days','Rejected','2026-10-05 05:35:15','939e803c-3712-423c-996a-e463d6085c83','Meenakshi','Hotel','2026-10-21','Bengaluru');


-- Dump completed on 2026-10-10 20:30:30


