INSERT INTO "GiftCode" ("id", "code", "energyAmount", "active")
VALUES (gen_random_uuid(), 'FERROFOOT', 5, true)
ON CONFLICT ("code") DO NOTHING;
