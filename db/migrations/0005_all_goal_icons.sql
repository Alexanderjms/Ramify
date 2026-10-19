CREATE TEMP TABLE ramify_goal_icons_backup AS SELECT id, icon FROM goals;

ALTER TABLE goals DROP COLUMN icon;
ALTER TABLE goals ADD COLUMN icon TEXT NOT NULL DEFAULT 'flag-fill'
  CHECK (length(icon) BETWEEN 1 AND 100 AND icon NOT GLOB '*[^a-z0-9-]*');

UPDATE goals SET icon = (
  SELECT backup.icon FROM ramify_goal_icons_backup backup WHERE backup.id = goals.id
);

DROP TABLE ramify_goal_icons_backup;
