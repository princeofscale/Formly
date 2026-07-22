-- Height joins the daily body_measurements log so /progress can chart
-- weight and height history instead of only the current profile values.
alter table body_measurements
  add column if not exists height_cm numeric(5, 1) check (height_cm is null or height_cm > 0);
