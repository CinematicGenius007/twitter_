CREATE TABLE `users` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(40) NOT NULL,
  `handle` varchar(40) NOT NULL,
  `profile` varchar(200) DEFAULT NULL,
  `password` varchar(20) NOT NULL,
  PRIMARY KEY (`id`)
);

CREATE TABLE `tweets` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tweet` text NOT NULL,
  `likes` int DEFAULT '0',
  `media` varchar(200) DEFAULT NULL,
  `user` int NOT NULL,
  `timestamp` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `fk_user` (`user`),
  CONSTRAINT `fk_user` FOREIGN KEY (`user`) REFERENCES `users` (`id`) ON DELETE CASCADE
);

CREATE TABLE `likes` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tweet` int NOT NULL,
  `user` int NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `un_tweet_user` (`tweet`,`user`),
  KEY `fk_likes_user` (`user`),
  CONSTRAINT `fk_likes_tweet` FOREIGN KEY (`tweet`) REFERENCES `tweets` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_likes_user` FOREIGN KEY (`user`) REFERENCES `users` (`id`) ON DELETE CASCADE
);

CREATE TABLE `replies` (
  `id` int NOT NULL AUTO_INCREMENT,
  `reply` text NOT NULL,
  `tweet` int NOT NULL,
  `user` int NOT NULL,
  `timestamp` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `fk_reply_user` (`user`),
  KEY `fk_tweet` (`tweet`),
  CONSTRAINT `fk_reply_user` FOREIGN KEY (`user`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_tweet` FOREIGN KEY (`tweet`) REFERENCES `tweets` (`id`) ON DELETE CASCADE
);

DELIMITER $$

-- Trigger to update the likes count when a new record is inserted into the likes table
CREATE TRIGGER insert_like_trigger
AFTER INSERT
ON likes
FOR EACH ROW
BEGIN
    UPDATE tweets
    SET likes = likes + 1
    WHERE id = NEW.tweet;
END$$

-- Trigger to update the likes count when a record is deleted from the likes table
CREATE TRIGGER delete_like_trigger
AFTER DELETE
ON likes
FOR EACH ROW
BEGIN
    UPDATE tweets
    SET likes = likes - 1
    WHERE id = OLD.tweet;
END$$

DELIMITER ;

