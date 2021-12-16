DROP DATABASE IF EXISTS telegram_bot;
CREATE DATABASE IF NOT EXISTS telegram_bot;
USE telegram_bot;

DROP TABLE IF EXISTS user;

CREATE TABLE IF NOT EXISTS user
  (
     id           INT PRIMARY KEY auto_increment,
     telegram_id  INT UNIQUE NOT NULL,
     role         ENUM('Admin', 'SuperUser') DEFAULT 'SuperUser'
  );

DROP TABLE IF EXISTS user_notes;

CREATE TABLE IF NOT EXISTS user_notes
  (
     id           INT PRIMARY KEY auto_increment,
     user_id      INT NOT NULL,
     name         VARCHAR(100) NOT NULL,
     text         VARCHAR(255) NOT NULL,
     status       INT NOT NULL DEFAULT 10,
     created_at   INT NOT NULL,
     updated_at   INT NOT NULL,
     deadline_at  INT NOT NULL
  );

DROP TABLE IF EXISTS hometask;

CREATE TABLE IF NOT EXISTS hometask
  (
     id           INT PRIMARY KEY auto_increment,
     user_id      INT NOT NULL,
     name         VARCHAR(100) NOT NULL,
     text         VARCHAR(255) NOT NULL,
     status       INT NOT NULL DEFAULT 10,
     priority     INT NOT NULL DEFAULT 10,
     created_at   INT NOT NULL,
     updated_at   INT NOT NULL,
     deadline_at  INT NOT NULL
  );
