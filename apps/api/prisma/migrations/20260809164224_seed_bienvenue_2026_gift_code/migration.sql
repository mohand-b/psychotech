INSERT INTO "GiftCode" ("id", "code", "energyAmount", "active")
VALUES (gen_random_uuid(), 'BIENVENUE-2026', 10, true)
ON CONFLICT ("code") DO NOTHING;
