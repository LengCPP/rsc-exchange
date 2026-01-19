-- SQL script to populate database with test data
-- Usage: Execute in PostgreSQL (via psql or pgAdmin)

-- Insert Communities if they don't exist
INSERT INTO community (id, name, description, is_closed)
VALUES 
    (gen_random_uuid(), 'Tech Enthusiasts', 'Community for tech enthusiasts.', false),
    (gen_random_uuid(), 'Book Worms', 'Community for book lovers.', false),
    (gen_random_uuid(), 'Bloodborne Lore', 'A mysterious community about the secrets of Yharnam.', false)
ON CONFLICT (name) DO NOTHING;

-- Function to populate with some random users and items
DO $$
DECLARE
    u_id UUID;
    c_id UUID;
    book_titles TEXT[] := ARRAY['The Great Gatsby', '1984', 'To Kill a Mockingbird', 'The Paleblood Sky'];
    book_authors TEXT[] := ARRAY['F. Scott Fitzgerald', 'George Orwell', 'Harper Lee', 'Caryll Runes'];
    i INT;
BEGIN
    FOR i IN 1..5 LOOP
        -- Create User
        INSERT INTO "user" (id, email, hashed_password, full_name, is_active, is_superuser)
        VALUES (
            gen_random_uuid(), 
            'test_user_' || i || '@example.com', 
            '$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW', -- 'password123'
            'Test User ' || i,
            true,
            false
        )
        RETURNING id INTO u_id;

        -- Join a community
        SELECT id INTO c_id FROM community ORDER BY random() LIMIT 1;
        INSERT INTO usercommunity (user_id, community_id) VALUES (u_id, c_id) ON CONFLICT DO NOTHING;

        -- Add a random book
        INSERT INTO item (id, title, description, item_type, extra_data, count)
        VALUES (
            gen_random_uuid(),
            book_titles[1 + floor(random() * 4)],
            'A very interesting book.',
            'book',
            jsonb_build_object('author', book_authors[1 + floor(random() * 4)]),
            1
        )
        RETURNING id INTO c_id; -- Reuse c_id for item_id
        
        INSERT INTO useritem (user_id, item_id) VALUES (u_id, c_id);

        -- Add a general item
        INSERT INTO item (id, title, description, item_type, count)
        VALUES (
            gen_random_uuid(),
            'Random Gadget ' || i,
            'Useful gadget description.',
            'electronics',
            1
        )
        RETURNING id INTO c_id;
        
        INSERT INTO useritem (user_id, item_id) VALUES (u_id, c_id);
    END LOOP;
END $$;