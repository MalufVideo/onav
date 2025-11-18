# LED Wall Database Migration Guide

## Overview

This directory contains SQL scripts for optimizing the calculator's data storage by creating a new `proposals` table and migrating data from the old `quotes` table.

## Files Description

1. **proposals_table.sql**
   - Creates the new optimized `proposals` table with all necessary columns
   - Includes improved data types and field organization
   - Sets up proper indexes and constraints

2. **migrate_quotes_to_proposals.sql**
   - Migrates data from the old `quotes` table to the new `proposals` table
   - Performs data type conversions and calculations for new fields
   - Adds technical data like pixel dimensions, power consumption, and weight

3. **query_proposals.sql**
   - Contains example queries for retrieving data from the `proposals` table
   - Includes filters for different data views and reports

## Migration Process

### Step 1: Create the New Table

Run the `proposals_table.sql` script to create the new table structure:

```bash
psql -h your-supabase-host -U postgres -d postgres -f proposals_table.sql
```

### Step 2: Migrate Existing Data

Run the migration script to copy and transform data from the old table:

```bash
psql -h your-supabase-host -U postgres -d postgres -f migrate_quotes_to_proposals.sql
```

### Step 3: Verify the Migration

Use the query examples to verify that data has been successfully migrated:

```bash
psql -h your-supabase-host -U postgres -d postgres -f query_proposals.sql
```

## Table Structure Improvements

The new `proposals` table includes several optimizations:

1. **Better Data Types**: Using the appropriate data types for each field (NUMERIC for dimensions, INTEGER for module counts, etc.)

2. **Calculated Fields**: Pre-calculated fields for technical details like pixel dimensions, power requirements, and weight

3. **Pricing Model**: Structured fields for the pricing model including daily rates, discounts, and total prices

4. **Organizational Structure**: Fields grouped by category for easier understanding and maintenance

## Code Integration

The JavaScript code in the application has been updated to use the new table structure:

- `quote-service.js`: Updated to save data to the new `proposals` table
- `my-quotes.js`: Modified to retrieve and display data from the new structure

## Rollback Plan

If needed, the old `quotes` table has been preserved, allowing for a rollback to the previous implementation.
