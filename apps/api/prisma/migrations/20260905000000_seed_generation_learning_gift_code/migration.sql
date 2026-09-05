INSERT INTO "GiftCode" ("id", "code", "energyAmount", "active")
VALUES (gen_random_uuid(), 'GENERATION-LEARNING', 5, true)
ON CONFLICT ("code") DO NOTHING;
