DO $$
BEGIN
  IF current_setting('server_version_num')::integer < 170000 THEN
    RAISE EXCEPTION 'Lythaus migrations require PostgreSQL 17 or newer; found %', version();
  END IF;
END $$;
