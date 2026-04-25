-- Supabase (PostgreSQL) Database Schema for Coastly
-- Created on: 2026-04-08

-- 1. Users Table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT auth.uid(),
    email TEXT UNIQUE NOT NULL,
    display_name TEXT,
    role TEXT NOT NULL CHECK (role IN ('client', 'office', 'owner', 'admin')),
    photo_url TEXT,
    phone_number TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 2. Chalets Table
CREATE TABLE IF NOT EXISTS chalets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    location TEXT NOT NULL,
    price DECIMAL NOT NULL CHECK (price > 0),
    rooms INTEGER NOT NULL CHECK (rooms > 0),
    bathrooms INTEGER DEFAULT 1,
    images TEXT[] NOT NULL, -- Array of image URLs
    office_id UUID REFERENCES users(id) ON DELETE CASCADE,
    description TEXT,
    amenities TEXT[] DEFAULT '{}',
    status TEXT NOT NULL CHECK (status IN ('available', 'booked')) DEFAULT 'available',
    lat DECIMAL,
    lng DECIMAL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 3. Requests Table
CREATE TABLE IF NOT EXISTS requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    location TEXT NOT NULL,
    check_in DATE NOT NULL,
    check_out DATE NOT NULL,
    budget DECIMAL NOT NULL CHECK (budget > 0),
    guests INTEGER DEFAULT 1,
    status TEXT NOT NULL CHECK (status IN ('active', 'closed')) DEFAULT 'active',
    urgent BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 4. Negotiations Table
CREATE TABLE IF NOT EXISTS negotiations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id UUID REFERENCES requests(id) ON DELETE CASCADE,
    chalet_id UUID REFERENCES chalets(id) ON DELETE CASCADE,
    office_id UUID REFERENCES users(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    status TEXT NOT NULL CHECK (status IN ('pending', 'accepted', 'rejected', 'counter', 'agreed')) DEFAULT 'pending',
    current_offer DECIMAL NOT NULL CHECK (current_offer > 0),
    messages JSONB DEFAULT '[]', -- Array of message objects: {senderId, text, timestamp}
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 5. Subscribers Table
CREATE TABLE IF NOT EXISTS subscribers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone_number TEXT UNIQUE NOT NULL,
    subscribed_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    active BOOLEAN DEFAULT TRUE
);

-- Enable Row Level Security (RLS)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE chalets ENABLE ROW LEVEL SECURITY;
ALTER TABLE requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE negotiations ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscribers ENABLE ROW LEVEL SECURITY;

-- Basic RLS Policies (Examples)

-- Users: Only owner can read/update their own profile
CREATE POLICY "Users can view own profile" ON users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON users FOR UPDATE USING (auth.uid() = id);

-- Chalets: Everyone can read, only offices can manage their own
CREATE POLICY "Anyone can view chalets" ON chalets FOR SELECT USING (true);
CREATE POLICY "Offices can manage own chalets" ON chalets FOR ALL USING (auth.uid() = office_id);

-- Requests: Everyone can read, only owners can manage
CREATE POLICY "Anyone can view requests" ON requests FOR SELECT USING (true);
CREATE POLICY "Users can manage own requests" ON requests FOR ALL USING (auth.uid() = user_id);

-- Negotiations: Only involved parties can view/manage
CREATE POLICY "Parties can view negotiations" ON negotiations FOR SELECT 
USING (auth.uid() = user_id OR auth.uid() = office_id);

CREATE POLICY "Parties can update negotiations" ON negotiations FOR UPDATE 
USING (auth.uid() = user_id OR auth.uid() = office_id);
