#!/usr/bin/env python3
"""
Check what indexes and constraints exist on the entities table.
"""
from app.database import engine
from sqlalchemy import text

query = """
SELECT
    i.relname as index_name,
    a.attname as column_name,
    ix.indisunique as is_unique,
    ix.indisprimary as is_primary
FROM
    pg_class t,
    pg_class i,
    pg_index ix,
    pg_attribute a
WHERE
    t.oid = ix.indrelid
    AND i.oid = ix.indexrelid
    AND a.attrelid = t.oid
    AND a.attnum = ANY(ix.indkey)
    AND t.relkind = 'r'
    AND t.relname = 'entities'
ORDER BY
    i.relname;
"""

print("=== Indexes on 'entities' table ===\n")
with engine.connect() as conn:
    result = conn.execute(text(query))
    for row in result:
        print(f"Index: {row[0]}")
        print(f"  Column: {row[1]}")
        print(f"  Unique: {row[2]}")
        print(f"  Primary: {row[3]}")
        print()

# Check constraints
constraint_query = """
SELECT
    con.conname as constraint_name,
    con.contype as constraint_type,
    pg_get_constraintdef(con.oid) as definition
FROM
    pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
WHERE
    rel.relname = 'entities'
ORDER BY
    con.conname;
"""

print("\n=== Constraints on 'entities' table ===\n")
with engine.connect() as conn:
    result = conn.execute(text(constraint_query))
    for row in result:
        constraint_type_map = {
            'p': 'PRIMARY KEY',
            'u': 'UNIQUE',
            'f': 'FOREIGN KEY',
            'c': 'CHECK'
        }
        print(f"Constraint: {row[0]}")
        print(f"  Type: {constraint_type_map.get(row[1], row[1])}")
        print(f"  Definition: {row[2]}")
        print()
