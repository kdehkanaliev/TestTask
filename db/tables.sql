-- ============ Users ============
CREATE TABLE IF NOT EXISTS users (
    id          SERIAL PRIMARY KEY,
    tg_id       BIGINT UNIQUE,
    username    VARCHAR(255) UNIQUE,
    email       VARCHAR(255) UNIQUE,
    password    VARCHAR(255),
    role        VARCHAR(20) NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
    currency    VARCHAR(10) DEFAULT 'UZS',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at  TIMESTAMPTZ
);

-- ============ Categories ============
CREATE TABLE IF NOT EXISTS categories (
    id          SERIAL PRIMARY KEY,
    user_id     INTEGER REFERENCES users(id) ON DELETE CASCADE,
    title       VARCHAR(255) NOT NULL,
    type        VARCHAR(20) NOT NULL CHECK (type IN ('income', 'expense')),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============ Transactions ============
CREATE TABLE IF NOT EXISTS transactions (
    id          SERIAL PRIMARY KEY,
    user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
    amount      NUMERIC(15, 2) NOT NULL,
    type        VARCHAR(20) NOT NULL CHECK (type IN ('income', 'expense')),
    comment     TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at  TIMESTAMPTZ
);

-- ============ Budgets ============
CREATE TABLE IF NOT EXISTS budgets (
    id           SERIAL PRIMARY KEY,
    user_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    category_id  INTEGER REFERENCES categories(id) ON DELETE CASCADE,
    limit_amount NUMERIC(15, 2) NOT NULL,
    month        INTEGER NOT NULL,
    year         INTEGER NOT NULL,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, category_id, month, year)
);

-- ============ AI advices (cache) ============
CREATE TABLE IF NOT EXISTS ai_advices (
    id          SERIAL PRIMARY KEY,
    user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    month       INTEGER NOT NULL,
    year        INTEGER NOT NULL,
    advice      TEXT NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, month, year)
);

-- ============ Refresh tokens ============
CREATE TABLE IF NOT EXISTS refresh_tokens (
    id         SERIAL PRIMARY KEY,
    user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token      TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============ Indexes ============
CREATE INDEX IF NOT EXISTS idx_transactions_user_date ON transactions(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_categories_user ON categories(user_id);
CREATE INDEX IF NOT EXISTS idx_budgets_user ON budgets(user_id, year, month);
