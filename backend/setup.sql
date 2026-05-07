CREATE DATABASE IF NOT EXISTS incognitrix_lab;
USE incognitrix_lab;

CREATE TABLE IF NOT EXISTS projects (
    id VARCHAR(50) PRIMARY KEY,
    title VARCHAR(255),
    status VARCHAR(50),
    priority VARCHAR(50),
    description TEXT,
    shortDesc TEXT,
    image TEXT,
    stack JSON,
    timeline JSON,
    beneficiaries VARCHAR(255),
    team VARCHAR(255),
    usage_desc TEXT,
    operatives JSON
);

-- Note: The JSON fields (stack, timeline, operatives) store structured arrays/objects.
-- This ensures smooth transmission to/from the React frontend via the node-mysql2 express backend.