DO $$
BEGIN
  IF current_setting('server_version_num')::integer < 180000 THEN
    RAISE EXCEPTION 'Lythaus migrations require PostgreSQL 18 or newer; found %', version();
  END IF;
END $$;
